from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.auth.google import GoogleAuthError, verify_google_credential
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise invalid

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user via verified Google Identity Services (GIS) ID token.
    - Case A: User already linked via google_sub -> issue DocuMind JWT
    - Case B: New user -> create DocuMind account with google_sub -> issue DocuMind JWT
    - Case C: Existing account with same email but unlinked -> 409 GOOGLE_ACCOUNT_LINK_REQUIRED
    """
    try:
        claims = verify_google_credential(payload.credential, settings.GOOGLE_CLIENT_ID)
    except GoogleAuthError as exc:
        err = HTTPException(status_code=exc.status_code, detail=exc.detail)
        setattr(err, "error_code", exc.error_code)
        raise err

    google_sub = claims["sub"]
    email = claims["email"].lower().strip()
    name = claims.get("name") or email.split("@")[0]

    # Case A: Existing user matching google_sub
    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user:
        token = create_access_token(subject=user.id)
        return TokenResponse(access_token=token, user=UserOut.model_validate(user))

    # Case C: Email matches existing account without google_sub link
    existing_by_email = db.query(User).filter(User.email == email).first()
    if existing_by_email:
        err = HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email already has a DocuMind account. Sign in with your existing account first, then link Google.",
        )
        setattr(err, "error_code", "GOOGLE_ACCOUNT_LINK_REQUIRED")
        raise err

    # Case B: New user creation
    new_user = User(
        name=name.strip() or "Google User",
        email=email,
        google_sub=google_sub,
        auth_provider="google",
        hashed_password=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(subject=new_user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(new_user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
