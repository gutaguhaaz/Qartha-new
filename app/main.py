import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.mongo import ensure_indexes, seed_data, close_database
from app.routers import public_idfs, admin_idfs, assets, devices, qr


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directory exists
os.makedirs(settings.STATIC_DIR, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Include routers with /api prefix
app.include_router(public_idfs.router, prefix="/api")
app.include_router(admin_idfs.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(qr.router, prefix="/api")

# Mount frontend static files for deployment
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")

@app.get("/api")
async def root():
    return {"message": "Qartha Smart Inventory Network API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}