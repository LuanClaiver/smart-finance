from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Budget, Card, Category, Expense, Income, LoanInstallment, RecurringExpense, RecurringIncome


def month_bounds(month: str) -> tuple[date, date]:
    year, number = [int(part) for part in month.split("-")]
    return date(year, number, 1), date(year, number, calendar.monthrange(year, number)[1])


def add_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 + months
    year, month_zero = divmod(month_index, 12)
    month = month_zero + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def month_key(value: date) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def card_billing_month(purchase_date: date, card: Card) -> str:
    """Mês de fechamento do ciclo da compra."""
    base = purchase_date.replace(day=1)
    if purchase_date.day > card.closing_day:
        base = add_months(base, 1)
    return month_key(base)


def card_due_date(purchase_date: date, card: Card) -> date:
    """Calcula o vencimento real da primeira parcela a partir do ciclo do cartão.

    Compra até o fechamento entra no ciclo atual; depois do fechamento, no próximo.
    Se o dia de vencimento for menor/igual ao fechamento, ele ocorre no mês seguinte
    ao fechamento (ex.: fecha 28, vence 7). Caso contrário, no mesmo mês.
    """
    cycle_start = purchase_date.replace(day=1)
    if purchase_date.day > card.closing_day:
        cycle_start = add_months(cycle_start, 1)
    due_month = add_months(cycle_start, 1 if card.due_day <= card.closing_day else 0)
    due_day = min(card.due_day, calendar.monthrange(due_month.year, due_month.month)[1])
    return date(due_month.year, due_month.month, due_day)


def expense_reference_month_filter(month: str):
    return func.strftime("%Y-%m", Expense.due_date) == month


def create_expense_installments(db: Session, owner_id: int, payload, card: Card | None) -> list[Expense]:
    if payload.external_id:
        existing = db.scalar(select(Expense).where(Expense.owner_id == owner_id, Expense.external_id == payload.external_id))
        if existing:
            return [existing]

    count = int(payload.installments or 1)
    total = Decimal(payload.amount)
    base = (total / count).quantize(Decimal("0.01"))
    values = [base for _ in range(count)]
    values[-1] += total - sum(values)
    group = str(uuid4()) if count > 1 else None
    created: list[Expense] = []
    normalized_status = "paid" if payload.paid_date is not None or payload.status == "paid" else "pending"
    normalized_paid_date = payload.paid_date or (date.today() if normalized_status == "paid" else None)
    first_due = card_due_date(payload.purchase_date, card) if card and payload.auto_card_due else (payload.due_date or payload.purchase_date)
    billing_start = card_billing_month(payload.purchase_date, card) if card else month_key(first_due)

    for index, amount in enumerate(values):
        # A data da compra é a mesma em todas as parcelas; quem avança mês a mês é o vencimento.
        purchase_date = payload.purchase_date
        due_date = add_months(first_due, index)
        billing_month = month_key(add_months(date.fromisoformat(f"{billing_start}-01"), index)) if card else month_key(due_date)
        base_external_id = payload.external_id or f"expense-{uuid4()}"
        external_id = f"{base_external_id}:{index + 1}" if count > 1 else base_external_id
        expense = Expense(
            owner_id=owner_id,
            description=payload.description,
            amount=amount,
            purchase_date=purchase_date,
            due_date=due_date,
            paid_date=normalized_paid_date,
            category_id=payload.category_id,
            expense_type=payload.expense_type,
            payment_method="credit_card" if card else payload.payment_method,
            merchant=payload.merchant,
            notes=payload.notes,
            status=normalized_status,
            account_id=payload.account_id,
            card_id=payload.card_id,
            installment_group=group,
            installment_number=index + 1 if count > 1 else None,
            total_installments=count if count > 1 else None,
            billing_month=billing_month,
            list_month=month_key(due_date),
            external_id=external_id,
        )
        db.add(expense)
        created.append(expense)
    db.commit()
    for expense in created:
        db.refresh(expense)
    return created


def generate_recurring_expenses(db: Session, recurrence: RecurringExpense, months: int) -> int:
    if not recurrence.active:
        return 0
    start_year, start_month = map(int, recurrence.start_month.split("-"))
    cursor = date(start_year, start_month, 1)
    generated = 0
    for offset in range(months):
        month_date = add_months(cursor, offset)
        month = month_key(month_date)
        if recurrence.end_month and month > recurrence.end_month:
            break
        exists = db.scalar(select(Expense.id).where(Expense.recurrence_id == recurrence.id, func.strftime("%Y-%m", Expense.due_date) == month).limit(1))
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
            external_id=f"recurring-expense-{recurrence.id}-{month}",
            billing_month=month,
            list_month=month,
        ))
        generated += 1
    db.commit()
    return generated


def generate_recurring_incomes(db: Session, recurrence: RecurringIncome, months: int) -> int:
    if not recurrence.active:
        return 0
    year, month = map(int, recurrence.start_month.split("-"))
    cursor = date(year, month, 1)
    generated = 0
    for offset in range(months):
        month_date = add_months(cursor, offset)
        month_key_value = month_key(month_date)
        if recurrence.end_month and month_key_value > recurrence.end_month:
            break
        exists = db.scalar(select(Income.id).where(Income.recurrence_id == recurrence.id, func.strftime("%Y-%m", Income.expected_date) == month_key_value).limit(1))
        if exists:
            continue
        day = min(recurrence.expected_day, calendar.monthrange(month_date.year, month_date.month)[1])
        expected = date(month_date.year, month_date.month, day)
        db.add(Income(
            owner_id=recurrence.owner_id,
            description=recurrence.description,
            amount_expected=recurrence.amount,
            amount_received=Decimal("0"),
            expected_date=expected,
            status="pending",
            account_id=recurrence.account_id,
            category_id=recurrence.category_id,
            notes=recurrence.notes,
            recurrence_id=recurrence.id,
            external_id=f"recurring-income-{recurrence.id}-{month_key_value}",
        ))
        generated += 1
    db.commit()
    return generated


