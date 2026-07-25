from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import require_admin
from ..models import User
from ..services.backup import create_backup, list_backups

router = APIRouter(prefix="/api/backups", tags=["Backups"])


@router.get("")
def backups(_admin: User = Depends(require_admin)):
    return list_backups()


@router.post("")
def manual_backup(_admin: User = Depends(require_admin)):
    path = create_backup(force=True)
    return {"message": "Backup criado", "name": path.name}
