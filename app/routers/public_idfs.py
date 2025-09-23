import json
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional

from app.db.database import database
from app.models.idf_models import IdfHealth, HealthCounts, IdfIndex, IdfPublic
from app.routers.auth import get_current_user
from app.core.config import settings


router = APIRouter(tags=["public"])


def validate_cluster(cluster: str):
    """Validate that cluster is in allowed clusters"""
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def map_url_project_to_db_project(project: str) -> str:
    """Map URL project name to database project name"""
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


def compute_health(table_data: Optional[Dict[str, Any]]):
    """Compute health status based on table data status values"""
    if not table_data:
        return {
            "level": "gray",
            "counts": {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
        }

    if not isinstance(table_data, dict):
        return {
            "level": "gray",
            "counts": {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
        }

    rows = table_data.get("rows", [])
    if not rows:
        return {
            "level": "green", 
            "counts": {"ok": 1, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
        }

    counts = {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}

    for row in rows:
        status = row.get("status", "").lower()
        if status in counts:
            counts[status] += 1

    if counts["falla"] > 0:
        level = "red"
    elif counts["revision"] > 0:
        level = "yellow"
    elif counts["ok"] > 0:
        level = "green"
    else:
        level = "gray"

    return {"level": level, "counts": counts}


def convert_relative_to_absolute(paths: Any) -> Any:
    """Convert relative paths to absolute URLs"""
    if isinstance(paths, list):
        return [f"{settings.PUBLIC_BASE_URL}/static/{path}" for path in paths]
    elif isinstance(paths, str):
        return f"{settings.PUBLIC_BASE_URL}/static/{paths}"
    return paths


@router.get("/{cluster}/{project}/idfs")
async def list_idfs(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    include_health: int = Query(0, description="Include health computation"),
    _current_user: dict = Depends(get_current_user),
):
    """Get list of IDFs for a cluster/project"""
    db_project = map_url_project_to_db_project(project)

    base_query = "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project"
    params = {"cluster": cluster, "project": db_project}

    if q:
        base_query += " AND (code ILIKE :q OR title ILIKE :q OR site ILIKE :q OR room ILIKE :q)"
        params["q"] = f"%{q}%"

    base_query += " ORDER BY title OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit

    rows = await database.fetch_all(base_query, params)

    result = []
    for row in rows:
        health = None
        idf_data = dict(row)

        if include_health and idf_data.get("table_data"):
            table_data = json.loads(idf_data["table_data"]) if isinstance(idf_data["table_data"], str) else idf_data["table_data"]
            health = compute_health(table_data)

        result.append(IdfIndex(
            cluster=idf_data["cluster"],
            project=idf_data["project"],
            code=idf_data["code"],
            title=idf_data.get("title", ""),
            site=idf_data.get("site", ""),
            room=idf_data.get("room", ""),
            health=health,
            logo=convert_relative_to_absolute(idf_data.get("logo")) if idf_data.get("logo") else None
        ))

    return result


@router.get("/{cluster}/{project}/idfs/{code}")
async def get_idf(
    code: str,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _current_user: dict = Depends(get_current_user),
):
    """Get a specific IDF by code"""
    db_project = map_url_project_to_db_project(project)

    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code}
    )

    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")

    idf_dict = dict(idf)

    # Compute health if table exists
    health = None
    if idf_dict.get("table_data"):
        table_data = json.loads(idf_dict["table_data"]) if isinstance(idf_data["table_data"], str) else idf_data["table_data"]
        health = compute_health(table_data)

    return IdfPublic(
        cluster=idf_dict["cluster"],
        project=idf_dict["project"],
        code=idf_dict["code"],
        title=idf_dict.get("title", ""),
        description=idf_dict.get("description"),
        site=idf_dict.get("site", ""),
        room=idf_dict.get("room", ""),
        images=convert_relative_to_absolute(idf_dict.get("images", [])),
        documents=convert_relative_to_absolute(idf_dict.get("documents", [])),
        diagrams=convert_relative_to_absolute(idf_dict.get("diagrams", [])),
        location=convert_relative_to_absolute(idf_dict.get("location")) if idf_dict.get("location") else None,
        dfo=convert_relative_to_absolute(idf_dict.get("dfo", [])),
        logo=convert_relative_to_absolute(idf_dict.get("logo")) if idf_dict.get("logo") else None,
        table=json.loads(idf_dict["table_data"]) if idf_dict.get("table_data") else None,
        health=health
    )