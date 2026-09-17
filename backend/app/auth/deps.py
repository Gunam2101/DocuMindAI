from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.database import get_db
from app.models.user import User

http_bearer = HTTPBearer(auto_error=False)
# Backwards-compatibility alias
oauth2_scheme = http_bearer


def get_current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise unauthorized

    token = auth.credentials.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    user_id = decode_access_token(token)
    if not user_id:
        raise unauthorized

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise unauthorized

    return user
