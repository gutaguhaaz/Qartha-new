import json
from fastapi import APIRouter, Depends, Header, HTTPException
from app.db.database import database
from app.models.idf_models import IdfPublic, IdfCreate, IdfUpsert
from app.routers.auth import get_current_admin
from app.core.config import settings


router = APIRouter(tags=["admin"])


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
        "Sabinas%20Project": "Sabinas Project",  # Handle URL format
        "trinity": "Trinity",
        "Trinity": "Trinity",
        # Add mappings for trk cluster
        "trinity/sabinas": "Sabinas Project",
        "sabinas/trinity": "Sabinas Project",
        # Add more mappings as needed
    }
    return project_mapping.get(decoded_project, decoded_project)


@router.post("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def create_idf_with_code(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    current_user: dict = Depends(get_current_admin)
):
    db_project = map_url_project_to_db_project(project)
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )
    if existing:
        raise HTTPException(status_code=409, detail="IDF already exists")

    query = """
        INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagrams, location, table_data)
        VALUES (:cluster, :project, :code, :title, :description, :site, :room, :gallery, :documents, :diagrams, :location, :table_data)
        RETURNING *
    """
    table_json = json.dumps(idf_data.table.model_dump()) if idf_data.table else None
    values = {
        "cluster": cluster,
        "project": db_project,
        "code": code,
        "title": idf_data.title,
        "description": idf_data.description,
        "site": idf_data.site,
        "room": idf_data.room,
        "gallery": json.dumps([]),
        "documents": json.dumps([]),
        "diagrams": json.dumps([]),
        "location": None,
        "table_data": table_json,
    }
    row = await database.fetch_one(query, values)

    gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
    documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"]
    diagrams = json.loads(row["diagrams"]) if row.get("diagrams") and isinstance(row["diagrams"], str) else (row.get("diagrams") or [])
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
        diagrams=diagrams,
        table=table_data,
    )


@router.post("/{cluster}/{project}/idfs", response_model=IdfPublic, status_code=201)
async def create_idf_no_code(
    idf_data: IdfCreate,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    current_user: dict = Depends(get_current_admin)
):
    db_project = map_url_project_to_db_project(project)
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": idf_data.code},
    )
    if existing:
        raise HTTPException(status_code=409, detail="IDF already exists")

    query = """
        INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagrams, location, table_data)
        VALUES (:cluster, :project, :code, :title, :description, :site, :room, :gallery, :documents, :diagrams, :location, :table_data)
        RETURNING *
    """
    values = {
        "cluster": cluster,
        "project": db_project,
        "code": idf_data.code,
        "title": idf_data.title,
        "description": idf_data.description,
        "site": idf_data.site,
        "room": idf_data.room,
        "gallery": json.dumps([item.model_dump() for item in idf_data.gallery]),
        "documents": json.dumps([item.model_dump() for item in idf_data.documents]),
        "diagrams": json.dumps([item.model_dump() for item in idf_data.diagrams]),
        "location": json.dumps([item.model_dump() for item in idf_data.location]),
        "table_data": json.dumps(idf_data.table.model_dump()) if idf_data.table else None,
    }
    row = await database.fetch_one(query, values)

    gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
    documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"]
    diagrams = json.loads(row["diagrams"]) if row.get("diagrams") and isinstance(row["diagrams"], str) else (row.get("diagrams") or [])
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
        diagrams=diagrams,
        table=table_data,
    )


@router.put("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def update_idf(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    current_user: dict = Depends(get_current_admin)
):
    db_project = map_url_project_to_db_project(project)
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="IDF not found")

    table_json = json.dumps(idf_data.table.model_dump()) if idf_data.table else None
    query = """
        UPDATE idfs
        SET title = :title, description = :description, site = :site, room = :room, table_data = :table_data
        WHERE cluster = :cluster AND project = :project AND code = :code
        RETURNING *
    """
    values = {
        "cluster": cluster,
        "project": db_project,
        "code": code,
        "title": idf_data.title,
        "description": idf_data.description,
        "site": idf_data.site,
        "room": idf_data.room,
        "table_data": table_json,
    }
    row = await database.fetch_one(query, values)

    gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
    documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"]
    diagrams = json.loads(row["diagrams"]) if row.get("diagrams") and isinstance(row["diagrams"], str) else (row.get("diagrams") or [])
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
        diagrams=diagrams,
        table=table_data,
    )


@router.delete("/{cluster}/{project}/idfs/{code}")
async def delete_idf(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    current_user: dict = Depends(get_current_admin)
):
    db_project = map_url_project_to_db_project(project)
    query = "DELETE FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code"
    result = await database.execute(query, {"cluster": cluster, "project": db_project, "code": code})
    if result == 0:
        raise HTTPException(status_code=404, detail="IDF not found")
    return {"message": "IDF deleted successfully"}