from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from ..models import Card, Expense, Income, LoanInstallment, RecurringExpense


def month_bounds(month: str) -> tuple[date, date]:
    year, number = [int(part) for part in month.split("-")]
    return date(year, number, 1), date(year, number, calendar.monthrange(year, number)[1])


def add_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 + months
    year, month_zero = divmod(month_index, 12)
    month = month_zero + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def card_billing_month(purchase_date: date, card: Card) -> str:
    base = purchase_date
    if purchase_date.day > card.closing_day:
        base = add_months(purchase_date.replace(day=1), 1)
    return f"{base.year:04d}-{base.month:02d}"


def expense_reference_month_filter(month: str):
    """Mês em que a despesa deve afetar a visão financeira.

    Compras/faturas de cartão pertencem ao mês do vencimento. Os demais
    lançamentos preservam o mês de referência escolhido pelo usuário.
    """
    return or_(
        and_(Expense.card_id.is_not(None), func.strftime("%Y-%m", Expense.due_date) == month),
        and_(Expense.card_id.is_(None), func.coalesce(Expense.list_month, Expense.billing_month) == month),
    )


def create_expense_installments(db: Session, owner_id: int, payload, card: Card | None) -> list[Expense]:
    count = int(payload.installments or 1)
    total = Decimal(payload.amount)
    base = (total / count).quantize(Decimal("0.01"))
    values = [base for _ in range(count)]
    values[-1] += total - sum(values)
    group = str(uuid4()) if count > 1 else None
    created: list[Expense] = []
    normalized_status = "paid" if payload.paid_date is not None or payload.status == "paid" else "pending"
    normalized_paid_date = payload.paid_date or (date.today() if normalized_status == "paid" else None)
    for index, amount in enumerate(values):
        purchase_date = add_months(payload.purchase_date, index) if count > 1 else payload.purchase_date
        due_date = add_months(payload.due_date, index) if count > 1 else payload.due_date
        billing_month = card_billing_month(purchase_date, card) if card else f"{due_date.year:04d}-{due_date.month:02d}"
        if card:
            # Cartão impacta o orçamento somente no mês em que a fatura vence.
            list_month = f"{due_date.year:04d}-{due_date.month:02d}"
        elif payload.list_month:
            reference_year, reference_month = map(int, payload.list_month.split("-"))
            reference_date = add_months(date(reference_year, reference_month, 1), index if count > 1 else 0)
            list_month = f"{reference_date.year:04d}-{reference_date.month:02d}"
        else:
            list_month = billing_month
        expense = Expense(
            owner_id=owner_id,
            description=payload.description,
            amount=amount,
            purchase_date=purchase_date,
            due_date=due_date,
            paid_date=normalized_paid_date,
            category_id=payload.category_id,
            expense_type=payload.expense_type,
            payment_method=payload.payment_method,
            merchant=payload.merchant,
            notes=payload.notes,
            status=normalized_status,
            account_id=payload.account_id,
            card_id=payload.card_id,
            installment_group=group,
            installment_number=index + 1 if count > 1 else None,
            total_installments=count if count > 1 else None,
            billing_month=billing_month,
            list_month=list_month,
        )
        db.add(expense)
        created.append(expense)
    db.commit()
    for expense in created:
        db.refresh(expense)
    return created


def generate_recurring_expenses(db: Session, recurrence: RecurringExpense, months: int) -> int:
    start_year, start_month = map(int, recurrence.start_month.split("-"))
    cursor = date(start_year, start_month, 1)
    generated = 0
    for offset in range(months):
        month_date = add_months(cursor, offset)
        month = f"{month_date.year:04d}-{month_date.month:02d}"
        if recurrence.end_month and month > recurrence.end_month:
            break
        exists = db.scalar(select(Expense.id).where(Expense.recurrence_id == recurrence.id, Expense.billing_month == month).limit(1))
        if exists:
            continue
        due_day = min(recurrence.due_day, calendar.monthrange(month_date.year, month_date.month)[1])
        due_date = date(month_date.year, month_date.month, due_day)
        db.add(Expense(
            owner_id=recurrence.owner_id,
            description=recurrence.description,
            amount=recurrence.amount,
            purchase_date=due_date,
            due_date=due_date,
            category_id=recurrence.category_id,
            expense_type="fixed",
            payment_method=recurrence.payment_method,
            merchant=recurrence.merchant,
            status="pending",
            account_id=recurrence.account_id,
            recurrence_id=recurrence.id,
            billing_month=month,
            list_month=month,
        ))
        generated += 1
    db.commit()
    return generated


def dashboard_summary(db: Session, owner_id: int, month: str) -> dict:
    start, end = month_bounds(month)
    incomes = db.scalars(select(Income).where(Income.owner_id == owner_id, Income.expected_date.between(start, end))).all()
    expenses = db.scalars(select(Expense).where(Expense.owner_id == owner_id, expense_reference_month_filter(month))).all()
    installments = db.scalars(select(LoanInstallment).where(LoanInstallment.owner_id == owner_id, LoanInstallment.due_date.between(start, end))).all()

    income_expected = sum((Decimal(item.amount_expected) for item in incomes), Decimal("0"))
    income_received = sum((Decimal(item.amount_received) for item in incomes if item.status == "received"), Decimal("0"))
    expense_expected = sum((Decimal(item.amount) for item in expenses), Decimal("0")) + sum((Decimal(item.amount) for item in installments), Decimal("0"))
    expense_paid = sum((Decimal(item.amount) for item in expenses if item.status == "paid"), Decimal("0")) + sum((Decimal(item.amount) for item in installments if item.status == "paid"), Decimal("0"))

    by_category_rows = db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0), Expense.category_id)
        .where(Expense.owner_id == owner_id, expense_reference_month_filter(month))
        .group_by(Expense.category_id)
    ).all()
    by_category = [{"category_id": row[1], "total": float(row[0])} for row in by_category_rows]

    return {
        "month": month,
        "income_expected": float(income_expected),
        "income_received": float(income_received),
        "expense_expected": float(expense_expected),
        "expense_paid": float(expense_paid),
        "balance_expected": float(income_expected - expense_expected),
        "balance_real": float(income_received - expense_paid),
        "pending_expenses": sum(1 for item in expenses if item.status != "paid") + sum(1 for item in installments if item.status != "paid"),
        "entries": len(incomes) + len(expenses) + len(installments),
        "by_category": by_category,
    }
