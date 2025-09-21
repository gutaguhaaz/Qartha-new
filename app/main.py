import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db import close_database, ensure_indexes, init_database, seed_data
from app.db.database import database
from app.routers import admin_idfs, assets, auth, devices, public_idfs, qr


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_database()
    await ensure_indexes()
    await seed_data()
    yield
    # Shutdown
    await close_database()


app = FastAPI(
    title="Qartha Smart Inventory Network",
    description="Multi-tenant IDF directory management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo purposes
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Ensure static directory exists
os.makedirs(settings.STATIC_DIR, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(public_idfs.router, prefix="/api")
app.include_router(admin_idfs.router, prefix="/api/admin")
app.include_router(assets.router, prefix="/api")
app.include_router(qr.router, prefix="/api")
app.include_router(devices.router, prefix="/api")

# Debug endpoint to check available IDFs
@app.get("/api/debug/idfs")
async def debug_idfs():
    """Debug endpoint to see all IDFs in database"""
    rows = await database.fetch_all("SELECT cluster, project, code, title FROM idfs LIMIT 20")
    return [dict(row) for row in rows]

# Mount frontend static files for deployment
if os.path.exists("dist") and os.path.exists("dist/index.html"):
    # Mount static assets only if the assets directory exists
    if os.path.exists("dist/assets"):
        app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

    # Catch-all route for SPA - must be last
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If it's an API route, let it 404 naturally
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")

        # For all other routes, serve the SPA
        return FileResponse("dist/index.html")

@app.get("/api")
@app.head("/api")
async def root():
    return {"message": "Qartha Smart Inventory Network API"}


@app.get("/health")
@app.head("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}