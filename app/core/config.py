from pydantic import BaseModel
from pydantic_settings import BaseSettings
import os
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL_PROD") or os.getenv(
        "DATABASE_URL", "postgresql://localhost:5432/qartha")
    STATIC_DIR: str = os.getenv("STATIC_DIR", "static")
    DEFAULT_CLUSTER: str = os.getenv("DEFAULT_CLUSTER", "Trinity")
    ALLOWED_CLUSTERS: List[str] = ["Trinity"]
    DEFAULT_PROJECT: str = os.getenv("DEFAULT_PROJECT", "Sabinas")
    PUBLIC_BASE_URL: str | None = os.getenv(
        "PUBLIC_BASE_URL",
        "https://65906d3e-61df-4f08-a529-69b0151d25b5-00-2xvkklizfouhp.riker.replit.dev/"
    )

    # JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change_me_in_production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

    # Default user credentials
    DEFAULT_USER_EMAIL: str = os.getenv("DEFAULT_USER_EMAIL",
                                        "lgutierrez@example.com")
    DEFAULT_USER_PASSWORD: str = os.getenv("DEFAULT_USER_PASSWORD",
                                           "123456789")


settings = Settings()
