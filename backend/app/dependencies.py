from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from .database import SessionLocal, get_db
from .models import User
from .security import decode_token


def _token_payload(authorization: str | None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão não informada")
    payload = decode_token(authorization.split(" ", 1)[1].strip())
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada")
    return payload


def get_current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    payload = _token_payload(authorization)
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao administrador")
    return user


def require_admin_without_open_session(authorization: str | None = Header(default=None)) -> None:
    """Valida o administrador e fecha a conexão antes de trocar/restaurar o SQLite.

    No Windows, manter a sessão usada na autenticação aberta durante a restauração
    pode bloquear o arquivo smart_finance.db e fazer a importação falhar.
    """
    payload = _token_payload(authorization)
    with SessionLocal() as db:
        user = db.get(User, int(payload["sub"]))
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")
        if user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao administrador")


def resolve_owner_id(
    owner_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
) -> int:
    if owner_id is not None and current_user.role == "admin":
        return owner_id
    return current_user.id
