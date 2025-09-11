import os
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.mongo import ensure_indexes, seed_data, close_database, init_database, DATABASE_URL

# Import routers with error handling
try:
    print(f"Starting app with DATABASE_URL: {DATABASE_URL[:50]}...")  # Mask sensitive parts
    print("Importing routers...")
    # from app.routers import assets, devices, qr, public_idfs, admin_idfs
    # Temporarily disable router imports to isolate the issue
    print("Routers temporarily disabled for debugging")
except Exception as e:
    print(f"Router import failed: {e}")
    traceback.print_exc()
    raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("Starting database initialization...")
        # Startup
        await init_database() # Call init_database here
        print("Database initialized successfully")
        
        await ensure_indexes()
        print("Indexes ensured successfully")
        
        await seed_data()
        print("Data seeded successfully")
        
        print("FastAPI startup completed successfully")
    except Exception as e:
        print(f"Startup failed: {e}")
        traceback.print_exc()
        raise
    
    yield
    
    try:
        # Shutdown
        await close_database()
        print("Database closed successfully")
    except Exception as e:
        print(f"Shutdown error: {e}")
        traceback.print_exc()


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

# Include routers with /api prefix - temporarily disabled for debugging
print("Skipping router registration for debugging")
# app.include_router(public_idfs.router, prefix="/api")
# app.include_router(admin_idfs.router, prefix="/api/admin")
# app.include_router(devices.router, prefix="/api")
# app.include_router(assets.router, prefix="/api")
# app.include_router(qr.router, prefix="/api")

# Mount frontend static files for deployment - DISABLED to prevent shadowing API routes
# if os.path.exists("dist"):
#     app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")
print("Static file mount at root disabled to prevent API route shadowing")

@app.get("/api")
async def root():
    return {"message": "Qartha Smart Inventory Network API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}