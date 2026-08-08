from __future__ import annotations

import calendar
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import STORAGE_DIR, get_db
from ..dependencies import get_current_user, resolve_owner_id
from ..models import Account, Card, Category, Expense, Income, Loan, LoanInstallment, RecurringExpense, User
from ..schemas import AccountInput, CardInput, CategoryInput, ExpenseInput, IncomeInput, LoanInput, LoanInstallmentInput, LoanUpdateInput, RecurringExpenseInput
from ..services.alerts import get_alerts
from ..services.finance import (
    add_months,
    card_billing_month,
    card_due_date,
    create_expense_installments,
    dashboard_summary,
    expense_reference_month_filter,
    generate_recurring_expenses,
    month_bounds,
)

router = APIRouter(prefix="/api", tags=["Financeiro"])


def _owned(db: Session, model, item_id: int, owner_id: int):
    item = db.scalar(select(model).where(model.id == item_id, model.owner_id == owner_id))
    if not item:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    return item


@router.get("/dashboard")
def dashboard(month: str, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return dashboard_summary(db, owner_id, month)


@router.get("/alerts")
def alerts(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return get_alerts(db, owner_id)


@router.get("/categories")
def list_categories(kind: str | None = None, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    query = select(Category).where(Category.owner_id == owner_id)
    if kind:
        query = query.where(Category.kind == kind)
    return db.scalars(query.order_by(Category.name)).all()


@router.post("/categories")
def create_category(payload: CategoryInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = Category(owner_id=owner_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/categories/{item_id}")
def update_category(item_id: int, payload: CategoryInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Category, item_id, owner_id)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.get("/accounts")
def list_accounts(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(select(Account).where(Account.owner_id == owner_id).order_by(Account.name)).all()


@router.post("/accounts")
def create_account(payload: AccountInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = Account(owner_id=owner_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/accounts/{item_id}")
def update_account(item_id: int, payload: AccountInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Account, item_id, owner_id)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/accounts/{item_id}")
def delete_account(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Account, item_id, owner_id)
    db.delete(item)
    db.commit()
    return {"message": "Conta excluída"}


@router.get("/cards")
def list_cards(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(select(Card).where(Card.owner_id == owner_id).order_by(Card.name)).all()


@router.post("/cards")
def create_card(payload: CardInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = Card(owner_id=owner_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/cards/{item_id}")
def update_card(item_id: int, payload: CardInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Card, item_id, owner_id)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/cards/{item_id}")
def delete_card(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Card, item_id, owner_id)
    db.delete(item)
    db.commit()
    return {"message": "Cartão excluído"}


@router.get("/cards/{card_id}/invoice")
def card_invoice(card_id: int, month: str, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    card = _owned(db, Card, card_id, owner_id)
    items = db.scalars(
        select(Expense)
        .where(
            Expense.owner_id == owner_id,
            Expense.card_id == card.id,
            func.strftime("%Y-%m", Expense.due_date) == month,
        )
        .order_by(Expense.due_date, Expense.purchase_date, Expense.created_at)
    ).all()
    available_months = list(db.scalars(
        select(func.strftime("%Y-%m", Expense.due_date))
        .where(Expense.owner_id == owner_id, Expense.card_id == card.id)
        .distinct()
        .order_by(func.strftime("%Y-%m", Expense.due_date))
    ).all())
    return {
        "card": card,
        "month": month,
        "requested_month": month,
        "total": sum(float(item.amount) for item in items),
        "status": "paid" if items and all(item.status == "paid" for item in items) else "open",
        "items": items,
        "available_months": available_months,
    }


@router.post("/cards/{card_id}/invoice/pay")
def pay_card_invoice(card_id: int, month: str, account_id: int | None = None, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    _owned(db, Card, card_id, owner_id)
    items = db.scalars(
        select(Expense).where(
            Expense.owner_id == owner_id,
            Expense.card_id == card_id,
            func.strftime("%Y-%m", Expense.due_date) == month,
        )
    ).all()
    if not items:
        raise HTTPException(status_code=404, detail="Fatura sem lançamentos")
    today = date.today()
    for item in items:
        item.status = "paid"
        item.paid_date = today
        if account_id:
            item.account_id = account_id
    db.commit()
    return {"message": "Fatura marcada como paga", "items": len(items)}


@router.get("/incomes")
def list_incomes(month: str, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    start, end = month_bounds(month)
    return db.scalars(select(Income).where(Income.owner_id == owner_id, Income.expected_date.between(start, end)).order_by(Income.expected_date.desc())).all()


@router.post("/incomes")
def create_income(payload: IncomeInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    if payload.external_id:
        existing = db.scalar(select(Income).where(Income.owner_id == owner_id, Income.external_id == payload.external_id))
        if existing:
            return existing
    data = payload.model_dump()
    if not data.get("external_id"):
        data["external_id"] = f"income-{uuid4()}"
    item = Income(owner_id=owner_id, **data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/incomes/{item_id}")
def update_income(item_id: int, payload: IncomeInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Income, item_id, owner_id)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/incomes/{item_id}")
def delete_income(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Income, item_id, owner_id)
    db.delete(item)
    db.commit()
    return {"message": "Renda excluída"}


@router.get("/expenses")
def list_expenses(month: str, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(
        select(Expense)
        .where(Expense.owner_id == owner_id, expense_reference_month_filter(month))
        .order_by(Expense.due_date.desc(), Expense.created_at.desc())
    ).all()


@router.post("/expenses")
def create_expense(payload: ExpenseInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    card = _owned(db, Card, payload.card_id, owner_id) if payload.card_id else None
    return create_expense_installments(db, owner_id, payload, card)


@router.patch("/expenses/{item_id}")
def update_expense(item_id: int, payload: ExpenseInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Expense, item_id, owner_id)
    card = _owned(db, Card, payload.card_id, owner_id) if payload.card_id else None
    due_date = card_due_date(payload.purchase_date, card) if card and payload.auto_card_due else (payload.due_date or item.due_date or payload.purchase_date)
    data = payload.model_dump(exclude={"installments", "list_month", "auto_card_due", "due_date"})
    if data.get("paid_date") is not None:
        data["status"] = "paid"
    elif data.get("status") == "paid":
        data["paid_date"] = date.today()
    else:
        data["paid_date"] = None
    for key, value in data.items():
        setattr(item, key, value)
    item.due_date = due_date
    item.payment_method = "credit_card" if card else payload.payment_method
    item.billing_month = card_billing_month(payload.purchase_date, card) if card else f"{due_date.year:04d}-{due_date.month:02d}"
    item.list_month = f"{due_date.year:04d}-{due_date.month:02d}"
    db.commit()
    db.refresh(item)
    return item


@router.delete("/expenses/{item_id}")
def delete_expense(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Expense, item_id, owner_id)
    db.delete(item)
    db.commit()
    return {"message": "Despesa excluída"}


@router.get("/expenses/{item_id}/attachment")
def read_attachment(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Expense, item_id, owner_id)
    if not item.attachment_path:
        raise HTTPException(status_code=404, detail="Esta despesa não possui comprovante")
    storage_root = STORAGE_DIR.resolve()
    target = (STORAGE_DIR / item.attachment_path).resolve()
    if storage_root not in target.parents or not target.is_file():
        raise HTTPException(status_code=404, detail="Comprovante não encontrado")
    return FileResponse(target, filename=target.name)


@router.post("/expenses/{item_id}/attachment")
async def upload_attachment(item_id: int, file: UploadFile = File(...), owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Expense, item_id, owner_id)
    suffix = Path(file.filename or "comprovante").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".pdf"}:
        raise HTTPException(status_code=400, detail="Formato não permitido")
    folder = STORAGE_DIR / "users" / str(owner_id) / f"{item.due_date.year:04d}" / f"{item.due_date.month:02d}"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"expense-{item.id}{suffix}"
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo maior que 10 MB")
    target.write_bytes(content)
    item.attachment_path = str(target.relative_to(STORAGE_DIR))
    db.commit()
    return {"message": "Comprovante anexado", "path": item.attachment_path}


@router.get("/recurring-expenses")
def list_recurrences(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(select(RecurringExpense).where(RecurringExpense.owner_id == owner_id).order_by(RecurringExpense.description)).all()


@router.post("/recurring-expenses")
def create_recurrence(payload: RecurringExpenseInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"months_to_generate"})
    item = RecurringExpense(owner_id=owner_id, **data)
    db.add(item)
    db.commit()
    db.refresh(item)
    generated = generate_recurring_expenses(db, item, payload.months_to_generate)
    return {"recurrence": item, "generated": generated}


@router.post("/recurring-expenses/{item_id}/generate")
def generate_recurrence(item_id: int, months: int = Query(default=12, ge=1, le=120), owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, RecurringExpense, item_id, owner_id)
    return {"generated": generate_recurring_expenses(db, item, months)}


@router.get("/loans")
def list_loans(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    loans = db.scalars(select(Loan).where(Loan.owner_id == owner_id).order_by(Loan.created_at.desc())).all()
    return [
        {
            **jsonable_encoder(loan),
            "installments": jsonable_encoder(sorted(loan.installments, key=lambda installment: installment.installment_number)),
        }
        for loan in loans
    ]


@router.post("/loans")
def create_loan(payload: LoanInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    loan = Loan(owner_id=owner_id, **payload.model_dump())
    db.add(loan)
    db.flush()
    for index in range(payload.installment_count):
        db.add(LoanInstallment(
            loan_id=loan.id,
            owner_id=owner_id,
            installment_number=index + 1,
            due_date=add_months(payload.first_due_date, index),
            amount=payload.installment_amount,
            status="pending",
        ))
    db.commit()
    db.refresh(loan)
    return {**jsonable_encoder(loan), "installments": jsonable_encoder(loan.installments)}


@router.patch("/loans/{item_id}")
def update_loan(item_id: int, payload: LoanUpdateInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    loan = _owned(db, Loan, item_id, owner_id)
    installments = sorted(loan.installments, key=lambda installment: installment.installment_number)

    # Nunca removemos ou reescrevemos uma parcela que já foi paga.
    paid_outside_new_plan = [
        installment for installment in installments
        if installment.status == "paid" and installment.installment_number > payload.installment_count
    ]
    if paid_outside_new_plan:
        raise HTTPException(
            status_code=400,
            detail="A quantidade de parcelas não pode ser menor que uma parcela já paga.",
        )

    for key, value in payload.model_dump().items():
        setattr(loan, key, value)

    by_number = {installment.installment_number: installment for installment in installments}
    for number in range(1, payload.installment_count + 1):
        due_date = add_months(payload.first_due_date, number - 1)
        installment = by_number.get(number)
        if installment is None:
            db.add(LoanInstallment(
                loan_id=loan.id,
                owner_id=owner_id,
                installment_number=number,
                due_date=due_date,
                amount=payload.installment_amount,
                status="pending",
            ))
        elif installment.status != "paid":
            installment.due_date = due_date
            installment.amount = payload.installment_amount

    for installment in installments:
        if installment.installment_number > payload.installment_count:
            db.delete(installment)

    db.commit()
    db.refresh(loan)
    ordered_installments = sorted(loan.installments, key=lambda installment: installment.installment_number)
    return {**jsonable_encoder(loan), "installments": jsonable_encoder(ordered_installments)}


@router.patch("/loan-installments/{item_id}")
def update_loan_installment(item_id: int, payload: LoanInstallmentInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, LoanInstallment, item_id, owner_id)
    if payload.account_id is not None:
        _owned(db, Account, payload.account_id, owner_id)
    item.due_date = payload.due_date
    item.amount = payload.amount
    item.status = payload.status
    item.paid_date = payload.paid_date if payload.status == "paid" else None
    item.account_id = payload.account_id if payload.status == "paid" else None
    db.commit()
    db.refresh(item)
    return item


@router.post("/loan-installments/{item_id}/pay")
def pay_loan_installment(item_id: int, account_id: int | None = None, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, LoanInstallment, item_id, owner_id)
    item.status = "paid"
    item.paid_date = date.today()
    item.account_id = account_id
    db.commit()
    return {"message": "Parcela marcada como paga"}


@router.delete("/loans/{item_id}")
def delete_loan(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Loan, item_id, owner_id)
    db.delete(item)
    db.commit()
    return {"message": "Empréstimo excluído"}
