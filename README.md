# DocuMind AI — Your Multilingual AI Teacher

Upload anything you're studying. Ask anything. Understand it. Learn it.

DocuMind AI is a full-stack AI learning platform. Students upload PDFs (including scanned and multilingual ones), attach diagrams or photos, and ask questions in any language — English, Tamil, Hindi, Tanglish, and more. The AI responds like a teacher, not a chatbot: definitions, explanations, examples, and structured exam-style answers. It also generates summaries, study notes, exam questions, and interactive practice quizzes from each document.

---

## 1. Architecture

```
Frontend (React + Vite + TypeScript + Tailwind)
    │
    ▼
FastAPI REST API
    │
    ▼
JWT Authentication + Ownership Validation
    │
    ▼
Application Services
    │
    ├── Document Processing (PyMuPDF)
    │       └── OCR fallback (Tesseract) for scanned pages
    │              └── Page-aware chunking
    │                     └── Multilingual embeddings (E5)
    │                            └── FAISS vector index (per document)
    │
    ├── RAG Retrieval ──────────────┐
    ├── Vision Model (images) ──────┤
    │                               ▼
    │                     Teacher-style prompt
    │                               │
    │                               ▼
    │                       LLM (Groq, configurable)
    │                               │
    ▼                               ▼
PostgreSQL (users, documents, chunks, conversations, messages, generated content)
    │
    ▼
Frontend
```

### Key design decisions

