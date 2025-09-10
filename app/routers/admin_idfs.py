import json
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.db.mongo import database
from app.models.idf_models import IdfPublic, IdfUpsert
from app.core.config import settings


router = APIRouter(tags=["admin"])


def validate_cluster(cluster: str):
    """Validate that cluster is in allowed clusters"""
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def verify_admin_token(authorization: str = Header(...)):
    """Verify admin bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization.replace("Bearer ", "")
    if not token or token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")

    return token


@router.post("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def create_idf(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    token: str = Depends(verify_admin_token)
):
    """Create new IDF"""
    # Check if IDF already exists
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
    )

    if existing:
        raise HTTPException(status_code=409, detail="IDF already exists")

    # Insert new IDF
    query = """
        INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagram, table_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
    """

    table_json = json.dumps(idf_data.table.dict()) if idf_data.table else None

    row = await database.fetch_one(query, 
        cluster, project, code,
        idf_data.title, idf_data.description,
        idf_data.site, idf_data.room,
        json.dumps([]), json.dumps([]),
        None, table_json
    )

    # Parse JSON fields for response
    gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
    documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"]
    diagram = json.loads(row["diagram"]) if row["diagram"] and isinstance(row["diagram"], str) else row["diagram"]
    table_data = json.loads(row["table_data"]) if row["table_data"] and isinstance(row["table_data"], str) else row["table_data"]

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
        table=table_data
    )


@router.put("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def update_idf(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    token: str = Depends(verify_admin_token)
):
    """Update existing IDF"""
    # Check if IDF exists
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
    )

    if not existing:
        raise HTTPException(status_code=404, detail="IDF not found")

    # Build update query
    table_json = json.dumps(idf_data.table.dict()) if idf_data.table else None

    query = """
        UPDATE idfs 
        SET title = $4, description = $5, site = $6, room = $7, table_data = $8
        WHERE cluster = $1 AND project = $2 AND code = $3
        RETURNING *
    """

    row = await database.fetch_one(query,
        cluster, project, code,
        idf_data.title, idf_data.description,
        idf_data.site, idf_data.room, table_json
    )

    # Parse JSON fields for response
    gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
    documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"]
    diagram = json.loads(row["diagram"]) if row["diagram"] and isinstance(row["diagram"], str) else row["diagram"]
    table_data = json.loads(row["table_data"]) if row["table_data"] and isinstance(row["table_data"], str) else row["table_data"]

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
        table=table_data
    )


@router.delete("/{cluster}/{project}/idfs/{code}")
async def delete_idf(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    token: str = Depends(verify_admin_token)
):
    """Delete IDF"""
    # Delete IDF
    query = "DELETE FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code"
    result = await database.execute(query, {"cluster": cluster, "project": project, "code": code})

    if result == 0:
        raise HTTPException(status_code=404, detail="IDF not found")

    return {"message": "IDF deleted successfully"}