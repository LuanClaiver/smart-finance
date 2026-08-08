from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import resolve_owner_id
from ..models import (
    Account, Budget, Card, Category, Expense, Goal, ImportRule, Income,
    InternalTransfer, Loan, LoanInstallment, RecurringExpense, RecurringIncome,
)
from ..services.backup import create_backup

router = APIRouter(prefix="/api/sync", tags=["Sincronização"])


def _rows(data: dict, key: str) -> list[dict]:
    value = data.get(key, [])
    return value if isinstance(value, list) else []


def _decimal(value, default="0") -> Decimal:
    try:
        return Decimal(str(value if value not in (None, "") else default))
    except Exception:
        return Decimal(default)


def _date(value, fallback: date | None = None) -> date:
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except Exception:
        return fallback or date.today()


def _bool(value, default=True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).lower() in {"1", "true", "sim", "yes"}


def _source_id(row: dict) -> int:
    try:
        return int(row.get("id") or 0)
    except Exception:
        return 0


def _mapped(mapping: dict[int, int], value):
    try:
        return mapping.get(int(value)) if value not in (None, "") else None
    except Exception:
        return None


@router.post("/import")
async def import_sync_package(
    upload: UploadFile = File(...),
    owner_id: int = Depends(resolve_owner_id),
    db: Session = Depends(get_db),
):
    try:
        raw = await upload.read()
        payload = json.loads(raw.decode("utf-8-sig"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="O arquivo de sincronização é inválido.") from exc
    finally:
        await upload.close()

    if payload.get("format") not in {"smart-finance-sync", "smart-finance-mobile"} or not isinstance(payload.get("data"), dict):
        raise HTTPException(status_code=400, detail="O arquivo não pertence ao Smart Finance ou usa um formato incompatível.")

    backup = create_backup(force=True)
    data: dict = payload["data"]
    maps: dict[str, dict[int, int]] = {key: {} for key in ("categories", "accounts", "cards", "recurring_expenses", "recurring_incomes", "loans")}
    counts = {key: 0 for key in ("categories", "accounts", "cards", "recurring_expenses", "recurring_incomes", "incomes", "expenses", "loans", "loan_installments", "budgets", "goals", "transfers", "rules")}

    try:
        # Categorias
        for row in _rows(data, "categories"):
            name = str(row.get("name") or "").strip(); kind = str(row.get("kind") or "expense")
            if not name: continue
            item = db.scalar(select(Category).where(Category.owner_id == owner_id, func.lower(Category.name) == name.lower(), Category.kind == kind))
            if not item:
                item = Category(owner_id=owner_id, name=name, kind=kind, is_active=_bool(row.get("is_active")))
                db.add(item); db.flush(); counts["categories"] += 1
            maps["categories"][_source_id(row)] = item.id

        # Contas
        for row in _rows(data, "accounts"):
            name = str(row.get("name") or "").strip()
            if not name: continue
            item = db.scalar(select(Account).where(Account.owner_id == owner_id, func.lower(Account.name) == name.lower()))
            if not item:
                item = Account(owner_id=owner_id, name=name); db.add(item); db.flush(); counts["accounts"] += 1
            item.account_type = str(row.get("account_type") or item.account_type or "digital")
            item.initial_balance = _decimal(row.get("initial_balance"))
            if row.get("reported_balance") is not None: item.reported_balance = _decimal(row.get("reported_balance"))
            item.is_active = _bool(row.get("is_active"))
            maps["accounts"][_source_id(row)] = item.id

        # Cartões
        for row in _rows(data, "cards"):
            name = str(row.get("name") or "").strip(); bank = str(row.get("bank") or "")
            if not name: continue
            item = db.scalar(select(Card).where(Card.owner_id == owner_id, func.lower(Card.name) == name.lower()))
            if not item:
                item = Card(owner_id=owner_id, name=name); db.add(item); db.flush(); counts["cards"] += 1
            item.bank=bank; item.brand=str(row.get("brand") or ""); item.credit_limit=_decimal(row.get("credit_limit")); item.closing_day=int(row.get("closing_day") or 1); item.due_day=int(row.get("due_day") or 10); item.payment_account_id=_mapped(maps["accounts"], row.get("payment_account_id")); item.color=str(row.get("color") or "#22c55e"); item.is_active=_bool(row.get("is_active"))
            maps["cards"][_source_id(row)] = item.id

        # Recorrências de despesa
        for row in _rows(data, "recurring_expenses"):
            desc=str(row.get("description") or "").strip(); start=str(row.get("start_month") or "")
            if not desc or not start: continue
            due_day=int(row.get("due_day") or 1)
            item=db.scalar(select(RecurringExpense).where(RecurringExpense.owner_id==owner_id,RecurringExpense.description==desc,RecurringExpense.start_month==start,RecurringExpense.due_day==due_day))
            if not item:
                item=RecurringExpense(owner_id=owner_id,description=desc,start_month=start,due_day=due_day,amount=_decimal(row.get("amount")));db.add(item);db.flush();counts["recurring_expenses"]+=1
            item.amount=_decimal(row.get("amount"));item.category_id=_mapped(maps["categories"],row.get("category_id"));item.payment_method=str(row.get("payment_method") or "pix");item.merchant=str(row.get("merchant") or "");item.account_id=_mapped(maps["accounts"],row.get("account_id"));item.end_month=row.get("end_month") or None;item.active=_bool(row.get("active"))
            maps["recurring_expenses"][_source_id(row)]=item.id

        # Recorrências de renda
        for row in _rows(data, "recurring_incomes"):
            desc=str(row.get("description") or "").strip();start=str(row.get("start_month") or "");day=int(row.get("expected_day") or 1)
            if not desc or not start: continue
            item=db.scalar(select(RecurringIncome).where(RecurringIncome.owner_id==owner_id,RecurringIncome.description==desc,RecurringIncome.start_month==start,RecurringIncome.expected_day==day))
            if not item:
                item=RecurringIncome(owner_id=owner_id,description=desc,start_month=start,expected_day=day,amount=_decimal(row.get("amount")));db.add(item);db.flush();counts["recurring_incomes"]+=1
            item.amount=_decimal(row.get("amount"));item.category_id=_mapped(maps["categories"],row.get("category_id"));item.account_id=_mapped(maps["accounts"],row.get("account_id"));item.notes=str(row.get("notes") or "");item.end_month=row.get("end_month") or None;item.active=_bool(row.get("active"))
            maps["recurring_incomes"][_source_id(row)]=item.id

        # Rendas
        for row in _rows(data, "incomes"):
            desc=str(row.get("description") or "").strip();expected=_date(row.get("expected_date"));ext=str(row.get("external_id") or "").strip() or None; amount=_decimal(row.get("amount_expected"))
            if not desc: continue
            item=db.scalar(select(Income).where(Income.owner_id==owner_id,Income.external_id==ext)) if ext else None
            if not item: item=db.scalar(select(Income).where(Income.owner_id==owner_id,Income.description==desc,Income.expected_date==expected,Income.amount_expected==amount))
            if not item:
                item=Income(owner_id=owner_id,description=desc,expected_date=expected,amount_expected=amount);db.add(item);counts["incomes"]+=1
            item.amount_expected=amount;item.amount_received=_decimal(row.get("amount_received"));item.received_date=_date(row.get("received_date")) if row.get("received_date") else None;item.status=str(row.get("status") or "pending");item.account_id=_mapped(maps["accounts"],row.get("account_id"));item.category_id=_mapped(maps["categories"],row.get("category_id"));item.notes=str(row.get("notes") or "");item.recurrence_id=_mapped(maps["recurring_incomes"],row.get("recurrence_id"));item.external_id=ext or item.external_id

        # Despesas
        for row in _rows(data, "expenses"):
            desc=str(row.get("description") or "").strip();due=_date(row.get("due_date"));purchase=_date(row.get("purchase_date"),due);amount=_decimal(row.get("amount"));ext=str(row.get("external_id") or "").strip() or None
            if not desc: continue
            item=db.scalar(select(Expense).where(Expense.owner_id==owner_id,Expense.external_id==ext)) if ext else None
            if not item:
                item=db.scalar(select(Expense).where(Expense.owner_id==owner_id,Expense.description==desc,Expense.due_date==due,Expense.amount==amount,Expense.installment_number==(int(row.get("installment_number")) if row.get("installment_number") else None)))
            if not item:
                item=Expense(owner_id=owner_id,description=desc,amount=amount,purchase_date=purchase,due_date=due,billing_month=str(row.get("billing_month") or due.strftime("%Y-%m")),list_month=due.strftime("%Y-%m"));db.add(item);counts["expenses"]+=1
            item.amount=amount;item.purchase_date=purchase;item.due_date=due;item.paid_date=_date(row.get("paid_date")) if row.get("paid_date") else None;item.category_id=_mapped(maps["categories"],row.get("category_id"));item.expense_type=str(row.get("expense_type") or "variable");item.payment_method=str(row.get("payment_method") or "pix");item.merchant=str(row.get("merchant") or "");item.notes=str(row.get("notes") or "");item.status=str(row.get("status") or "pending");item.account_id=_mapped(maps["accounts"],row.get("account_id"));item.card_id=_mapped(maps["cards"],row.get("card_id"));item.recurrence_id=_mapped(maps["recurring_expenses"],row.get("recurrence_id"));item.installment_group=row.get("installment_group") or None;item.installment_number=int(row.get("installment_number")) if row.get("installment_number") else None;item.total_installments=int(row.get("total_installments")) if row.get("total_installments") else None;item.billing_month=str(row.get("billing_month") or due.strftime("%Y-%m"));item.list_month=due.strftime("%Y-%m");item.external_id=ext or item.external_id

        # Empréstimos e parcelas
        for row in _rows(data, "loans"):
            creditor=str(row.get("creditor") or "").strip();first=_date(row.get("first_due_date"));total=_decimal(row.get("total_amount"))
            if not creditor: continue
            item=db.scalar(select(Loan).where(Loan.owner_id==owner_id,Loan.creditor==creditor,Loan.total_amount==total,Loan.first_due_date==first))
            if not item:
                item=Loan(owner_id=owner_id,creditor=creditor,principal_amount=_decimal(row.get("principal_amount")),total_amount=total,interest_rate=_decimal(row.get("interest_rate")),installment_count=int(row.get("installment_count") or 1),installment_amount=_decimal(row.get("installment_amount")),first_due_date=first,notes=str(row.get("notes") or ""),active=_bool(row.get("active")));db.add(item);db.flush();counts["loans"]+=1
            maps["loans"][_source_id(row)]=item.id
        for row in _rows(data,"loan_installments"):
            loan_id=_mapped(maps["loans"],row.get("loan_id"));num=int(row.get("installment_number") or 0)
            if not loan_id or not num: continue
            item=db.scalar(select(LoanInstallment).where(LoanInstallment.owner_id==owner_id,LoanInstallment.loan_id==loan_id,LoanInstallment.installment_number==num))
            if not item:
                item=LoanInstallment(owner_id=owner_id,loan_id=loan_id,installment_number=num,due_date=_date(row.get("due_date")),amount=_decimal(row.get("amount")));db.add(item);counts["loan_installments"]+=1
            item.due_date=_date(row.get("due_date"));item.amount=_decimal(row.get("amount"));item.status=str(row.get("status") or "pending");item.paid_date=_date(row.get("paid_date")) if row.get("paid_date") else None;item.account_id=_mapped(maps["accounts"],row.get("account_id"))

        for row in _rows(data,"budgets"):
            category_id=_mapped(maps["categories"],row.get("category_id"));month=str(row.get("month") or "")
            if not category_id or not month: continue
            item=db.scalar(select(Budget).where(Budget.owner_id==owner_id,Budget.month==month,Budget.category_id==category_id))
            if not item: item=Budget(owner_id=owner_id,month=month,category_id=category_id,limit_amount=_decimal(row.get("limit_amount")));db.add(item);counts["budgets"]+=1
            else: item.limit_amount=_decimal(row.get("limit_amount"))
        for row in _rows(data,"goals"):
            name=str(row.get("name") or "").strip()
            if not name: continue
            item=db.scalar(select(Goal).where(Goal.owner_id==owner_id,func.lower(Goal.name)==name.lower()))
            if not item: item=Goal(owner_id=owner_id,name=name,target_amount=_decimal(row.get("target_amount")));db.add(item);counts["goals"]+=1
            item.target_amount=_decimal(row.get("target_amount"));item.current_amount=_decimal(row.get("current_amount"));item.target_date=_date(row.get("target_date")) if row.get("target_date") else None;item.status=str(row.get("status") or "active")
        for row in _rows(data,"internal_transfers"):
            from_id=_mapped(maps["accounts"],row.get("from_account_id"));to_id=_mapped(maps["accounts"],row.get("to_account_id"));when=_date(row.get("transfer_date"));amount=_decimal(row.get("amount"))
            if not from_id or not to_id or from_id==to_id: continue
            item=db.scalar(select(InternalTransfer).where(InternalTransfer.owner_id==owner_id,InternalTransfer.from_account_id==from_id,InternalTransfer.to_account_id==to_id,InternalTransfer.transfer_date==when,InternalTransfer.amount==amount))
            if not item: db.add(InternalTransfer(owner_id=owner_id,from_account_id=from_id,to_account_id=to_id,amount=amount,transfer_date=when,notes=str(row.get("notes") or "")));counts["transfers"]+=1
        for row in _rows(data,"import_rules"):
            pattern=str(row.get("pattern") or "").strip();kind=str(row.get("kind") or "expense")
            if not pattern: continue
            item=db.scalar(select(ImportRule).where(ImportRule.owner_id==owner_id,func.lower(ImportRule.pattern)==pattern.lower(),ImportRule.kind==kind))
            if not item: item=ImportRule(owner_id=owner_id,pattern=pattern,kind=kind);db.add(item);counts["rules"]+=1
            item.category_id=_mapped(maps["categories"],row.get("category_id"));item.payment_method=str(row.get("payment_method") or "pix")

        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Não foi possível sincronizar os dados: {exc}") from exc

    return {"message":"Sincronização concluída", "backup": backup.name, "imported": counts, "source_created_at": payload.get("created_at")}
