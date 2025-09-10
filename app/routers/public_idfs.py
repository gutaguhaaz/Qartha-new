import json
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from app.db.mongo import database
from app.models.idf_models import IdfIndex, IdfPublic, IdfHealth, HealthCounts
from app.core.config import settings


router = APIRouter(tags=["public"])


def validate_cluster(cluster: str):
    """Validate that cluster is in allowed clusters"""
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def compute_health(table_data: dict) -> Optional[IdfHealth]:
    """Compute health status from table rows"""
    if not table_data or not table_data.get("rows"):
        return None

    # Find status column
    status_column = None
    for col in table_data.get("columns", []):
        if col.get("type") == "status" or col.get("key") in ["status", "estado"]:
            status_column = col.get("key")
            break

    if not status_column:
        return None

    # Count status values
    counts = {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}

    for row in table_data["rows"]:
        status = row.get(status_column, "").lower()
        if status == "ok":
            counts["ok"] += 1
        elif status == "revisión":
            counts["revision"] += 1
        elif status == "falla":
            counts["falla"] += 1
        elif status == "libre":
            counts["libre"] += 1
        elif status == "reservado":
            counts["reservado"] += 1

    # Determine level
    if counts["falla"] > 0:
        level = "red"
    elif counts["revision"] > 0:
        level = "yellow"
    elif (counts["ok"] + counts["libre"] + counts["reservado"]) > 0:
        level = "green"
    else:
        level = "gray"

    return IdfHealth(
        level=level,
        counts=HealthCounts(**counts)
    )


@router.get("/{cluster}/{project}/idfs", response_model=List[IdfIndex])
async def get_idfs(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    include_health: int = Query(0, description="Include health computation")
):
    """Get list of IDFs for a cluster/project"""

    # Build SQL query
    base_query = "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project"
    params = {"cluster": cluster, "project": project}

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
        idf_data = dict(row)  # Convert row to dict for easier processing

        if include_health and idf_data.get("table_data"):
            table_data = json.loads(idf_data["table_data"]) if isinstance(idf_data["table_data"], str) else idf_data["table_data"]
            health = compute_health(table_data)

        # Parse gallery field for each IDF
        if isinstance(idf_data["gallery"], str):
            idf_data["gallery"] = json.loads(idf_data["gallery"])
        if isinstance(idf_data["documents"], str):
            idf_data["documents"] = json.loads(idf_data["documents"])
        if isinstance(idf_data["diagram"], str) and idf_data["diagram"]:
            idf_data["diagram"] = json.loads(idf_data["diagram"])
        if isinstance(idf_data["devices"], str):
            idf_data["devices"] = json.loads(idf_data["devices"])

        # Convert relative URLs to absolute URLs
        idf_data["gallery"] = convert_relative_urls_to_absolute(idf_data["gallery"])
        idf_data["documents"] = convert_relative_urls_to_absolute(idf_data["documents"])
        if idf_data["diagram"]:
            idf_data["diagram"] = convert_relative_urls_to_absolute(idf_data["diagram"])


        result.append(IdfIndex(
            cluster=idf_data["cluster"],
            project=idf_data["project"],
            code=idf_data["code"],
            title=idf_data["title"],
            site=idf_data["site"],
            room=idf_data["room"],
            health=health
        ))

    return result


def convert_relative_urls_to_absolute(data: Any) -> Any:
    """Convert relative URLs to absolute URLs"""
    if isinstance(data, dict):
        if "url" in data and isinstance(data["url"], str) and data["url"].startswith("/static"):
            data = data.copy()
            data["url"] = f"{settings.PUBLIC_BASE_URL}{data['url']}"
        return {k: convert_relative_urls_to_absolute(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_relative_urls_to_absolute(item) for item in data]
    return data


@router.get("/{cluster}/{project}/idfs/{code}")
async def get_idf(
    code: str,
    cluster: str = Depends(validate_cluster),
    project: str = ""
):
    """Get a specific IDF by code"""
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
    )

    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")

    # Convert to dict for processing
    idf_dict = dict(idf)

    # Parse JSON fields
    if isinstance(idf_dict["gallery"], str):
        idf_dict["gallery"] = json.loads(idf_dict["gallery"])
    if isinstance(idf_dict["documents"], str):
        idf_dict["documents"] = json.loads(idf_dict["documents"])
    if isinstance(idf_dict["diagram"], str) and idf_dict["diagram"]:
        idf_dict["diagram"] = json.loads(idf_dict["diagram"])
    if isinstance(idf_dict["devices"], str):
        idf_dict["devices"] = json.loads(idf_dict["devices"])

    # Convert relative URLs to absolute URLs
    idf_dict["gallery"] = convert_relative_urls_to_absolute(idf_dict["gallery"])
    idf_dict["documents"] = convert_relative_urls_to_absolute(idf_dict["documents"])
    if idf_dict["diagram"]:
        idf_dict["diagram"] = convert_relative_urls_to_absolute(idf_dict["diagram"])

    return IdfPublic(
        id=idf_dict["id"],
        cluster=idf_dict["cluster"],
        project=idf_dict["project"],
        code=idf_dict["code"],
        name=idf_dict["name"],
        description=idf_dict["description"],
        status=idf_dict["status"],
        health=idf_dict["health"],
        gallery=idf_dict["gallery"],
        documents=idf_dict["documents"],
        diagram=idf_dict["diagram"],
        devices=idf_dict["devices"],
        created_at=idf_dict["created_at"],
        updated_at=idf_dict["updated_at"]
    )