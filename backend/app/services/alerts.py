from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Expense, Income, Loan, LoanInstallment


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
            "month": item.list_month or item.billing_month,
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

    priority = {"danger": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda item: (item["date"], priority.get(item["level"], 9)))
    return alerts
