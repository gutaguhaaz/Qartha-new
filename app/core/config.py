from pydantic import BaseModel
from pydantic_settings import BaseSettings
import os
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL",
                                  "postgresql://localhost:5432/qartha")
    STATIC_DIR: str = os.getenv("STATIC_DIR", "static")
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN",
                                 "qartha-admin-2025-secure-token")
    DEFAULT_CLUSTER: str = os.getenv("DEFAULT_CLUSTER", "Trinity")
    ALLOWED_CLUSTERS: List[str] = ["Trinity", "trk"]
    DEFAULT_PROJECT: str = os.getenv("DEFAULT_PROJECT", "Sabinas")
    PUBLIC_BASE_URL: str | None = os.getenv(
        "PUBLIC_BASE_URL",
        "https://65906d3e-61df-4f08-a529-69b0151d25b5-00-2xvkklizfouhp.riker.replit.dev/"
    )


settings = Settings()