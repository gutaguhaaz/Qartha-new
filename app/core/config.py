from pydantic import BaseModel
from pydantic_settings import BaseSettings
import os
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/qartha")
    STATIC_DIR: str = os.getenv("STATIC_DIR", "static")
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "changeme-demo-token")
    DEFAULT_CLUSTER: str = os.getenv("DEFAULT_CLUSTER", "trk")
    ALLOWED_CLUSTERS: list[str] = os.getenv("ALLOWED_CLUSTERS", "trk,lab,alpha").split(",")
    DEFAULT_PROJECT: str = os.getenv("DEFAULT_PROJECT", "trinity")
    PUBLIC_BASE_URL: str | None = os.getenv("PUBLIC_BASE_URL")


settings = Settings()