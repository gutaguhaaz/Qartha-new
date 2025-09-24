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

    # Get current IDF data to preserve existing fields
    current_idf = await database.fetch_one(
        """
        SELECT * FROM idfs 
        WHERE cluster = :cluster AND project = :project AND code = :code
        """,
        {"cluster": cluster, "project": db_project, "code": code}
    )

    # Prepare update data - only update provided fields
    update_data: Dict[str, Any] = {}
    
    # Always update basic fields if they are provided
    update_data["title"] = idf_data.title
    update_data["description"] = idf_data.description
    update_data["site"] = idf_data.site
    update_data["room"] = idf_data.room

    # Only update media fields if they are explicitly provided in the request
    if hasattr(idf_data, 'images') and idf_data.images is not None:
        update_data["images"] = _serialize_media_list(idf_data.images)
    else:
        update_data["images"] = current_idf["images"]  # Preserve existing

    if hasattr(idf_data, 'documents') and idf_data.documents is not None:
        update_data["documents"] = _serialize_media_list(idf_data.documents)
    else:
        update_data["documents"] = current_idf["documents"]  # Preserve existing

    if hasattr(idf_data, 'diagrams') and idf_data.diagrams is not None:
        update_data["diagrams"] = _serialize_media_list(idf_data.diagrams)
    else:
        update_data["diagrams"] = current_idf["diagrams"]  # Preserve existing

    if hasattr(idf_data, 'location') and idf_data.location is not None:
        if isinstance(idf_data.location, list):
            update_data["location"] = _serialize_media_list(idf_data.location)
        else:
            update_data["location"] = json.dumps([idf_data.location])
    else:
        update_data["location"] = current_idf["location"]  # Preserve existing

    if hasattr(idf_data, 'table') and idf_data.table is not None:
        update_data["table_data"] = _serialize_table(idf_data.table)
    else:
        update_data["table_data"] = current_idf["table_data"]  # Preserve existing

    # Always preserve logo unless explicitly provided
    if hasattr(idf_data, 'logo') and idf_data.logo is not None:
        update_data["logo"] = idf_data.logo
    else:
        update_data["logo"] = current_idf["logo"]  # Preserve existing
    
    # Handle DFO field - only update if explicitly provided
    if hasattr(idf_data, 'dfo') and idf_data.dfo is not None:
        if len(idf_data.dfo) > 0:
            # Convert single DFO item to list format for consistency
            if isinstance(idf_data.dfo, dict):
                # Ensure the URL is clean and relative
                clean_dfo = {
                    "url": idf_data.dfo["url"] if idf_data.dfo["url"].startswith("/static/") else f"/static/{idf_data.dfo['url']}",
                    "name": idf_data.dfo.get("name", "DFO"),
                    "kind": idf_data.dfo.get("kind", "diagram")
                }
                dfo_data = [clean_dfo]
            else:
                # Handle list of DFO items
                dfo_data = []
                for item in (idf_data.dfo or []):
                    if isinstance(item, dict):
                        clean_item = {
                            "url": item["url"] if item["url"].startswith("/static/") else f"/static/{item['url']}",
                            "name": item.get("name", "DFO"),
                            "kind": item.get("kind", "diagram")
                        }
                        dfo_data.append(clean_item)
            update_data["dfo"] = json.dumps(dfo_data)
        else:
            update_data["dfo"] = json.dumps([])  # Explicitly clear DFO
    else:
        # Preserve existing DFO data when not provided in request
        update_data["dfo"] = current_idf["dfo"]

    # Update IDF data
    params = {
        **update_data,
        "cluster": cluster,
        "project": db_project,
        "code": code,
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