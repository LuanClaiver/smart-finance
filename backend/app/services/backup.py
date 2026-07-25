from __future__ import annotations

import sqlite3
import zipfile
from datetime import datetime
from pathlib import Path

from ..database import BACKUPS_DIR, DATABASE_PATH, STORAGE_DIR


def _consistent_database_copy(target: Path) -> None:
    source_connection = sqlite3.connect(DATABASE_PATH)
    destination_connection = sqlite3.connect(target)
    try:
        source_connection.backup(destination_connection)
    finally:
        destination_connection.close()
        source_connection.close()


def create_database_export() -> Path:
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    target = BACKUPS_DIR / f".smart-finance-export-{timestamp}.db"
    _consistent_database_copy(target)
    return target


def create_backup(force: bool = False) -> Path:
    today = datetime.now().strftime("%Y-%m-%d")
    existing = sorted(BACKUPS_DIR.glob(f"smart-finance-{today}*.zip"))
    if existing and not force:
        return existing[-1]
    suffix = datetime.now().strftime("-%H%M%S") if force else ""
    target = BACKUPS_DIR / f"smart-finance-{today}{suffix}.zip"
    temporary_database = BACKUPS_DIR / ".smart-finance-backup.db"
    if DATABASE_PATH.exists():
        _consistent_database_copy(temporary_database)
    try:
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
            if temporary_database.exists():
                archive.write(temporary_database, "data/smart_finance.db")
            if STORAGE_DIR.exists():
                for file in STORAGE_DIR.rglob("*"):
                    if file.is_file() and file.name != ".gitkeep":
                        archive.write(file, Path("storage") / file.relative_to(STORAGE_DIR))
    finally:
        temporary_database.unlink(missing_ok=True)
    _prune_backups(30)
    return target


def _prune_backups(keep: int) -> None:
    backups = sorted(BACKUPS_DIR.glob("smart-finance-*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in backups[keep:]:
        old.unlink(missing_ok=True)


def list_backups() -> list[dict]:
    result = []
    for file in sorted(BACKUPS_DIR.glob("smart-finance-*.zip"), reverse=True):
        result.append({"name": file.name, "size": file.stat().st_size, "created_at": datetime.fromtimestamp(file.stat().st_mtime)})
    return result
