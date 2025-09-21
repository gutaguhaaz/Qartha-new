import sys
import types
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

bcrypt_stub = types.SimpleNamespace()

def _hashpw(password: bytes, _salt: bytes) -> bytes:
    return password + b"-hashed"


def _gensalt() -> bytes:
    return b"salt"


def _checkpw(password: bytes, hashed: bytes) -> bool:
    return hashed == password + b"-hashed"


bcrypt_stub.hashpw = _hashpw
bcrypt_stub.gensalt = _gensalt
bcrypt_stub.checkpw = _checkpw

sys.modules.setdefault("bcrypt", bcrypt_stub)

import pydantic.networks

pydantic.networks.import_email_validator = lambda: None
pydantic.networks.validate_email = lambda value, *args, **kwargs: (value, value)

jwt_stub = types.SimpleNamespace()

jwt_stub.encode = lambda data, secret, algorithm=None: "token"


def _decode(_token: str, _secret: str, algorithms=None):
    return {"sub": "1"}


jwt_stub.decode = _decode
jwt_stub.ExpiredSignatureError = Exception
jwt_stub.InvalidTokenError = Exception

sys.modules.setdefault("jwt", jwt_stub)

from app.models.idf_models import IdfCreate
from app.routers.admin_idfs import create_idf


def test_create_idf_success(monkeypatch):
    async def fake_fetch_one(query, values=None):
        if "SELECT 1 FROM idfs" in query:
            return None
        if "RETURNING *" in query:
            assert values is not None
            return {
                "cluster": values["cluster"],
                "project": values["project"],
                "code": values["code"],
                "title": values["title"],
                "description": values.get("description"),
                "site": values.get("site"),
                "room": values.get("room"),
                "gallery": [],
                "documents": [],
                "diagrams": [],
                "location": [],
                "dfo": None,
                "table_data": None,
                "media": None,
            }
        raise AssertionError(f"Unexpected query: {query}")

    monkeypatch.setattr("app.routers.admin_idfs.database.fetch_one", fake_fetch_one)

    payload = IdfCreate(code="IDF1", title="Title", site="Site", room="Room")

    result = asyncio.run(create_idf(payload, cluster="trk", project="proj", _admin={"role": "admin"}))

    assert result.code == "IDF1"
    assert result.title == "Title"
    assert result.site == "Site"


def test_create_idf_duplicate(monkeypatch):
    async def fake_fetch_one(query, values=None):
        if "SELECT 1 FROM idfs" in query:
            return {"code": "IDF1"}
        return None

    monkeypatch.setattr("app.routers.admin_idfs.database.fetch_one", fake_fetch_one)

    payload = IdfCreate(code="IDF1", title="Title", site="Site")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(create_idf(payload, cluster="trk", project="proj", _admin={"role": "admin"}))

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "IDF already exists"
