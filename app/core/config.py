from pydantic import BaseModel
from pydantic_settings import BaseSettings
import os
from typing import List, Optional


class Settings:
    # Database
    MONGO_URL_ATLAS: str = "mongodb://localhost:27017"
    DB_NAME: str = "qartha"
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/qartha"

    # Static files
    STATIC_DIR: str = "static"

    # Admin
    ADMIN_TOKEN: str = "changeme-demo-token"

    # Multi-tenant
    DEFAULT_CLUSTER: str = "trk"
    ALLOWED_CLUSTERS: List[str] = ["trk", "lab", "Trinity"]
    DEFAULT_PROJECT: str = "trinity"

    # Optional: for QR codes in production
    PUBLIC_BASE_URL: Optional[str] = None


settings = Settings()