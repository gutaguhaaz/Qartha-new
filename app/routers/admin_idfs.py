"""Administrative endpoints for creating and updating IDFs."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional, List

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.db.database import database
from app.models.idf_models import IdfCreate, IdfPublic, IdfUpsert
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


def _serialize_table(table: Optional[Any]) -> Optional[str]:
    if not table:
        return None
    return json.dumps(table.model_dump())


def _serialize_media_list(items: Any) -> str:
    """Convert media items to JSON, handling both string and object formats."""
    if not items:
        return json.dumps([])

    serialized_items = []
    for item in items:
        if isinstance(item, str):
            serialized_items.append(item)
        elif hasattr(item, 'model_dump'):
            serialized_items.append(item.model_dump())
        elif isinstance(item, dict):
            serialized_items.append(item)
        else:
            serialized_items.append(str(item))

    return json.dumps(serialized_items)


def _prepare_common_values(data: IdfUpsert) -> Dict[str, Any]:
    # Handle location - keep as JSON string if it's a list, or convert to JSON
    location_value = None
    if data.location:
        if isinstance(data.location, list):
            location_value = _serialize_media_list(data.location)
        else:
            location_value = json.dumps([data.location])

    return {
        "title": data.title,
        "description": data.description,
        "site": data.site,
        "room": data.room,
        "images": _serialize_media_list(data.images),
        "documents": _serialize_media_list(data.documents),
        "diagrams": _serialize_media_list(data.diagrams),
        "location": location_value,
        "dfo": _serialize_media_list(data.dfo),
        "logo": data.logo,
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


def _load_media_list(value: Any) -> List[Any]:
    """Load and normalize media list, handling both string and object formats."""
    loaded = _load_json(value)
    if not loaded:
        return []

    if not isinstance(loaded, list):
        return []

    return loaded


def _row_to_idf_public(row: Dict[str, Any]) -> IdfPublic:
    table_data = _load_json(row.get("table_data"))
    location_data = _load_json(row.get("location"))

    return IdfPublic(
        cluster=row["cluster"],
        project=row["project"],
        code=row["code"],
        title=row.get("title", ""),
        description=row.get("description"),
        site=row.get("site"),
        room=row.get("room"),
        images=_load_media_list(row.get("images")),
        documents=_load_media_list(row.get("documents")),
        diagrams=_load_media_list(row.get("diagrams")),
        location=location_data,
        dfo=_load_media_list(row.get("dfo")),
        logo=row.get("logo"),
        table=table_data if isinstance(table_data, dict) else None,
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
            images, documents, diagrams, location, dfo, logo, table_data
        ) VALUES (
            :cluster, :project, :code, :title, :description, :site, :room,
            :images, :documents, :diagrams, :location, :dfo, :logo, :table_data
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
            images, documents, diagrams, location, dfo, logo, table_data
        ) VALUES (
            :cluster, :project, :code, :title, :description, :site, :room,
            :images, :documents, :diagrams, :location, :dfo, :logo, :table_data
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

    # Get current IDF data to preserve logo if not updated
    current_idf = await database.fetch_one(
        """
        SELECT logo FROM idfs 
        WHERE cluster = :cluster AND project = :project AND code = :code
        """,
        {"cluster": cluster, "project": db_project, "code": code}
    )

    # Preserve current logo if update_data.logo is None or empty
    logo_value = idf_data.logo
    if not logo_value and current_idf and current_idf["logo"]:
        logo_value = current_idf["logo"]

    # Prepare values using existing serialization functions
    values = _prepare_common_values(idf_data)
    values["logo"] = logo_value

    # Update IDF data
    params = {
        "cluster": cluster,
        "project": db_project,
        "code": code,
        **values,
    }

    query = """
        UPDATE idfs
           SET title = :title,
               description = :description,
               site = :site,
               room = :room,
               images = :images,
               documents = :documents,
               diagrams = :diagrams,
               location = :location,
               dfo = :dfo,
               logo = :logo,
               table_data = :table_data
         WHERE cluster = :cluster AND project = :project AND code = :code
        RETURNING *
    """
    row = await database.fetch_one(query, params)
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