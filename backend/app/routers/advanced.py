from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import resolve_owner_id
from ..models import (
    Account, Budget, Card, Category, Expense, Goal, ImportRule, Income,
    InternalTransfer, Loan, LoanInstallment, RecurringExpense, RecurringIncome,
)
from ..schemas import AccountReconcileInput, BudgetInput, GoalInput, ImportRuleInput, InternalTransferInput, RecurringExpenseInput, RecurringIncomeInput
from ..services.finance import add_months, expense_reference_month_filter, generate_recurring_expenses, generate_recurring_incomes, month_bounds, month_key

router = APIRouter(prefix="/api", tags=["Planejamento e automação"])


def _owned(db: Session, model, item_id: int, owner_id: int):
    item = db.scalar(select(model).where(model.id == item_id, model.owner_id == owner_id))
    if not item:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    return item


@router.get("/planning/forecast")
def forecast(months: int = Query(default=12, ge=1, le=36), start: str | None = None, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    if start:
        year, number = map(int, start.split("-"))
        cursor = date(year, number, 1)
    else:
        today = date.today()
        cursor = date(today.year, today.month, 1)
    result = []
    running = Decimal("0")
    for offset in range(months):
        month_date = add_months(cursor, offset)
        month = month_key(month_date)
        start_date, end_date = month_bounds(month)
        incomes = db.scalars(select(Income).where(Income.owner_id == owner_id, Income.expected_date.between(start_date, end_date))).all()
        expenses = db.scalars(select(Expense).where(Expense.owner_id == owner_id, expense_reference_month_filter(month))).all()
        loans = db.scalars(select(LoanInstallment).where(LoanInstallment.owner_id == owner_id, LoanInstallment.due_date.between(start_date, end_date))).all()
        income_total = sum((Decimal(x.amount_expected) for x in incomes), Decimal("0"))
        expense_total = sum((Decimal(x.amount) for x in expenses), Decimal("0")) + sum((Decimal(x.amount) for x in loans), Decimal("0"))
        balance = income_total - expense_total
        running += balance
        result.append({
            "month": month,
            "income": float(income_total),
            "expenses": float(expense_total),
            "balance": float(balance),
            "running_balance": float(running),
            "card_total": float(sum((Decimal(x.amount) for x in expenses if x.card_id), Decimal("0"))),
            "installments_total": float(sum((Decimal(x.amount) for x in expenses if x.installment_group), Decimal("0")) + sum((Decimal(x.amount) for x in loans), Decimal("0"))),
        })
    return result


@router.get("/budgets")
def list_budgets(month: str, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Budget, Category.name).join(Category, Category.id == Budget.category_id)
        .where(Budget.owner_id == owner_id, Budget.month == month).order_by(Category.name)
    ).all()
    spent_rows = db.execute(
        select(Expense.category_id, func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.owner_id == owner_id, expense_reference_month_filter(month)).group_by(Expense.category_id)
    ).all()
    spent = {row[0]: float(row[1]) for row in spent_rows}
    return [{
        "id": item.id, "month": item.month, "category_id": item.category_id, "category_name": name,
        "limit_amount": float(item.limit_amount), "spent": spent.get(item.category_id, 0.0),
        "percent": (spent.get(item.category_id, 0.0) / float(item.limit_amount) * 100) if float(item.limit_amount) else 0,
    } for item, name in rows]


