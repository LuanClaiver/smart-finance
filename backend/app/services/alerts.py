from __future__ import annotations

import calendar
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Budget, Card, Category, Expense, Income, Loan, LoanInstallment


def get_alerts(db: Session, owner_id: int) -> list[dict]:
    today = date.today()
    horizon = today + timedelta(days=7)
    alerts: list[dict] = []

    expenses = db.scalars(
        select(Expense).where(
            Expense.owner_id == owner_id,
            Expense.status != "paid",
            Expense.due_date <= horizon,
        )
    ).all()
    for item in expenses:
        days = (item.due_date - today).days
        level = "danger" if days < 0 else "warning" if days <= 3 else "info"
        label = "vencida" if days < 0 else "vence hoje" if days == 0 else f"vence em {days} dia(s)"
        alerts.append({
            "type": "expense",
            "level": level,
            "title": item.description,
            "message": label,
            "date": item.due_date.isoformat(),
            "amount": float(item.amount),
            "target_id": item.id,
            "target_page": "expenses",
            "month": f"{item.due_date.year:04d}-{item.due_date.month:02d}",
        })

    installment_rows = db.execute(
        select(LoanInstallment, Loan)
        .join(Loan, Loan.id == LoanInstallment.loan_id)
        .where(
            LoanInstallment.owner_id == owner_id,
            LoanInstallment.status != "paid",
            LoanInstallment.due_date <= horizon,
        )
    ).all()
    for item, loan in installment_rows:
        days = (item.due_date - today).days
        level = "danger" if days < 0 else "warning" if days <= 3 else "info"
        label = "parcela vencida" if days < 0 else "parcela vence hoje" if days == 0 else f"parcela vence em {days} dia(s)"
        alerts.append({
            "type": "loan",
            "level": level,
            "title": f"{loan.creditor} • parcela {item.installment_number}",
            "message": label,
            "date": item.due_date.isoformat(),
            "amount": float(item.amount),
            "target_id": item.id,
            "target_page": "loans",
            "month": f"{item.due_date.year:04d}-{item.due_date.month:02d}",
        })

    incomes = db.scalars(
        select(Income).where(
            Income.owner_id == owner_id,
            Income.status != "received",
            Income.expected_date <= today,
        )
    ).all()
    for item in incomes:
        alerts.append({
            "type": "income",
            "level": "warning",
            "title": item.description,
            "message": "renda prevista ainda não recebida",
            "date": item.expected_date.isoformat(),
            "amount": float(item.amount_expected),
            "target_id": item.id,
            "target_page": "incomes",
            "month": f"{item.expected_date.year:04d}-{item.expected_date.month:02d}",
        })


    # Fechamento de cartões nos próximos 7 dias.
    cards = db.scalars(select(Card).where(Card.owner_id == owner_id, Card.is_active.is_(True))).all()
    for card in cards:
        closing_day = min(card.closing_day, calendar.monthrange(today.year, today.month)[1])
        closing = date(today.year, today.month, closing_day)
        if closing < today:
            next_month = today.month + 1
            next_year = today.year
            if next_month == 13:
                next_month = 1; next_year += 1
            closing = date(next_year, next_month, min(card.closing_day, calendar.monthrange(next_year, next_month)[1]))
        days = (closing - today).days
        if days <= 7:
            alerts.append({
                "type": "card_closing", "level": "warning" if days <= 1 else "info", "title": card.name,
                "message": "fatura fecha hoje" if days == 0 else f"fatura fecha em {days} dia(s)",
                "date": closing.isoformat(), "amount": 0.0, "target_id": card.id, "target_page": "cards",
                "month": f"{closing.year:04d}-{closing.month:02d}",
            })

    # Avisos de orçamento do mês quando o consumo chega a 90% ou ultrapassa o limite.
    current_month = f"{today.year:04d}-{today.month:02d}"
    budget_rows = db.execute(
        select(Budget, Category.name).join(Category, Category.id == Budget.category_id)
        .where(Budget.owner_id == owner_id, Budget.month == current_month)
    ).all()
    for budget, category_name in budget_rows:
        spent = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.owner_id == owner_id, Expense.category_id == budget.category_id,
            func.strftime("%Y-%m", Expense.due_date) == current_month,
        )) or 0
        limit_value = float(budget.limit_amount)
        percent = (float(spent) / limit_value * 100) if limit_value else 0
        if percent >= 90:
            alerts.append({
                "type": "budget", "level": "danger" if percent >= 100 else "warning",
                "title": f"Orçamento • {category_name}",
                "message": f"{percent:.0f}% do limite mensal utilizado", "date": today.isoformat(),
                "amount": float(spent), "target_id": budget.id, "target_page": "planning", "month": current_month,
            })

    priority = {"danger": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda item: (item["date"], priority.get(item["level"], 9)))
    return alerts
