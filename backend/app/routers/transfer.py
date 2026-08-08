from __future__ import annotations

import json
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from ..database import STORAGE_DIR, get_db
from ..dependencies import resolve_owner_id
from ..models import (
    Account,
    Card,
    Category,
    Expense,
    Income,
    Loan,
    LoanInstallment,
    RecurringExpense,
    User,
)

router = APIRouter(prefix="/api/transfer", tags=["Transferência"])


def _owned_rows(db: Session, model, owner_id: int):
    return list(db.scalars(select(model).where(model.owner_id == owner_id)).all())


def _safe_attachment(item: Expense) -> tuple[Path, str] | None:
    if not item.attachment_path:
        return None

    storage_root = STORAGE_DIR.resolve()
    target = (STORAGE_DIR / Path(item.attachment_path)).resolve()

    try:
        target.relative_to(storage_root)
    except ValueError:
        return None

    if not target.is_file():
        return None

    suffix = target.suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".pdf"}:
        return None

    archive_name = str(PurePosixPath("comprovantes") / f"expense-{item.id}{suffix}")
    return target, archive_name


@router.get("/export")
def export_transfer_package(
    owner_id: int = Depends(resolve_owner_id),
    db: Session = Depends(get_db),
):
    owner = db.get(User, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    expense_rows: list[dict] = []
    attachments: list[tuple[Path, str]] = []

    for item in _owned_rows(db, Expense, owner_id):
        row = jsonable_encoder(item)
        row["attachment_path"] = None
        row["attachment_file"] = None

        attachment = _safe_attachment(item)
        if attachment:
            source, archive_name = attachment
            row["attachment_file"] = archive_name
            attachments.append((source, archive_name))

        expense_rows.append(row)

    payload = {
        "format": "smart-finance-transfer",
        "version": 1,
        "created_at": datetime.now().isoformat(),
        "application_version": "0.4.3",
        "profile": {
            "username": owner.username,
            "display_name": owner.display_name,
            "email": owner.email,
        },
        "data": {
            "categories": jsonable_encoder(_owned_rows(db, Category, owner_id)),
            "accounts": jsonable_encoder(_owned_rows(db, Account, owner_id)),
            "cards": jsonable_encoder(_owned_rows(db, Card, owner_id)),
            "incomes": jsonable_encoder(_owned_rows(db, Income, owner_id)),
            "recurring_expenses": jsonable_encoder(
                _owned_rows(db, RecurringExpense, owner_id)
            ),
            "expenses": expense_rows,
            "loans": jsonable_encoder(_owned_rows(db, Loan, owner_id)),
            "loan_installments": jsonable_encoder(
                _owned_rows(db, LoanInstallment, owner_id)
            ),
        },
    }

    temporary = tempfile.NamedTemporaryFile(
        prefix=".smart-finance-transfer-",
        suffix=".zip",
        delete=False,
    )
    temporary_path = Path(temporary.name)
    temporary.close()

    try:
        with zipfile.ZipFile(
            temporary_path,
            mode="w",
            compression=zipfile.ZIP_STORED,
        ) as archive:
            archive.writestr(
                "dados.json",
                json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
            )
            for source, archive_name in attachments:
                archive.write(source, archive_name)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    return FileResponse(
        temporary_path,
        media_type="application/zip",
        filename=f"smart-finance-transferencia-{timestamp}.zip",
        background=BackgroundTask(temporary_path.unlink, missing_ok=True),
    )
