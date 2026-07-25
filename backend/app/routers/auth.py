from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import User
from ..schemas import ChangePasswordRequest, ChangeRecoveryKeyRequest, LoginRequest, RecoverPasswordRequest, RegisterRequest, UserPublic
from ..security import create_token, hash_secret, verify_secret
from ..services.seed import create_default_categories

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    email = payload.email.strip().lower()
    exists = db.scalar(select(User.id).where(or_(User.username == username, User.email == email)).limit(1))
    if exists:
        raise HTTPException(status_code=409, detail="Nome de usuário ou e-mail já cadastrado")
    user = User(
        username=username,
        display_name=payload.display_name.strip(),
        email=email,
        password_hash=hash_secret(payload.password),
        recovery_key_hash=hash_secret(payload.recovery_key),
        role="user",
        is_active=True,
    )
    db.add(user)
    try:
        db.flush()
        create_default_categories(db, user.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Nome de usuário ou e-mail já cadastrado")
    db.refresh(user)
    return {"token": create_token(user.id, user.role), "user": UserPublic.model_validate(user)}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    user = db.scalar(select(User).where(or_(User.username == identifier, User.email == identifier.lower())))
    if not user or not user.is_active or not verify_secret(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário, e-mail ou senha inválidos")
    return {"token": create_token(user.id, user.role), "user": UserPublic.model_validate(user)}


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_secret(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    user.password_hash = hash_secret(payload.new_password)
    user.must_change_password = False
    db.commit()
    return {"message": "Senha alterada com sucesso", "token": create_token(user.id, user.role)}


@router.post("/recover")
def recover_password(payload: RecoverPasswordRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    user = db.scalar(select(User).where(or_(User.username == identifier, User.email == identifier.lower())))
    if not user or not verify_secret(payload.recovery_key, user.recovery_key_hash):
        raise HTTPException(status_code=400, detail="Dados de recuperação inválidos")
    user.password_hash = hash_secret(payload.new_password)
    user.must_change_password = False
    db.commit()
    return {"message": "Senha redefinida com sucesso"}


@router.post("/change-recovery-key")
def change_recovery_key(payload: ChangeRecoveryKeyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_secret(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    user.recovery_key_hash = hash_secret(payload.new_recovery_key)
    db.commit()
    return {"message": "Chave de recuperação atualizada"}
