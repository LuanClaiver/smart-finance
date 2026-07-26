from __future__ import annotations

import os
import shutil
import sqlite3
import threading
import time
import zipfile
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator

from ..database import BACKUPS_DIR, DATABASE_PATH, DATA_DIR, STORAGE_DIR, engine

PENDING_IMPORT_PATH = DATA_DIR / ".smart-finance-import-pending.db"
PENDING_IMPORT_INFO_PATH = DATA_DIR / ".smart-finance-import-pending.txt"
RESTART_EXIT_CODE = 75


@contextmanager
def _sqlite_connection(path: Path, *, timeout: int = 60) -> Iterator[sqlite3.Connection]:
    """Abre e SEMPRE fecha uma conexão SQLite.

    O gerenciador de contexto nativo de sqlite3 faz commit/rollback, mas não
    garante o fechamento explícito do handle. No Windows isso pode manter o
    arquivo bloqueado durante importações e exclusões temporárias.
    """
    connection = sqlite3.connect(str(path.resolve()), timeout=timeout)
    try:
        yield connection
    finally:
        connection.close()


def _sqlite_sidecars(path: Path) -> tuple[Path, ...]:
    return tuple(Path(f"{path}{suffix}") for suffix in ("-wal", "-shm", "-journal"))


def _safe_unlink(path: Path, *, attempts: int = 8, delay: float = 0.15) -> None:
    """Remove arquivo temporário sem mascarar a resposta da API.

    Antivírus e o próprio Windows podem segurar um handle por alguns
    milissegundos. Fazemos tentativas curtas e, se ainda estiver ocupado,
    deixamos a limpeza para a próxima inicialização.
    """
    for attempt in range(attempts):
        try:
            path.unlink(missing_ok=True)
            return
        except PermissionError:
            if attempt == attempts - 1:
                print(f"[Banco] Aviso: não foi possível remover o temporário {path}")
                return
            time.sleep(delay)
        except OSError as exc:
            print(f"[Banco] Aviso ao remover temporário {path}: {exc}")
            return


def cleanup_sqlite_temporary_files(path: Path) -> None:
    _safe_unlink(path)
    for sidecar in _sqlite_sidecars(path):
        _safe_unlink(sidecar)


def _prepare_standalone_database(path: Path) -> None:
    """Consolida o banco em um único .db, sem dependência de WAL/SHM."""
    with _sqlite_connection(path) as connection:
        connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        # Exportações/importações precisam ser arquivos únicos. DELETE evita
        # que parte dos dados fique em um arquivo -wal separado.
        connection.execute("PRAGMA journal_mode=DELETE")
        connection.execute("PRAGMA synchronous=FULL")
        connection.commit()


