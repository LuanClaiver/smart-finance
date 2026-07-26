from __future__ import annotations

from pathlib import Path
import os
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from ..dependencies import require_admin, require_admin_without_open_session
from ..models import User
from ..services.backup import (
    cleanup_sqlite_temporary_files,
    create_backup,
    create_database_export,
    import_database_now,
    list_backups,
    managed_restart_enabled,
    schedule_managed_restart,
)

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
        background=BackgroundTask(cleanup_sqlite_temporary_files, path),
    )


@router.post("/import-database")
async def import_database(
    upload: UploadFile = File(...),
    _admin: None = Depends(require_admin_without_open_session),
):
    suffix = Path(upload.filename or "smart_finance.db").suffix or ".db"
    file_descriptor, temporary_name = tempfile.mkstemp(prefix="smart-finance-upload-", suffix=suffix)
    temp_path = Path(temporary_name)

    try:
        with os.fdopen(file_descriptor, "wb") as temp_file:
            while chunk := await upload.read(1024 * 1024):
                temp_file.write(chunk)
            temp_file.flush()

        backup_path = import_database_now(temp_path)
        automatic_restart = managed_restart_enabled()

        if automatic_restart:
            # O timer é independente da resposta HTTP. O navegador recebe o
            # sucesso primeiro; só depois o processo encerra com código 75 e o
            # .bat inicia o servidor novamente.
            schedule_managed_restart(delay_seconds=3.0)
            message = "Banco importado com sucesso. O Smart Finance será reiniciado automaticamente."
        else:
            message = "Banco importado com sucesso. Reinicie o Smart Finance para concluir a atualização."

        return {
            "message": message,
            "restart_required": True,
            "automatic_restart": automatic_restart,
            "safety_backup": backup_path.name,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Banco] Falha real na importação: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao importar o banco ({type(exc).__name__}): {exc}",
        ) from exc
    finally:
        try:
            await upload.close()
        except Exception as exc:
            print(f"[Banco] Aviso ao fechar upload temporário: {exc}")
        # A limpeza jamais pode transformar uma importação bem-sucedida em
        # erro 500. Em caso de bloqueio temporário, a função apenas registra.
        cleanup_sqlite_temporary_files(temp_path)
