from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine
from .routers import admin, auth, backups, finance, reports
from .services.backup import create_backup
from .services.mdns import MdnsAnnouncer
from .services.migrations import run_migrations
from .services.seed import seed_admin

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
mdns = MdnsAnnouncer(port=int(os.getenv("SMART_FINANCE_PORT", "8000")))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    with SessionLocal() as db:
        seed_admin(db)
    try:
        create_backup(force=False)
    except Exception as exc:
        print(f"[Backup] Falha ao criar backup diário: {exc}")
    mdns.start()
    yield
    mdns.stop()


app = FastAPI(title="Smart Finance API", version="0.2.6", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def disable_frontend_cache(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/") or path == "/" or path.endswith("index.html") or path.startswith("/assets/") or path.startswith("/runtime-patch-"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(finance.router)
app.include_router(reports.router)
app.include_router(backups.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Smart Finance", "version": "0.2.6"}


if FRONTEND_DIST.exists():
    assets = FRONTEND_DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    from fastapi.responses import HTMLResponse

    @app.get("/", include_in_schema=False, response_class=HTMLResponse)
    def no_frontend():
        return """<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Smart Finance</title><style>body{font-family:Segoe UI,Arial;background:#06120c;color:#e8fff0;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:680px;background:#0d2116;border:1px solid #245c39;border-radius:18px;padding:28px}code{color:#63e693}</style></head><body><div class='box'><h1>Interface não encontrada</h1><p>O backend está funcionando, mas a pasta compilada do frontend não foi localizada.</p><p>Extraia novamente o ZIP completo ou execute <code>npm install</code> e <code>npm run build</code> dentro da pasta <code>frontend</code>.</p></div></body></html>"""
