from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_admin
from ..models import User
from ..schemas import AdminUserUpdate, UserPublic
from ..security import hash_secret

router = APIRouter(prefix="/api/admin", tags=["Administração"])


@router.get("/users", response_model=list[UserPublic])
def list_users(_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.display_name)).all()


@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user(user_id: int, payload: AdminUserUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    data = payload.model_dump(exclude_unset=True)
    if "username" in data and data["username"]:
        conflict = db.scalar(select(User.id).where(User.id != user_id, User.username == data["username"]).limit(1))
        if conflict:
            raise HTTPException(status_code=409, detail="Nome de usuário já utilizado")
        user.username = data["username"].strip()
    if "email" in data and data["email"]:
        email = str(data["email"]).lower()
        conflict = db.scalar(select(User.id).where(User.id != user_id, User.email == email).limit(1))
        if conflict:
            raise HTTPException(status_code=409, detail="E-mail já utilizado")
        user.email = email
    if "display_name" in data and data["display_name"]:
        user.display_name = data["display_name"].strip()
    if "role" in data and data["role"] in {"admin", "user"}:
        if user.id == admin.id and data["role"] != "admin":
            raise HTTPException(status_code=400, detail="Você não pode remover sua própria permissão administrativa")
        if user.role == "admin" and data["role"] != "admin":
            count = db.scalar(select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))) or 0
            if count <= 1:
                raise HTTPException(status_code=400, detail="O sistema precisa manter ao menos um administrador ativo")
        user.role = data["role"]
    if "is_active" in data:
        if user.id == admin.id and not data["is_active"]:
            raise HTTPException(status_code=400, detail="Você não pode desativar sua própria conta")
        user.is_active = bool(data["is_active"])
    if data.get("password"):
        user.password_hash = hash_secret(data["password"])
        user.must_change_password = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir sua própria conta")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.role == "admin":
        count = db.scalar(select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))) or 0
        if count <= 1:
            raise HTTPException(status_code=400, detail="O sistema precisa manter ao menos um administrador ativo")
    db.delete(user)
    db.commit()
    return {"message": "Usuário e dados relacionados excluídos"}
