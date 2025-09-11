# Database package exposing connection and initialization helpers
from .database import (
    database,
    init_database,
    ensure_indexes,
    seed_data,
    close_database,
)

__all__ = [
    "database",
    "init_database",
    "ensure_indexes",
    "seed_data",
    "close_database",
]