- **Per-document FAISS index.** Each document owns its own index file, so retrieval is naturally scoped to the selected document and one user's data can never leak into another's results.
- **Embedding dimension is never hardcoded.** It's read from the active model (`model.get_sentence_embedding_dimension()`). If an on-disk index's dimension doesn't match the current model, the mismatch is detected and the index is safely rebuilt from stored chunks — never searched, and never backfilled with random vectors.
- **OCR is conditional, not blanket.** Native PyMuPDF extraction runs first; OCR only fires when a page yields almost no text (a strong signal it's a scanned image). This keeps normal PDFs fast and handles mixed documents correctly.
- **LLM failures are never disguised as "not found."** A 429, 503, or timeout from the provider surfaces as its own specific, honest error — not a misleading "I couldn't find this in your documents."

---

## 2. Folder structure

```
documind-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, global error handlers
│   │   ├── config.py            # Env-driven settings (no hardcoded secrets)
│   │   ├── database.py          # SQLAlchemy engine/session
│   │   ├── models/              # User, Document, DocumentChunk, Conversation, Message, generated content
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── routes/              # auth, documents, chat, content, settings, health
│   │   ├── auth/                # password hashing, JWT, current-user dependency
│   │   ├── documents/           # pdf_processor, chunker, ingestion, context
│   │   ├── embeddings/          # multilingual embedding service (singleton)
│   │   ├── vector_store/        # FAISS build/load/search + mismatch rebuild
│   │   ├── rag/                 # retriever
│   │   ├── chat/                # teacher prompt + chat orchestration
│   │   ├── llm/                 # Groq client + structured JSON helper
│   │   ├── vision/              # vision model client
│   │   ├── summaries/ notes/ questions/ quiz/
│   │   └── utils/               # language detection
│   ├── tests/                   # 36 pytest tests
│   ├── requirements.txt
│   ├── docker-compose.yml       # local Postgres
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/               # Landing, Auth, Home, Documents, AskAI, Summary, StudyNotes, QuestionGenerator, PracticeQuiz, Settings
        ├── components/          # ProtectedRoute, DocumentSelector, StatusBadge, EmptyState, ErrorState
        ├── layouts/             # AppLayout (responsive sidebar + mobile drawer)
        ├── contexts/            # AuthContext
        ├── services/            # centralized API client + per-domain services
        └── types/
```

---

## 3. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, React Router, Axios, lucide-react |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| Database | PostgreSQL 16 (SQLAlchemy ORM) |
| Auth | JWT (python-jose) + bcrypt password hashing |
| PDF | PyMuPDF |
| OCR | Tesseract via pytesseract |
| Embeddings | `intfloat/multilingual-e5-large` (sentence-transformers) |
| Vector search | FAISS (`IndexFlatIP`, normalized vectors = cosine similarity) |
| LLM | Groq (configurable model/provider via env) |
| Vision | Groq vision model (configurable) |

---

## 4. Database schema

| Table | Key columns |
|---|---|
| `users` | id, name, email (unique), hashed_password, preferred_language, theme, response_style |
| `documents` | id, user_id → users, filename, stored_path, page_count, status, failure_reason, detected_language, embedding_model, embedding_dim, faiss_index_path, last_activity_at |
| `document_chunks` | id, document_id → documents, page_number, chunk_index, **faiss_row**, content, language |
| `conversations` | id, user_id → users, document_id → documents, title |
| `messages` | id, conversation_id → conversations, role, content, sources (JSON), language, has_image |
| `generated_summaries` | document_id, user_id, overview, main_topics, key_concepts, key_takeaways |
| `generated_notes` | document_id, user_id, topics (JSON) |
| `generated_question_sets` | document_id, user_id, config, questions (JSON) |
| `quizzes` | document_id, user_id, questions, answers, score, total, completed |

`faiss_row` is what maps a FAISS search result back to its chunk text and page number — this is how compact `p.12 p.13` citations stay accurate.

Every query that touches user data filters on `user_id`, and document access checks ownership before returning anything (403 otherwise).

---

## 5. API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API, DB, embedding model, vector store, LLM config status |
| POST | `/api/auth/register` | Create account → JWT |
| POST | `/api/auth/login` | Sign in → JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/documents` | Upload PDF (kicks off background processing) |
| GET | `/api/documents` | List own documents |
| GET | `/api/documents/{id}` | Get one document (ownership-checked) |
| DELETE | `/api/documents/{id}` | Delete document + files + index |
| POST | `/api/documents/{id}/touch` | Update last activity |
| POST | `/api/chat` | Send message (multipart; optional image) |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/{id}/messages` | Full message history |
| POST | `/api/summary/{document_id}` | Generate summary |
| POST | `/api/notes/{document_id}` | Generate study notes |
| POST | `/api/questions` | Generate question set |
| POST | `/api/quiz/start` | Start a practice quiz |
| POST | `/api/quiz/submit` | Submit answers → score + review |
| GET/PATCH | `/api/settings` | Read/update preferences |

**Chat success contract** (`sources` is always an array, never `null`):
```json
{ "answer": "...", "sources": [{"page": 12}], "conversation_id": "...", "message_id": "..." }
```

**Error contract** (every error, including unhandled ones):
```json
{ "detail": "Human-readable message.", "error_code": "LLM_RATE_LIMITED" }
```

---

## 6. Multilingual architecture

**Language resolution priority** (implemented in `app/utils/language.py`):
1. Explicit request in the message ("explain in Tamil")
2. Current message language — Unicode script detection for Tamil/Devanagari/Arabic, plus romanized-Tamil (Tanglish) marker words like `pannu`, `epdi`, `enna`, `irukku`
3. Recent conversation language (so short follow-ups like "Give an example" stay in the current language)
4. Document language as fallback

**Cross-lingual retrieval** works because the E5 multilingual embedding model maps semantically equivalent text from different languages into the same vector space. A Tanglish question like *"Intelligent agent environment ah epdi perceive pannum?"* retrieves the relevant English passages, and the teacher prompt then instructs the model to answer in Tamil/Tanglish.

---

## 7. Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16 (or Docker)
- Tesseract OCR

Install Tesseract with the language packs you need:

```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr tesseract-ocr-tam tesseract-ocr-hin tesseract-ocr-ara

# macOS
brew install tesseract tesseract-lang
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set GROQ_API_KEY, JWT_SECRET_KEY, DATABASE_URL

docker compose up -d            # starts Postgres (or use your own)
uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on first startup. The embedding model (~2GB) downloads on first use.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173

### Run commands

| Task | Command |
|---|---|
| Backend (dev) | `uvicorn app.main:app --reload --port 8000` |
| Backend (prod) | `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4` |
| Frontend (dev) | `npm run dev` |
| Frontend (build) | `npm run build` |
| Backend tests | `cd backend && pytest tests/ -v` |
| Frontend typecheck | `cd frontend && npx tsc --noEmit` |

---

## 8. Environment variables

```
DATABASE_URL=postgresql+psycopg2://documind:documind@localhost:5432/documind
JWT_SECRET_KEY=              # long random string
CORS_ORIGINS=http://localhost:5173
GROQ_API_KEY=                # required for chat/summary/notes/questions/quiz
GROQ_MODEL=llama-3.3-70b-versatile
VISION_PROVIDER=groq
VISION_MODEL=llama-3.2-90b-vision-preview
VISION_API_KEY=              # falls back to GROQ_API_KEY
EMBEDDING_MODEL=intfloat/multilingual-e5-large
FAISS_INDEX_DIR=./storage/faiss
TESSERACT_CMD=/usr/bin/tesseract
UPLOAD_DIR=./storage/uploads
MAX_UPLOAD_MB=50
```

No secret is ever sent to the frontend. The browser only ever holds a JWT.

---

## 9. Testing

36 backend tests pass against real logic — real PDF generation and extraction, real chunking, real FAISS indexing and retrieval, real language detection, real JWT flows. Only the external LLM/vision network calls are mocked (they're third-party HTTP, not our logic), and the embedding model is swapped for a deterministic fake so tests run without a 2GB download.

```bash
cd backend && pytest tests/ -v
```

Coverage: auth (register, login, duplicate email, wrong password, protected routes, invalid token), documents (upload validation, size/type rejection, processing to READY, per-user isolation, cross-user 403, delete), chat (English/Tamil/Hindi/Tanglish detection, explicit language switch, follow-up context, sources always `[]` not null, rate-limit and provider-failure handling, image pipeline), content (summary, notes, MCQ generation, quiz start/submit/scoring/partial scores), and health.

---

## 10. Known limitations

1. **OCR quality depends on installed Tesseract language packs.** Without `tesseract-ocr-tam`, scanned Tamil pages will extract poorly. The code requests `eng+tam+hin+ara`; install the matching packs.
2. **The vision provider is Groq-only in this implementation.** `VISION_PROVIDER` is read from config and validated, but only the Groq branch is implemented — setting another value returns a clear configuration error rather than silently failing.
3. **Document processing runs as a FastAPI BackgroundTask,** which is in-process. For large documents or high concurrency, move ingestion to Celery or RQ with a Redis broker.
4. **Summary/notes/questions use a capped context window** (~12k chars of page-ordered chunks). Very long documents are covered from the beginning rather than exhaustively; a map-reduce summarization pass would improve this.
5. **Tanglish detection is heuristic,** based on common romanized-Tamil marker words. It handles typical student phrasing well but isn't a trained classifier, so unusual romanization may fall through to English detection. The explicit language selector in the composer is always available as an override.
6. **`init_db()` creates tables directly.** Alembic is in `requirements.txt` and the models are migration-ready, but no migration history is checked in yet — generate the initial revision before your first production deploy.
7. **Light theme is stored and toggled** on the `<html>` element, but the Tailwind palette is tuned dark-first; light mode will need a dedicated color pass to look as polished.
