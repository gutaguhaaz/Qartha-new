import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import admin_idfs


def create_test_app() -> TestClient:
    app = FastAPI()
    app.include_router(admin_idfs.router, prefix="/api")
    return TestClient(app)


def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer qartha-admin-2025-secure-token"}


@pytest.mark.asyncio
async def test_create_idf_success(mocker):
    client = create_test_app()

    async def fake_fetch_one(query, values=None):
        if "SELECT" in query:
            return None
        return {
            "cluster": "trk",
            "project": "proj",
            "code": "IDF1",
            "title": "Title",
            "description": None,
            "site": "Site",
            "room": "Room",
            "gallery": "[]",
            "documents": "[]",
            "diagram": None,
            "table_data": None,
        }

    mocker.patch("app.routers.admin_idfs.database.fetch_one", side_effect=fake_fetch_one)

    payload = {"code": "IDF1", "title": "Title", "site": "Site", "room": "Room"}
    response = client.post("/api/trk/proj/idfs", json=payload, headers=auth_headers())
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "IDF1"
    assert data["title"] == "Title"


@pytest.mark.asyncio
async def test_create_idf_duplicate(mocker):
    client = create_test_app()

    async def fake_fetch_one(query, values=None):
        if "SELECT" in query:
            return {"code": "IDF1"}
        return None

    mocker.patch("app.routers.admin_idfs.database.fetch_one", side_effect=fake_fetch_one)

    payload = {"code": "IDF1", "title": "Title", "site": "Site"}
    response = client.post("/api/trk/proj/idfs", json=payload, headers=auth_headers())
    assert response.status_code == 409
