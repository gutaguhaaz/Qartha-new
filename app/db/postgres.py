"""PostgreSQL database helpers for FastAPI application."""
from __future__ import annotations

import json
from typing import Any, Sequence

from databases import Database

from app.core.config import settings

# ----------------------------------------------------------------------------
# Database connection
# ----------------------------------------------------------------------------

database = Database(settings.DATABASE_URL)


# ----------------------------------------------------------------------------
# DDL helpers
# ----------------------------------------------------------------------------

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'visitor')),
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
"""

CREATE_IDFS_TABLE = """
CREATE TABLE IF NOT EXISTS idfs (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(50) NOT NULL,
    project VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    site VARCHAR(255),
    room VARCHAR(255),
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    documents TEXT[] DEFAULT ARRAY[]::TEXT[],
    diagrams TEXT[] DEFAULT ARRAY[]::TEXT[],
    location TEXT,
    dfo TEXT[] DEFAULT ARRAY[]::TEXT[],
    logo TEXT,
    table_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cluster, project, code)
);
"""

CREATE_DEVICES_TABLE = """
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(50) NOT NULL,
    project VARCHAR(100) NOT NULL,
    idf_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial VARCHAR(255),
    rack VARCHAR(255),
    site VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

CREATE_DEVICES_INDEX = """
CREATE INDEX IF NOT EXISTS idx_devices_cluster_project_idf
    ON devices(cluster, project, idf_code);
"""

CREATE_IDFS_LOOKUP_INDEX = """
CREATE INDEX IF NOT EXISTS idx_idfs_cluster_project_code
    ON idfs(cluster, project, code);
"""


async def _create_tables() -> None:
    await database.execute(CREATE_USERS_TABLE)
    await database.execute(CREATE_IDFS_TABLE)
    await database.execute(CREATE_DEVICES_TABLE)


async def init_database() -> None:
    """Connect to the database and ensure tables exist."""
    if database.is_connected:
        return

    await database.connect()
    await _create_tables()


async def ensure_indexes() -> None:
    """Ensure auxiliary indexes exist."""
    if not database.is_connected:
        await database.connect()
    await database.execute(CREATE_DEVICES_INDEX)
    await database.execute(CREATE_IDFS_LOOKUP_INDEX)


async def close_database() -> None:
    """Close the database connection if it is open."""
    if database.is_connected:
        await database.disconnect()


# ----------------------------------------------------------------------------
# Seed helpers
# ----------------------------------------------------------------------------

async def _seed_default_admin() -> None:
    from app.core.security import hash_password

    user_exists = await database.fetch_val("SELECT COUNT(*) FROM users")
    if user_exists:
        return

    await database.execute(
        """
        INSERT INTO users (email, password_hash, role, full_name, is_active)
        VALUES (:email, :password_hash, :role, :full_name, :is_active)
        """,
        {
            "email": settings.DEFAULT_USER_EMAIL,
            "password_hash": hash_password(settings.DEFAULT_USER_PASSWORD),
            "role": "admin",
            "full_name": "Luis Gutierrez",
            "is_active": True,
        },
    )


SEED_IDFS: Sequence[dict[str, Any]] = (
    {
        "cluster": "Trinity",
        "project": "Sabinas Project",
        "code": "IDF-1001",
        "title": "Sabinas HQ - Main IDF",
        "description": "Principal rack de distribución para operaciones Sabinas.",
        "site": "TrinityRail HQ",
        "room": "Rack A",
        "images": [],
        "documents": [],
        "diagrams": ["Trinity/sabinas/IDF-1001/diagrams/diagram.png"],
        "location": "Trinity/sabinas/IDF-1001/location/location.png",
        "dfo": ["Trinity/sabinas/IDF-1001/dfo/dfo.png"],
        "logo": "Trinity/sabinas/IDF-1001/logo/logo.png",
        "table_data": {
            "columns": [
                {"key": "tray", "label": "Charola", "type": "text"},
                {"key": "panel", "label": "Panel", "type": "text"},
                {"key": "port", "label": "Puerto", "type": "number"},
                {
                    "key": "status",
                    "label": "Estado",
                    "type": "status",
                    "options": ["OK", "Revisión", "Falla", "Libre", "Reservado"],
                },
            ],
            "rows": [
                {
                    "tray": "T-01",
                    "panel": "PP-A1",
                    "port": 1,
                    "status": "OK",
                }
            ],
        },
    },
    {
        "cluster": "Trinity",
        "project": "Sabinas Project",
        "code": "IDF-1002",
        "title": "Sabinas HQ - Backup",
        "description": "Nodo redundante para continuidad operativa.",
        "site": "TrinityRail HQ",
        "room": "Rack B",
        "images": [],
        "documents": [],
        "diagrams": [],
        "location": None,
        "dfo": [],
        "logo": None,
        "table_data": None,
    },
)


async def _seed_idfs() -> None:
    count = await database.fetch_val("SELECT COUNT(*) FROM idfs")
    if count:
        return

    insert_query = """
        INSERT INTO idfs (
            cluster, project, code, title, description, site, room,
            images, documents, diagrams, location, dfo, logo, table_data
        ) VALUES (
            :cluster, :project, :code, :title, :description, :site, :room,
            :images, :documents, :diagrams, :location, :dfo, :logo, :table_data
        )
    """

    for record in SEED_IDFS:
        payload = {**record}
        payload["table_data"] = (
            json.dumps(record.get("table_data")) if record.get("table_data") else None
        )
        await database.execute(insert_query, payload)


async def seed_data() -> None:
    """Populate the database with initial data when empty."""
    await _seed_default_admin()
    await _seed_idfs()


__all__ = [
    "database",
    "init_database",
    "ensure_indexes",
    "seed_data",
    "close_database",
]
