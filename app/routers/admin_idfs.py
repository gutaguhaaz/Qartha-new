import json
from fastapi import APIRouter, Depends, Header, HTTPException
from app.db.mongo import database
from app.core.config import settings
from app.models.idf_models import IdfPublic, IdfUpsert, IdfCreate


router = APIRouter(tags=["admin"])


def validate_cluster(cluster: str):
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def verify_admin_token(authorization: str = Header(...)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    token = authorization.replace("Bearer ", "")
    if not token or token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token


async def _create_idf_record(cluster: str, project: str, code: str, idf_data: IdfUpsert) -> IdfPublic:
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code},
    )
    if existing:
        raise HTTPException(status_code=409, detail="IDF already exists")

    query = """
        INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagram, location, table_data)
        VALUES (:cluster, :project, :code, :title, :description, :site, :room, :gallery, :documents, :diagram, :location, :table_data)
        RETURNING *
    """
    table_json = json.dumps(idf_data.table.model_dump()) if idf_data.table else None
    values = {
        "cluster": cluster,
        "project": project,
        "code": code,
        "title": idf_data.title,
        "description": idf_data.description,
        "site": idf_data.site,
        "room": idf_data.room,
        "gallery": json.dumps([]),
        "documents": json.dumps([]),
        "diagram": None,
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


@router.post("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def create_idf(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    token: str = Depends(verify_admin_token),
):
    return await _create_idf_record(cluster, project, code, idf_data)


@router.post("/{cluster}/{project}/idfs", response_model=IdfPublic, status_code=201)
async def create_idf_no_code(
    idf_data: IdfCreate,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    token: str = Depends(verify_admin_token),
):
    return await _create_idf_record(cluster, project, idf_data.code, idf_data)


@router.put("/{cluster}/{project}/idfs/{code}", response_model=IdfPublic)
async def update_idf(
    idf_data: IdfUpsert,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    token: str = Depends(verify_admin_token),
):
    existing = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="IDF not found")

    table_json = json.dumps(idf_data.table.model_dump()) if idf_data.table else None
    query = """
        UPDATE idfs
        SET title = $4, description = $5, site = $6, room = $7, table_data = $8
        WHERE cluster = $1 AND project = $2 AND code = $3
        RETURNING *
    """
    row = await database.fetch_one(
        query,
        cluster,
        project,
        code,
        idf_data.title,
        idf_data.description,
        idf_data.site,
        idf_data.room,
        table_json,
    )

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
    token: str = Depends(verify_admin_token),
):
    query = "DELETE FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code"
    result = await database.execute(query, {"cluster": cluster, "project": project, "code": code})
    if result == 0:
        raise HTTPException(status_code=404, detail="IDF not found")
    return {"message": "IDF deleted successfully"}