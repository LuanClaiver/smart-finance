from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from ..dependencies import require_admin
from ..models import User
from ..services.backup import create_backup, create_database_export, list_backups

router = APIRouter(prefix="/api/backups", tags=["Backups"])


@router.get("")
def backups(_admin: User = Depends(require_admin)):
    return list_backups()


@router.post("")
def manual_backup(_admin: User = Depends(require_admin)):
    path = create_backup(force=True)
    return {"message": "Backup criado", "name": path.name}


@router.get("/export-database")
def export_database(_admin: User = Depends(require_admin)):
    path = create_database_export()
    timestamp = path.stem.removeprefix(".smart-finance-export-")
    return FileResponse(
        path,
        media_type="application/vnd.sqlite3",
        filename=f"smart-finance-{timestamp}.db",
        background=BackgroundTask(path.unlink, missing_ok=True),
    )
