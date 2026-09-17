"""
Orchestrates a single chat turn with 4 simultaneous contexts:
1. Current document & RAG
2. Current PDF page
3. Current Learning Path topic / step
4. Selected text context (highest priority)
Plus short-term conversation memory, image understanding, and adaptive teaching.
"""
import re
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.chat.teacher_prompt import build_system_prompt
from app.llm.groq_client import chat_completion
from app.models.chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.models.user import User
from app.rag.retriever import retrieve, unique_pages
from app.utils.language import resolve_response_language
from app.vision.vision_client import analyze_image

MAX_HISTORY_MESSAGES = 8


def _get_or_create_conversation(
    db: Session, user: User, conversation_id: str | None, document_id: str | None
) -> Conversation:
    if conversation_id:
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        if convo.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this conversation.")
        return convo

    convo = Conversation(user_id=user.id, document_id=document_id, title="New Conversation")
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


def _recent_language(db: Session, conversation: Conversation) -> str | None:
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    return last_msg.language if last_msg else None


def _history_as_llm_messages(db: Session, conversation: Conversation) -> list[dict]:
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
        .all()
    )
    msgs.reverse()
    return [{"role": m.role, "content": m.content} for m in msgs]


def handle_chat_turn(
    db: Session,
    user: User,
    conversation_id: str | None,
    document_id: str | None,
    message: str,
    requested_language: str = "auto",
    image_path: str | None = None,
    current_page: int | None = None,
    selected_text: str | None = None,
    learning_path_step_id: str | None = None,
    learning_path_topic: str | None = None,
    teaching_level: str = "beginner",
    answer_mode: str = "auto",
) -> tuple[str, list[int], str, str]:
    """
    Returns (answer, source_pages, conversation_id, message_id).
    """
    document = None
    if document_id:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        if doc.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this document.")
        document = doc

    conversation = _get_or_create_conversation(db, user, conversation_id, document.id if document else None)

    recent_lang = _recent_language(db, conversation)
    response_language = resolve_response_language(
        message=message,
        conversation_recent_language=recent_lang,
        document_language=document.detected_language if document else None,
        requested_language=requested_language,
    )

    # --- Hierarchical Retrieval & Grounding ---
    retrieved_pages: list[int] = []
    context_blocks: list[str] = []

    if document and document.status == "READY":
        # 1. Highest Priority: Selected Text
        if selected_text and selected_text.strip():
            page_hint = f" (from Page {current_page})" if current_page else ""
            context_blocks.append(
                f"[HIGH PRIORITY — Highlighted Document Text{page_hint}]:\n{selected_text.strip()}"
            )
            if current_page and current_page not in retrieved_pages:
                retrieved_pages.append(current_page)

        # 2. Second Priority: Current Page Content
        # Check if user specifically asks about the page ("this page", "page X", "explain this")
        # or if current_page is active and no selected_text
        is_page_focused_query = bool(
            current_page
            and (
                re.search(r"\b(this page|page|current page|indha page|indha pagela)\b", message, re.IGNORECASE)
                or not selected_text
            )
        )

        if current_page:
            page_chunks = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.document_id == document.id, DocumentChunk.page_number == current_page)
                .all()
            )
            if page_chunks:
                page_text = "\n".join(c.content for c in page_chunks)
                context_blocks.append(f"[Current Page {current_page} Content]:\n{page_text}")
                if current_page not in retrieved_pages:
                    retrieved_pages.append(current_page)

        # 3. Third Priority: Learning Path Topic Context
        if learning_path_topic:
            topic_chunks = retrieve(db, document, learning_path_topic, top_k=3, user_id=user.id)
            if topic_chunks:
                for c in topic_chunks:
                    if c.page_number not in retrieved_pages:
                        retrieved_pages.append(c.page_number)
                context_blocks.append(
                    f"[Active Learning Path Topic '{learning_path_topic}' Key Chunks]:\n"
                    + "\n\n".join(f"[Page {c.page_number}] {c.text}" for c in topic_chunks)
                )

        # 4. Standard RAG Vector Retrieval for student question
        rag_query = message
        if learning_path_topic:
            rag_query = f"{learning_path_topic} {message}"
        chunks = retrieve(db, document, rag_query, top_k=5, user_id=user.id)
        for c in chunks:
            if c.page_number not in retrieved_pages:
                retrieved_pages.append(c.page_number)
        if chunks:
            context_blocks.append(
                "[Relevant Document Passages]:\n"
                + "\n\n".join(f"[Page {c.page_number}] {c.text}" for c in chunks)
            )

    # Sort retrieved pages for neat citation [p. 1, 2, 3]
    retrieved_pages.sort()

    # --- Vision & Diagram Understanding ---
    image_analysis = ""
    if image_path:
        vision_instruction = (
            "Analyze this image thoroughly: identify if it is a diagram, flowchart, graph, "
            "table, formula, or textbook page. Break down its key components, flow, and concepts "
            "so a teacher can explain its meaning directly to a student."
        )
        image_analysis = analyze_image(image_path, vision_instruction)

    # --- System Prompt ---
    has_doc_ctx = len(context_blocks) > 0
    system_prompt = build_system_prompt(
        response_language=response_language,
        response_style=user.response_style,
        teaching_level=teaching_level,
        answer_mode=answer_mode,
        current_page=current_page,
        has_selected_text=bool(selected_text and selected_text.strip()),
        learning_path_topic=learning_path_topic,
        has_document_context=has_doc_ctx,
        has_image_context=bool(image_analysis),
    )

    # --- Composed Turn Prompt ---
    user_parts = []
    if context_blocks:
        user_parts.append(
            "[DOCUMENT CONTEXT — UNTRUSTED CONTENT START]\n"
            + "\n\n".join(context_blocks)
            + "\n[DOCUMENT CONTEXT — UNTRUSTED CONTENT END]"
        )
    if image_analysis:
        user_parts.append(
            "[ATTACHED IMAGE ANALYSIS — UNTRUSTED CONTENT START]\n"
            f"[Attached Image Visual Analysis]:\n{image_analysis}\n"
            "[ATTACHED IMAGE ANALYSIS — UNTRUSTED CONTENT END]"
        )

    # Teaching metadata header
    meta_tags = []
    if current_page:
        meta_tags.append(f"Viewing Page: {current_page}")
    if learning_path_topic:
        meta_tags.append(f"Learning Topic: {learning_path_topic}")
    if teaching_level:
        meta_tags.append(f"Level: {teaching_level.title()}")
    if answer_mode and answer_mode != "auto":
        meta_tags.append(f"Mode: {answer_mode}")
    if meta_tags:
        user_parts.append(f"[{' | '.join(meta_tags)}]")

    user_parts.append(f"Student Question / Prompt:\n{message}")
    composed_turn = "\n\n".join(user_parts)

    history = _history_as_llm_messages(db, conversation)
    llm_messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": composed_turn},
    ]

    max_tokens = 900
    if answer_mode == "quick":
        max_tokens = 250
    elif answer_mode in ["2_marks", "2 marks", "2marks"]:
        max_tokens = 350
    elif answer_mode in ["5_marks", "5 marks", "5marks"]:
        max_tokens = 600

    answer = chat_completion(llm_messages, max_tokens=max_tokens)


    # Persist message history
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=message,
        sources=[],
        language=response_language,
        has_image=image_path,
    )
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
        sources=[{"page": p} for p in retrieved_pages],
        language=response_language,
    )
    db.add(user_msg)
    db.add(assistant_msg)

    if conversation.title == "New Conversation":
        if learning_path_topic:
            conversation.title = f"Learning: {learning_path_topic[:40]}"
        elif selected_text:
            conversation.title = f"Explanation: {selected_text[:40]}"
        else:
            conversation.title = message[:60]

    db.commit()
    db.refresh(assistant_msg)

    return answer, retrieved_pages, conversation.id, assistant_msg.id
