import json
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from app.db.mongo import database
from app.models.idf_models import IdfIndex, IdfPublic, IdfHealth, HealthCounts
from app.core.config import settings


router = APIRouter(prefix="/api", tags=["public"])


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
        if include_health and row["table_data"]:
            table_data = json.loads(row["table_data"]) if isinstance(row["table_data"], str) else row["table_data"]
            health = compute_health(table_data)
        
        result.append(IdfIndex(
            cluster=row["cluster"],
            project=row["project"],
            code=row["code"],
            title=row["title"],
            site=row["site"],
            room=row["room"],
            health=health
        ))
    
    return result


@router.get("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def get_idf(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = ""
):
    """Get detailed IDF information"""
    query = "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code"
    row = await database.fetch_one(query, {"cluster": cluster, "project": project, "code": code})
    
    if not row:
        raise HTTPException(status_code=404, detail="IDF not found")
    
    # Parse JSON fields
    gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
    documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"] 
    diagram = json.loads(row["diagram"]) if row["diagram"] and isinstance(row["diagram"], str) else row["diagram"]
    table_data = json.loads(row["table_data"]) if row["table_data"] and isinstance(row["table_data"], str) else row["table_data"]
    
    # Compute health
    health = None
    if table_data:
        health = compute_health(table_data)
    
    return IdfPublic(
        cluster=row["cluster"],
        project=row["project"],
        code=row["code"],
        title=row["title"],
        description=row["description"],
        site=row["site"],
        room=row["room"],
        gallery=gallery or [],
        documents=documents or [],
        diagram=diagram,
        table=table_data,
        health=health
    )
