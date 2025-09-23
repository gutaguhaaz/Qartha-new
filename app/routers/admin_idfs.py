"""Administrative endpoints for creating and updating IDFs."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.db.database import database
from app.models.idf_models import IdfCreate, IdfPublic, IdfUpsert, MediaItem
from app.routers.auth import get_current_admin

router = APIRouter(tags=["admin"])


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def validate_cluster(cluster: str) -> str:
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def map_url_project_to_db_project(project: str) -> str:
    import urllib.parse

    decoded_project = urllib.parse.unquote(project)
    project_mapping = {
        "sabinas": "Sabinas Project",
        "Sabinas": "Sabinas Project",
        "Sabinas Project": "Sabinas Project",
        "Sabinas%20Project": "Sabinas Project",
        "trinity": "Trinity",
        "Trinity": "Trinity",
        "trinity/sabinas": "Sabinas Project",
        "sabinas/trinity": "Sabinas Project",
    }
    return project_mapping.get(decoded_project, decoded_project)


def _serialize_media_list(items: Optional[list[MediaItem]]) -> str:
    payload = items or []
    return json.dumps([item.model_dump() for item in payload])


def _serialize_optional_media(item: Optional[MediaItem]) -> Optional[str]:
    if not item:
        return None
    return json.dumps(item.model_dump())


def _serialize_table(table: Optional[Any]) -> Optional[str]:
    if not table:
        return None
    return json.dumps(table.model_dump())


def _prepare_common_values(data: IdfUpsert) -> Dict[str, Any]:
    return {
        "title": data.title,
        "description": data.description,
        "site": data.site,
        "room": data.room,
        "gallery": _serialize_media_list(data.gallery),
        "documents": _serialize_media_list(data.documents),
        "diagrams": _serialize_media_list(data.diagrams),
        "location": _serialize_media_list(data.location),
        "dfo": _serialize_optional_media(data.dfo),
        "table_data": _serialize_table(data.table),
    }


def _load_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return value


def _row_to_idf_public(row: Dict[str, Any]) -> IdfPublic:
    gallery = _load_json(row.get("gallery")) or []
    documents = _load_json(row.get("documents")) or []
    diagrams = _load_json(row.get("diagrams")) or []
    location_list = _load_json(row.get("location")) or []
    dfo_data = _load_json(row.get("dfo"))
    table_data = _load_json(row.get("table_data"))
    media_data = _load_json(row.get("media"))

    return IdfPublic(
        cluster=row["cluster"],
        project=row["project"],
        code=row["code"],
        title=row.get("title", ""),
        description=row.get("description"),
        site=row.get("site"),
        room=row.get("room"),
        gallery=gallery,
        documents=documents,
        diagrams=diagrams,
        dfo=dfo_data if isinstance(dfo_data, dict) else None,
        location=location_list[0] if location_list else None,
        location_items=location_list if isinstance(location_list, list) else [],
        table=table_data if isinstance(table_data, dict) else None,
        media=media_data if isinstance(media_data, dict) else None,
    )


async def _fetch_idf(cluster: str, project: str, code: str) -> Dict[str, Any]:
    row = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code},
    )
    if not row:
        raise HTTPException(status_code=404, detail="IDF not found")
    return dict(row)


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------


# Admin endpoints - these are mounted under /api/admin prefix
@router.post("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def create_idf_with_code(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)

    existing = await database.fetch_one(
        "SELECT 1 FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )
    if existing:
        raise HTTPException(status_code=409, detail="IDF already exists")

    values = {
        "cluster": cluster,
        "project": db_project,
        "code": code,
        **_prepare_common_values(idf_data),
    }

    query = """
        INSERT INTO idfs (
            cluster, project, code, title, description, site, room,
            gallery, documents, diagrams, location, dfo, table_data
        ) VALUES (
            :cluster, :project, :code, :title, :description, :site, :room,
            :gallery, :documents, :diagrams, :location, :dfo, :table_data
        )
        RETURNING *
    """
    row = await database.fetch_one(query, values)
    return _row_to_idf_public(dict(row))


@router.post("/{cluster}/{project}/idfs", response_model=IdfPublic, status_code=201)
async def create_idf(
    idf_data: IdfCreate,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)

    existing = await database.fetch_one(
        "SELECT 1 FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": idf_data.code},
    )
    if existing:
        raise HTTPException(status_code=409, detail="IDF already exists")

    values = {
        "cluster": cluster,
        "project": db_project,
        "code": idf_data.code,
        **_prepare_common_values(idf_data),
    }

    query = """
        INSERT INTO idfs (
            cluster, project, code, title, description, site, room,
            gallery, documents, diagrams, location, dfo, table_data
        ) VALUES (
            :cluster, :project, :code, :title, :description, :site, :room,
            :gallery, :documents, :diagrams, :location, :dfo, :table_data
        )
        RETURNING *
    """
    row = await database.fetch_one(query, values)
    return _row_to_idf_public(dict(row))


@router.put("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def update_idf(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    await _fetch_idf(cluster, db_project, code)

    values = {
        "cluster": cluster,
        "project": db_project,
        "code": code,
        **_prepare_common_values(idf_data),
    }

    query = """
        UPDATE idfs
           SET title = :title,
               description = :description,
               site = :site,
               room = :room,
               gallery = :gallery,
               documents = :documents,
               diagrams = :diagrams,
               location = :location,
               dfo = :dfo,
               table_data = :table_data,
               updated_at = NOW()
         WHERE cluster = :cluster AND project = :project AND code = :code
        RETURNING *
    """
    row = await database.fetch_one(query, values)
    return _row_to_idf_public(dict(row))


@router.delete("/{cluster}/{project}/idfs/{code}")
async def delete_idf(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    result = await database.execute(
        "DELETE FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )
    if result == 0:
        raise HTTPException(status_code=404, detail="IDF not found")
    return {"message": "IDF deleted successfully"}


__all__ = ["router"]
