import os
import hmac
import hashlib
import base64
import json
import time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from fastapi import Request, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

DEFAULT_DEV_USER_ID = "00000000-0000-0000-0000-000000000000"
DEFAULT_DEV_EMAIL = "admin@avenuewealth.local"
DEFAULT_DEV_ROLE = "admin"

VALID_ROLES = ["admin", "user", "advisor", "auditor", "guest"]

class User(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = "Usuario"
    role: str = "user"
    is_active: bool = True

DEFAULT_ADMIN_USER = User(
    id=DEFAULT_DEV_USER_ID,
    email=DEFAULT_DEV_EMAIL,
    full_name="Administrador Principal",
    role=DEFAULT_DEV_ROLE,
    is_active=True
)

security_bearer = HTTPBearer(auto_error=False)

def base64url_decode(input_str: str) -> bytes:
    """Decodes a base64url encoded string with padding restoration."""
    rem = len(input_str) % 4
    if rem > 0:
        input_str += '=' * (4 - rem)
    return base64.urlsafe_b64decode(input_str)

def decode_and_verify_jwt(token: str, secret: Optional[str] = None) -> Dict[str, Any]:
    """
    Decodes and optionally validates HS256 JWT tokens (standard for Supabase and custom auth)
    without requiring third-party C dependencies.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Formato de token JWT inválido.")

    header_b64, payload_b64, signature_b64 = parts

    try:
        header = json.loads(base64url_decode(header_b64).decode("utf-8"))
        payload = json.loads(base64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Error al decodificar la carga útil del token.")

    if header.get("alg") == "none":
        raise HTTPException(status_code=401, detail="Algoritmo 'none' no permitido.")

    # Validate expiration time if present
    if "exp" in payload:
        now = int(time.time())
        if now > payload["exp"]:
            raise HTTPException(status_code=401, detail="El token de sesión ha expirado.")

    # Validate signature if secret is provided or require_auth is active
    require_auth = os.environ.get("REQUIRE_AUTH", "0").lower() in ("1", "true", "yes")
    if secret:
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = base64url_decode(signature_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise HTTPException(status_code=401, detail="Firma criptográfica del token inválida.")
    elif require_auth:
        raise HTTPException(status_code=500, detail="Error de configuración: Se requiere SUPABASE_JWT_SECRET para validar firmas en producción.")

    return payload

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    request: Request = None
) -> User:
    """
    Dependency that extracts and validates the authenticated user.
    - If Bearer token is provided: validates token, extracts claims, syncs user with DB.
    - If guest_id is provided via X-Guest-ID or Bearer guest_*: returns isolated guest user.
    - If no token is provided:
        * If REQUIRE_AUTH=true: rejects with 401 Unauthorized.
        * If REQUIRE_AUTH=false: returns default admin user (for unit tests / local CLI).
    """
    from backend.database import get_user_by_id, upsert_user

    require_auth = os.environ.get("REQUIRE_AUTH", "0").lower() in ("1", "true", "yes")
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET") or os.environ.get("JWT_SECRET")

    token = None
    if credentials:
        token = credentials.credentials
    elif request and "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    # 1. Guest session identification
    guest_id = None
    if request and "x-guest-id" in request.headers:
        guest_id = request.headers["x-guest-id"].strip()
    elif token and token.startswith("guest_"):
        guest_id = token

    if guest_id:
        clean_guest_id = "".join(c for c in guest_id if c.isalnum() or c in ("-", "_"))
        if not clean_guest_id.startswith("guest_"):
            clean_guest_id = f"guest_{clean_guest_id}"
        clean_guest_id = clean_guest_id[:64]
        return User(
            id=clean_guest_id,
            email=f"{clean_guest_id}@guest.avenuewealth",
            full_name="Invitado",
            role="guest",
            is_active=True
        )

    if not token:
        if require_auth:
            raise HTTPException(
                status_code=401,
                detail="Se requiere cabecera 'Authorization: Bearer <token>' o 'X-Guest-ID' para acceder a este recurso.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        # Ensure default dev user exists in database
        try:
            upsert_user(DEFAULT_ADMIN_USER.id, DEFAULT_ADMIN_USER.email, DEFAULT_ADMIN_USER.full_name, DEFAULT_ADMIN_USER.role)
        except Exception:
            pass
        return DEFAULT_ADMIN_USER

    # Token provided: decode and extract user information
    try:
        payload = decode_and_verify_jwt(token, secret=jwt_secret)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {str(e)}")

    user_id = payload.get("sub") or payload.get("id") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="El token no contiene un identificador de usuario ('sub').")

    email = payload.get("email") or f"{user_id}@user.avenuewealth"
    
    # Whitelist check for private development
    raw_allowed = os.environ.get("ALLOWED_EMAILS", "diegotcach@gmail.com,carla.garcia.faya@gmail.com,hidesinoquizas@gmail.com,violetacrespo2002@gmail.com")
    allowed_list = [e.strip().lower() for e in raw_allowed.split(",") if e.strip()]
    clean_email = email.lower().strip()
    is_whitelisted = (
        clean_email in allowed_list
        or clean_email == DEFAULT_DEV_EMAIL.lower()
        or clean_email.endswith("@avenue.wealth")
        or "*" in allowed_list
    )
    if clean_email and not is_whitelisted:
        raise HTTPException(
            status_code=403,
            detail=f"Acceso restringido: Avenue Wealth está en fase beta privada. El correo '{clean_email}' no está en la lista de acceso autorizado."
        )
    
    # Extract role securely: Supabase app_metadata is server-managed and tamper-proof.
    # user_metadata is user-writable by clients on signup, so its 'role' field is strictly ignored for security.
    role = "user"
    app_meta = payload.get("app_metadata", {})
    user_meta = payload.get("user_metadata", {})
    if isinstance(app_meta, dict) and app_meta.get("role") in VALID_ROLES:
        role = app_meta["role"]
    elif payload.get("role") in VALID_ROLES and payload.get("role") != "admin":
        role = payload["role"]
    elif payload.get("role") == "admin" and (
        user_id == DEFAULT_DEV_USER_ID or
        (isinstance(app_meta, dict) and app_meta.get("role") == "admin") or
        clean_email.endswith("@avenuewealth.local") or
        clean_email.endswith("@avenue.wealth")
    ):
        role = "admin"

    full_name = "Usuario"
    if isinstance(user_meta, dict):
        full_name = user_meta.get("full_name") or user_meta.get("name") or user_meta.get("user_name") or "Usuario"

    # Sync user in local database cache
    try:
        existing = get_user_by_id(user_id)
        if not existing:
            upsert_user(user_id, email, full_name, role)
        else:
            # Preserve DB role if assigned by an admin locally
            role = existing.get("role", role)
            full_name = existing.get("full_name", full_name)
    except Exception as e:
        print(f"User sync notice: {e}")

    return User(
        id=user_id,
        email=email,
        full_name=full_name,
        role=role,
        is_active=True
    )

def require_roles(allowed_roles: List[str]):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Example:
        @app.get("/api/admin/users", dependencies=[Depends(require_roles(["admin"]))])
    """
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permisos insuficientes. Rol actual: '{current_user.role}'. Se requiere uno de: {allowed_roles}"
            )
        return current_user
    return role_dependency
