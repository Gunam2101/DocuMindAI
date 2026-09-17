from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserOut

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdateRequest(BaseModel):
    theme: Literal["dark", "light"] | None = None
    preferred_language: str | None = None
    response_style: Literal["concise", "detailed"] | None = None


@router.get("", response_model=UserOut)
def get_settings_(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.patch("", response_model=UserOut)
def update_settings(payload: SettingsUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.theme is not None:
        current_user.theme = payload.theme
    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language
    if payload.response_style is not None:
        current_user.response_style = payload.response_style

    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)