@router.post("/budgets")
def save_budget(payload: BudgetInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    _owned(db, Category, payload.category_id, owner_id)
    item = db.scalar(select(Budget).where(Budget.owner_id == owner_id, Budget.month == payload.month, Budget.category_id == payload.category_id))
    if item:
        item.limit_amount = payload.limit_amount
    else:
        item = Budget(owner_id=owner_id, **payload.model_dump())
        db.add(item)
    db.commit(); db.refresh(item)
    return item


@router.delete("/budgets/{item_id}")
def delete_budget(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Budget, item_id, owner_id); db.delete(item); db.commit(); return {"message": "Orçamento removido"}


@router.get("/goals")
def list_goals(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(select(Goal).where(Goal.owner_id == owner_id).order_by(Goal.status, Goal.target_date, Goal.name)).all()


@router.post("/goals")
def create_goal(payload: GoalInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = Goal(owner_id=owner_id, **payload.model_dump()); db.add(item); db.commit(); db.refresh(item); return item


@router.patch("/goals/{item_id}")
def update_goal(item_id: int, payload: GoalInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Goal, item_id, owner_id)
    for key, value in payload.model_dump().items(): setattr(item, key, value)
    db.commit(); db.refresh(item); return item


@router.delete("/goals/{item_id}")
def delete_goal(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Goal, item_id, owner_id); db.delete(item); db.commit(); return {"message": "Meta excluída"}


def _account_balance(db: Session, owner_id: int, account_id: int) -> Decimal:
    account = _owned(db, Account, account_id, owner_id)
    balance = Decimal(account.initial_balance)
    income = db.scalar(select(func.coalesce(func.sum(Income.amount_received), 0)).where(Income.owner_id == owner_id, Income.account_id == account_id, Income.status == "received")) or 0
    expense = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.owner_id == owner_id, Expense.account_id == account_id, Expense.status == "paid")) or 0
    loan = db.scalar(select(func.coalesce(func.sum(LoanInstallment.amount), 0)).where(LoanInstallment.owner_id == owner_id, LoanInstallment.account_id == account_id, LoanInstallment.status == "paid")) or 0
    incoming = db.scalar(select(func.coalesce(func.sum(InternalTransfer.amount), 0)).where(InternalTransfer.owner_id == owner_id, InternalTransfer.to_account_id == account_id)) or 0
    outgoing = db.scalar(select(func.coalesce(func.sum(InternalTransfer.amount), 0)).where(InternalTransfer.owner_id == owner_id, InternalTransfer.from_account_id == account_id)) or 0
    return balance + Decimal(income) - Decimal(expense) - Decimal(loan) + Decimal(incoming) - Decimal(outgoing)


@router.get("/accounts/summary")
def account_summary(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    accounts = db.scalars(select(Account).where(Account.owner_id == owner_id).order_by(Account.name)).all()
    result = []
    for account in accounts:
        calculated = _account_balance(db, owner_id, account.id)
        reported = Decimal(account.reported_balance) if account.reported_balance is not None else None
        result.append({
            "id": account.id, "name": account.name, "account_type": account.account_type, "initial_balance": float(account.initial_balance),
            "calculated_balance": float(calculated), "reported_balance": None if reported is None else float(reported),
            "difference": None if reported is None else float(reported - calculated),
            "balance_checked_at": account.balance_checked_at.isoformat() if account.balance_checked_at else None,
            "is_active": account.is_active,
        })
    return result


@router.post("/accounts/{account_id}/reconcile")
def reconcile_account(account_id: int, payload: AccountReconcileInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, Account, account_id, owner_id)
    item.reported_balance = payload.reported_balance; item.balance_checked_at = datetime.utcnow(); db.commit(); db.refresh(item)
    calculated = _account_balance(db, owner_id, item.id)
    return {"message": "Saldo informado atualizado", "calculated_balance": float(calculated), "reported_balance": float(item.reported_balance), "difference": float(Decimal(item.reported_balance) - calculated)}


@router.get("/transfers")
def list_transfers(month: str | None = None, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    query = select(InternalTransfer).where(InternalTransfer.owner_id == owner_id)
    if month: query = query.where(func.strftime("%Y-%m", InternalTransfer.transfer_date) == month)
    return db.scalars(query.order_by(InternalTransfer.transfer_date.desc(), InternalTransfer.created_at.desc())).all()


@router.post("/transfers")
def create_transfer(payload: InternalTransferInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    if payload.from_account_id == payload.to_account_id: raise HTTPException(status_code=400, detail="Origem e destino devem ser contas diferentes")
    _owned(db, Account, payload.from_account_id, owner_id); _owned(db, Account, payload.to_account_id, owner_id)
    item = InternalTransfer(owner_id=owner_id, **payload.model_dump()); db.add(item); db.commit(); db.refresh(item); return item


@router.delete("/transfers/{item_id}")
def delete_transfer(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, InternalTransfer, item_id, owner_id); db.delete(item); db.commit(); return {"message": "Transferência excluída"}


@router.get("/installments/center")
def installment_center(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    expense_rows = db.execute(
        select(Expense.installment_group, Expense.description, Expense.total_installments, func.count(Expense.id), func.sum(Expense.amount), func.min(Expense.due_date), func.max(Expense.due_date))
        .where(Expense.owner_id == owner_id, Expense.installment_group.is_not(None))
        .group_by(Expense.installment_group, Expense.description, Expense.total_installments)
    ).all()
    expense_groups = []
    for group, description, total_installments, count, total, first_due, last_due in expense_rows:
        pending = db.scalar(select(func.count(Expense.id)).where(Expense.owner_id == owner_id, Expense.installment_group == group, Expense.status != "paid")) or 0
        remaining = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.owner_id == owner_id, Expense.installment_group == group, Expense.status != "paid")) or 0
        expense_groups.append({"kind": "purchase", "group": group, "name": description, "total_installments": total_installments or count, "pending_installments": pending, "remaining": float(remaining), "total": float(total or 0), "first_due": first_due.isoformat(), "last_due": last_due.isoformat()})
    loans = db.scalars(select(Loan).where(Loan.owner_id == owner_id).order_by(Loan.created_at.desc())).all()
    loan_groups = []
    for loan in loans:
        pending = [x for x in loan.installments if x.status != "paid"]
        loan_groups.append({"kind": "loan", "group": f"loan-{loan.id}", "name": loan.creditor, "total_installments": loan.installment_count, "pending_installments": len(pending), "remaining": float(sum((Decimal(x.amount) for x in pending), Decimal("0"))), "total": float(loan.total_amount), "first_due": loan.first_due_date.isoformat(), "last_due": max((x.due_date for x in loan.installments), default=loan.first_due_date).isoformat()})
    return sorted(expense_groups + loan_groups, key=lambda x: x["last_due"])


@router.get("/search")
def search(q: str = Query(min_length=2), owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    like = f"%{q.strip()}%"; results = []
    for item in db.scalars(select(Expense).where(Expense.owner_id == owner_id, or_(Expense.description.ilike(like), Expense.merchant.ilike(like), Expense.notes.ilike(like))).limit(15)).all():
        results.append({"kind": "expense", "id": item.id, "title": item.description, "subtitle": f"Despesa • {item.due_date.isoformat()}", "amount": float(item.amount), "page": "expenses", "month": month_key(item.due_date)})
    for item in db.scalars(select(Income).where(Income.owner_id == owner_id, or_(Income.description.ilike(like), Income.notes.ilike(like))).limit(10)).all():
        results.append({"kind": "income", "id": item.id, "title": item.description, "subtitle": f"Renda • {item.expected_date.isoformat()}", "amount": float(item.amount_expected), "page": "incomes", "month": month_key(item.expected_date)})
    for item in db.scalars(select(Card).where(Card.owner_id == owner_id, or_(Card.name.ilike(like), Card.bank.ilike(like))).limit(5)).all():
        results.append({"kind": "card", "id": item.id, "title": item.name, "subtitle": f"Cartão • {item.bank}", "amount": float(item.credit_limit), "page": "cards"})
    for item in db.scalars(select(Loan).where(Loan.owner_id == owner_id, Loan.creditor.ilike(like)).limit(5)).all():
        results.append({"kind": "loan", "id": item.id, "title": item.creditor, "subtitle": "Empréstimo", "amount": float(item.total_amount), "page": "loans"})
    return results[:30]


@router.get("/import-rules")
def list_import_rules(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(select(ImportRule).where(ImportRule.owner_id == owner_id).order_by(ImportRule.pattern)).all()


@router.post("/import-rules")
def create_import_rule(payload: ImportRuleInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    if payload.category_id: _owned(db, Category, payload.category_id, owner_id)
    existing = db.scalar(select(ImportRule).where(ImportRule.owner_id == owner_id, func.lower(ImportRule.pattern) == payload.pattern.lower(), ImportRule.kind == payload.kind))
    if existing:
        existing.category_id = payload.category_id; existing.payment_method = payload.payment_method; item = existing
    else:
        item = ImportRule(owner_id=owner_id, **payload.model_dump()); db.add(item)
    db.commit(); db.refresh(item); return item


@router.delete("/import-rules/{item_id}")
def delete_import_rule(item_id: int, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, ImportRule, item_id, owner_id); db.delete(item); db.commit(); return {"message": "Regra excluída"}


@router.get("/recurring-incomes")
def list_recurring_incomes(owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    return db.scalars(select(RecurringIncome).where(RecurringIncome.owner_id == owner_id).order_by(RecurringIncome.description)).all()


@router.post("/recurring-incomes")
def create_recurring_income(payload: RecurringIncomeInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"months_to_generate"}); item = RecurringIncome(owner_id=owner_id, **data); db.add(item); db.commit(); db.refresh(item)
    return {"recurrence": item, "generated": generate_recurring_incomes(db, item, payload.months_to_generate)}


@router.patch("/recurring-incomes/{item_id}")
def update_recurring_income(item_id: int, payload: RecurringIncomeInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, RecurringIncome, item_id, owner_id)
    for key, value in payload.model_dump(exclude={"months_to_generate"}).items(): setattr(item, key, value)
    db.commit(); db.refresh(item); generated = generate_recurring_incomes(db, item, payload.months_to_generate)
    return {"recurrence": item, "generated": generated}


@router.post("/recurring-incomes/{item_id}/stop")
def stop_recurring_income(item_id: int, from_month: str, remove_future: bool = True, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, RecurringIncome, item_id, owner_id); item.active = False; item.end_month = from_month
    removed = 0
    if remove_future:
        rows = db.scalars(select(Income).where(Income.owner_id == owner_id, Income.recurrence_id == item.id, func.strftime("%Y-%m", Income.expected_date) > from_month, Income.status != "received")).all()
        removed = len(rows)
        for row in rows: db.delete(row)
    db.commit(); return {"message": "Renda recorrente interrompida", "removed": removed}


@router.post("/recurring-expenses/{item_id}/stop")
def stop_recurring_expense(item_id: int, from_month: str, remove_future: bool = True, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, RecurringExpense, item_id, owner_id); item.active = False; item.end_month = from_month
    removed = 0
    if remove_future:
        rows = db.scalars(select(Expense).where(Expense.owner_id == owner_id, Expense.recurrence_id == item.id, func.strftime("%Y-%m", Expense.due_date) > from_month, Expense.status != "paid")).all()
        removed = len(rows)
        for row in rows: db.delete(row)
    db.commit(); return {"message": "Despesa recorrente interrompida", "removed": removed}


@router.patch("/recurring-expenses/{item_id}")
def update_recurring_expense(item_id: int, payload: RecurringExpenseInput, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    item = _owned(db, RecurringExpense, item_id, owner_id)
    for key, value in payload.model_dump(exclude={"months_to_generate"}).items(): setattr(item, key, value)
    db.commit(); db.refresh(item); generated = generate_recurring_expenses(db, item, payload.months_to_generate)
    return {"recurrence": item, "generated": generated}
