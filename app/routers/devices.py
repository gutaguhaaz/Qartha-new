import csv
import io
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.core.config import settings
from app.db.database import database
from app.models.idf_models import Device
from app.routers.auth import get_current_admin


router = APIRouter(tags=["devices"])


def validate_cluster(cluster: str):
    """Validate that cluster is in allowed clusters"""
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


@router.post("/{cluster}/{project}/devices/upload_csv")
async def upload_csv_devices(
    file: UploadFile = File(...),
    code: str = Query(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _admin: dict = Depends(get_current_admin),
):
    """Upload devices from CSV file"""
    # Validate file type
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Check if IDF exists
    db_project = map_url_project_to_db_project(project)
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code}
    )
    
    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")
    
    # Read and parse CSV
    content = await file.read()
    csv_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    
    devices = []
    for row in csv_reader:
        device = {
            "cluster": cluster,
            "project": db_project,
            "idf_code": code,
            "name": row.get("name", ""),
            "model": row.get("model"),
            "serial": row.get("serial"),
            "rack": row.get("rack"),
            "site": row.get("site"),
            "notes": row.get("notes")
        }
        devices.append(device)
    
    # Delete existing devices for this IDF
    await database.execute(
        "DELETE FROM devices WHERE cluster = :cluster AND project = :project AND idf_code = :idf_code",
        {"cluster": cluster, "project": db_project, "idf_code": code}
    )

    # Insert new devices
    if devices:
        insert_query = """
            INSERT INTO devices (
                cluster, project, idf_code, name, model, serial, rack, site, notes
            ) VALUES (
                :cluster, :project, :idf_code, :name, :model, :serial, :rack, :site, :notes
            )
        """
        for device in devices:
            await database.execute(insert_query, device)

    return {"message": f"Uploaded {len(devices)} devices successfully"}


@router.post("/{cluster}/{project}/devices")
async def create_devices(
    devices: List[Device],
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _admin: dict = Depends(get_current_admin),
):
    """Create devices manually"""
    db_project = map_url_project_to_db_project(project)

    insert_query = """
        INSERT INTO devices (
            cluster, project, idf_code, name, model, serial, rack, site, notes
        ) VALUES (
            :cluster, :project, :idf_code, :name, :model, :serial, :rack, :site, :notes
        )
    """

    for device in devices:
        await database.execute(
            insert_query,
            {
                "cluster": cluster,
                "project": db_project,
                "idf_code": device.idf_code,
                "name": device.name,
                "model": device.model,
                "serial": device.serial,
                "rack": device.rack,
                "site": device.site,
                "notes": device.notes,
            },
        )

    return {"message": f"Created {len(devices)} devices successfully"}
