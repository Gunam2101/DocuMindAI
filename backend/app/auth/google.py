import logging
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

logger = logging.getLogger("documind")


class GoogleAuthError(Exception):
    def __init__(self, detail: str, error_code: str = "GOOGLE_AUTH_FAILED", status_code: int = 401):
        self.detail = detail
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(detail)


def verify_google_credential(credential: str, expected_client_id: str) -> dict:
    """
    Verifies a Google ID Token / GIS credential using Google's official verification library.
    Strictly validates:
      - Cryptographic signature against Google's live rotated public certificates
      - Issuer (accounts.google.com or https://accounts.google.com)
      - Audience (matches expected_client_id)
      - Expiration time
    Returns verified payload claims dict containing 'sub', 'email', 'name', etc.
    Never trusts client-supplied user fields.
    """
    if not credential or not credential.strip():
        raise GoogleAuthError(
            detail="Google credential token is missing.",
            error_code="GOOGLE_CREDENTIAL_MISSING",
            status_code=400,
        )

    if not expected_client_id or not expected_client_id.strip():
        logger.error("[GOOGLE_AUTH] Server GOOGLE_CLIENT_ID is not configured")
        raise GoogleAuthError(
            detail="Google Sign-In is not configured on the server.",
            error_code="GOOGLE_NOT_CONFIGURED",
            status_code=503,
        )

    try:
        request = google_requests.Request()
        payload = google_id_token.verify_oauth2_token(
            credential.strip(),
            request,
            audience=expected_client_id.strip(),
        )

        issuer = payload.get("iss", "")
        if issuer not in ("accounts.google.com", "https://accounts.google.com"):
            logger.warning("[GOOGLE_AUTH] Invalid token issuer: %s", issuer)
            raise GoogleAuthError(
                detail="Google sign-in could not be verified.",
                error_code="GOOGLE_ISSUER_INVALID",
                status_code=401,
            )

        google_sub = payload.get("sub")
        email = payload.get("email")

        if not google_sub:
            raise GoogleAuthError(
                detail="Google sign-in could not be verified: missing subject identifier.",
                error_code="GOOGLE_SUB_MISSING",
                status_code=401,
            )

        if not email:
            raise GoogleAuthError(
                detail="Google sign-in could not be verified: email address not shared.",
                error_code="GOOGLE_EMAIL_MISSING",
                status_code=401,
            )

        logger.info("[GOOGLE_AUTH] Token verified successfully for email=%s sub=%s...", email, google_sub[:8])
        return payload

    except ValueError as exc:
        err_str = str(exc).lower()
        logger.warning("[GOOGLE_AUTH] Token verification failed: %s", exc)
        if "expired" in err_str:
            raise GoogleAuthError(
                detail="Google sign-in session expired. Please try again.",
                error_code="GOOGLE_TOKEN_EXPIRED",
                status_code=401,
            ) from exc
        elif "wrong recipient" in err_str or "audience" in err_str:
            raise GoogleAuthError(
                detail="Google sign-in could not be verified.",
                error_code="GOOGLE_AUDIENCE_MISMATCH",
                status_code=401,
            ) from exc
        else:
            raise GoogleAuthError(
                detail="Google sign-in could not be verified.",
                error_code="GOOGLE_TOKEN_INVALID",
                status_code=401,
            ) from exc
    except GoogleAuthError:
        raise
    except Exception as exc:
        logger.exception("[GOOGLE_AUTH] Unexpected error verifying Google token: %s", exc)
        raise GoogleAuthError(
            detail="Google sign-in could not be completed. Please try again.",
            error_code="GOOGLE_VERIFICATION_ERROR",
            status_code=500,
        ) from exc
