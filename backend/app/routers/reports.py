from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import resolve_owner_id
from ..services.reports import build_monthly_pdf

router = APIRouter(prefix="/api/reports", tags=["Relatórios"])


@router.get("/monthly.pdf")
def monthly_pdf(month: str, owner_id: int = Depends(resolve_owner_id), db: Session = Depends(get_db)):
    content = build_monthly_pdf(db, owner_id, month)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="smart-finance-{month}.pdf"'},
    )