def _month_totals(db: Session, owner_id: int, month: str) -> dict:
    start, end = month_bounds(month)
    incomes = db.scalars(select(Income).where(Income.owner_id == owner_id, Income.expected_date.between(start, end))).all()
    expenses = db.scalars(select(Expense).where(Expense.owner_id == owner_id, expense_reference_month_filter(month))).all()
    installments = db.scalars(select(LoanInstallment).where(LoanInstallment.owner_id == owner_id, LoanInstallment.due_date.between(start, end))).all()
    income_expected = sum((Decimal(item.amount_expected) for item in incomes), Decimal("0"))
    income_received = sum((Decimal(item.amount_received) for item in incomes if item.status == "received"), Decimal("0"))
    expense_expected = sum((Decimal(item.amount) for item in expenses), Decimal("0")) + sum((Decimal(item.amount) for item in installments), Decimal("0"))
    expense_paid = sum((Decimal(item.amount) for item in expenses if item.status == "paid"), Decimal("0")) + sum((Decimal(item.amount) for item in installments if item.status == "paid"), Decimal("0"))
    return {
        "incomes": incomes,
        "expenses": expenses,
        "installments": installments,
        "income_expected": income_expected,
        "income_received": income_received,
        "expense_expected": expense_expected,
        "expense_paid": expense_paid,
    }


def _variation(current: Decimal, previous: Decimal) -> float | None:
    if previous == 0:
        return None
    return float(((current - previous) / abs(previous)) * Decimal("100"))


def dashboard_summary(db: Session, owner_id: int, month: str) -> dict:
    values = _month_totals(db, owner_id, month)
    start, _ = month_bounds(month)
    previous_month = month_key(add_months(start, -1))
    previous = _month_totals(db, owner_id, previous_month)
    expenses = values["expenses"]
    installments = values["installments"]

    by_category_rows = db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0), Expense.category_id, Category.name)
        .outerjoin(Category, Category.id == Expense.category_id)
        .where(Expense.owner_id == owner_id, expense_reference_month_filter(month))
        .group_by(Expense.category_id, Category.name)
    ).all()
    by_category = [{"category_id": row[1], "category_name": row[2] or "Sem categoria", "total": float(row[0])} for row in by_category_rows]
    largest = max(by_category, key=lambda row: row["total"], default=None)

    next_expense = db.scalar(
        select(Expense).where(Expense.owner_id == owner_id, Expense.status != "paid", Expense.due_date >= date.today()).order_by(Expense.due_date).limit(1)
    )
    card_total = sum((Decimal(item.amount) for item in expenses if item.card_id), Decimal("0"))
    commitment = float((values["expense_expected"] / values["income_expected"] * 100) if values["income_expected"] else Decimal("0"))

    budgets = db.scalars(select(Budget).where(Budget.owner_id == owner_id, Budget.month == month)).all()
    expense_by_category = {row["category_id"]: Decimal(str(row["total"])) for row in by_category}
    budget_over = sum(1 for item in budgets if expense_by_category.get(item.category_id, Decimal("0")) > Decimal(item.limit_amount))

    balance_expected = values["income_expected"] - values["expense_expected"]
    if values["income_expected"] == 0 and values["expense_expected"] == 0:
        health_message = "Ainda não há lançamentos previstos para este mês."
    elif balance_expected < 0:
        health_message = f"O mês está projetado no negativo em R$ {abs(float(balance_expected)):,.2f}."
    elif commitment >= 90:
        health_message = f"Você já comprometeu {commitment:.0f}% da renda prevista do mês."
    else:
        health_message = f"Após os compromissos previstos, restam R$ {float(balance_expected):,.2f}."

    return {
        "month": month,
        "income_expected": float(values["income_expected"]),
        "income_received": float(values["income_received"]),
        "expense_expected": float(values["expense_expected"]),
        "expense_paid": float(values["expense_paid"]),
        "balance_expected": float(balance_expected),
        "balance_real": float(values["income_received"] - values["expense_paid"]),
        "pending_expenses": sum(1 for item in expenses if item.status != "paid") + sum(1 for item in installments if item.status != "paid"),
        "entries": len(values["incomes"]) + len(expenses) + len(installments),
        "by_category": by_category,
        "commitment_percent": commitment,
        "income_change_percent": _variation(values["income_expected"], previous["income_expected"]),
        "expense_change_percent": _variation(values["expense_expected"], previous["expense_expected"]),
        "largest_category": largest,
        "next_due": None if not next_expense else {
            "id": next_expense.id,
            "description": next_expense.description,
            "date": next_expense.due_date.isoformat(),
            "amount": float(next_expense.amount),
        },
        "card_total": float(card_total),
        "budget_over_count": budget_over,
        "health_message": health_message.replace(",", "X").replace(".", ",").replace("X", ".") if "R$" in health_message else health_message,
    }
