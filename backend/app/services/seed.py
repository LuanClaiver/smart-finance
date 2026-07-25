from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Category, User
from ..security import hash_secret

EXPENSE_CATEGORIES = [
    "Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Bebê",
    "Assinaturas", "Cartões", "Empréstimos", "Contas domésticas", "Compras",
    "Impostos e taxas", "Cuidados pessoais", "Presentes", "Outros",
]
INCOME_CATEGORIES = ["Salário", "Renda extra", "Benefício", "Reembolso", "Venda", "Outros recebimentos"]


def create_default_categories(db: Session, user_id: int) -> None:
    existing = db.scalar(select(Category.id).where(Category.owner_id == user_id).limit(1))
    if existing:
        return
    db.add_all([Category(owner_id=user_id, name=name, kind="expense") for name in EXPENSE_CATEGORIES])
    db.add_all([Category(owner_id=user_id, name=name, kind="income") for name in INCOME_CATEGORIES])


def seed_admin(db: Session) -> User:
    admin = db.scalar(select(User).where(User.username == "Admin"))
    if admin:
        create_default_categories(db, admin.id)
        db.commit()
        return admin
    admin = User(
        username="Admin",
        display_name="Administrador",
        email="admin@smartfinance.com",
        password_hash=hash_secret("1234"),
        role="admin",
        is_active=True,
        must_change_password=True,
    )
    db.add(admin)
    db.flush()
    create_default_categories(db, admin.id)
    db.commit()
    db.refresh(admin)
    return admin