def _consistent_database_copy(target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    cleanup_sqlite_temporary_files(target)

    with _sqlite_connection(DATABASE_PATH) as source_connection:
        with _sqlite_connection(target) as destination_connection:
            source_connection.backup(destination_connection)
            destination_connection.commit()

    _prepare_standalone_database(target)


def create_database_export() -> Path:
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M%S-%f")
    target = BACKUPS_DIR / f".smart-finance-export-{timestamp}.db"
    _consistent_database_copy(target)
    return target


def create_backup(force: bool = False) -> Path:
    today = datetime.now().strftime("%Y-%m-%d")
    existing = sorted(BACKUPS_DIR.glob(f"smart-finance-{today}*.zip"))
    if existing and not force:
        return existing[-1]

    # Microssegundos evitam colisão quando o usuário clica rapidamente.
    suffix = datetime.now().strftime("-%H%M%S-%f") if force else ""
    target = BACKUPS_DIR / f"smart-finance-{today}{suffix}.zip"
    temporary_database = BACKUPS_DIR / f".smart-finance-backup-{os.getpid()}-{threading.get_ident()}.db"

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
        cleanup_sqlite_temporary_files(temporary_database)

    _prune_backups(30)
    return target


def _prune_backups(keep: int) -> None:
    backups = sorted(BACKUPS_DIR.glob("smart-finance-*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in backups[keep:]:
        _safe_unlink(old)


def list_backups() -> list[dict]:
    result = []
    for file in sorted(BACKUPS_DIR.glob("smart-finance-*.zip"), reverse=True):
        result.append(
            {
                "name": file.name,
                "size": file.stat().st_size,
                "created_at": datetime.fromtimestamp(file.stat().st_mtime),
            }
        )
    return result


def _validate_database_file(source_file: Path) -> None:
    if not source_file.exists() or source_file.stat().st_size == 0:
        raise ValueError("O arquivo enviado está vazio ou não foi encontrado.")

    try:
        with _sqlite_connection(source_file) as connection:
            connection.execute("PRAGMA query_only=ON")
            check = connection.execute("PRAGMA quick_check").fetchone()
            if not check or str(check[0]).lower() != "ok":
                raise ValueError("O banco selecionado está corrompido ou incompleto.")
            tables = {
                str(row[0])
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            if "users" not in tables:
                raise ValueError(
                    "O arquivo não pertence ao Smart Finance: a tabela de usuários não foi encontrada."
                )
    except ValueError:
        raise
    except sqlite3.DatabaseError as exc:
        raise ValueError(
            "O arquivo selecionado não é um banco SQLite válido do Smart Finance."
        ) from exc


def _restore_database_with_sqlite_backup(source_file: Path) -> None:
    """Restaura pelo mecanismo oficial de backup do SQLite.

    Não substitui o arquivo smart_finance.db com os.replace. Assim, a operação
    não depende de desbloquear/renomear o arquivo no Windows.
    """
    engine.dispose(close=True)

    with _sqlite_connection(source_file) as source_connection:
        source_connection.execute("PRAGMA query_only=ON")
        with _sqlite_connection(DATABASE_PATH) as destination_connection:
            source_connection.backup(destination_connection, pages=256, sleep=0.05)
            destination_connection.commit()

    _prepare_standalone_database(DATABASE_PATH)
    engine.dispose(close=True)


def import_database_now(source_file: Path) -> Path:
    """Valida, cria backup de segurança e importa o .db imediatamente."""
    if source_file.suffix.lower() != ".db":
        raise ValueError("Selecione um arquivo .db válido.")

    _validate_database_file(source_file)
    safety_backup = create_backup(force=True)

    # Cópia local autônoma: evita depender do arquivo temporário do upload e
    # consolida qualquer WAL antes da restauração.
    prepared_source = DATA_DIR / f".smart-finance-import-source-{os.getpid()}-{threading.get_ident()}.db"
    rollback_source = DATA_DIR / f".smart-finance-import-rollback-{os.getpid()}-{threading.get_ident()}.db"
    cleanup_sqlite_temporary_files(prepared_source)
    cleanup_sqlite_temporary_files(rollback_source)

    try:
        with _sqlite_connection(source_file) as source_connection:
            with _sqlite_connection(prepared_source) as prepared_connection:
                source_connection.backup(prepared_connection)
                prepared_connection.commit()
        _prepare_standalone_database(prepared_source)
        _validate_database_file(prepared_source)

        # Mantém também uma cópia SQLite simples para rollback automático caso
        # a escrita do novo banco falhe no meio da operação.
        _consistent_database_copy(rollback_source)

        try:
            _restore_database_with_sqlite_backup(prepared_source)
            _validate_database_file(DATABASE_PATH)
        except Exception:
            print("[Banco] A importação falhou; restaurando automaticamente o banco anterior.")
            _restore_database_with_sqlite_backup(rollback_source)
            raise

        return safety_backup
    finally:
        cleanup_sqlite_temporary_files(prepared_source)
        cleanup_sqlite_temporary_files(rollback_source)


def managed_restart_enabled() -> bool:
    return os.getenv("SMART_FINANCE_MANAGED_LAUNCH", "").strip() == "1"


def _exit_after_delay(delay_seconds: float) -> None:
    time.sleep(delay_seconds)
    os._exit(RESTART_EXIT_CODE)


def schedule_managed_restart(delay_seconds: float = 2.5) -> None:
    """Agenda a saída somente depois de a resposta HTTP chegar ao navegador."""
    thread = threading.Thread(
        target=_exit_after_delay,
        args=(delay_seconds,),
        name="smart-finance-managed-restart",
        daemon=True,
    )
    thread.start()


# Compatibilidade com uma importação que possa ter ficado pendente na 0.4.0.
def apply_pending_database_import() -> bool:
    if not PENDING_IMPORT_PATH.exists():
        return False

    _validate_database_file(PENDING_IMPORT_PATH)
    _restore_database_with_sqlite_backup(PENDING_IMPORT_PATH)
    return True


def finalize_pending_database_import() -> None:
    cleanup_sqlite_temporary_files(PENDING_IMPORT_PATH)
    _safe_unlink(PENDING_IMPORT_INFO_PATH)


# Nomes antigos mantidos para evitar erro em algum script legado.
def stage_database_import(source_file: Path) -> Path:
    import_database_now(source_file)
    return DATABASE_PATH


def exit_for_managed_restart() -> None:
    schedule_managed_restart()
