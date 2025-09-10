import csv
import io
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Query
from typing import List, Optional
from app.db.mongo import database
from app.models.idf_models import Device
from app.core.config import settings


router = APIRouter(tags=["devices"])


def validate_cluster(cluster: str):
    """Validate that cluster is in allowed clusters"""
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def verify_admin_token(authorization: Optional[str] = None):
    """Verify admin bearer token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    if token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return token


@router.post("/{cluster}/{project}/devices/upload_csv")
async def upload_csv_devices(
    file: UploadFile = File(...),
    code: str = Query(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    authorization: Optional[str] = None
):
    """Upload devices from CSV file"""
    verify_admin_token(authorization)
    
    # Validate file type
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
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
            "project": project,
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
        {"cluster": cluster, "project": project, "idf_code": code}
    )
    
    # Insert new devices
    if devices:
        for device in devices:
            await database.execute(
                """INSERT INTO devices (cluster, project, idf_code, name, model, serial, rack, site, notes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                device["cluster"], device["project"], device["idf_code"],
                device["name"], device["model"], device["serial"],
                device["rack"], device["site"], device["notes"]
            )
    
    return {"message": f"Uploaded {len(devices)} devices successfully"}


@router.post("/{cluster}/{project}/devices")
async def create_devices(
    devices: List[Device],
    cluster: str = Depends(validate_cluster),
    project: str = "",
    authorization: Optional[str] = None
):
    """Create devices manually"""
    verify_admin_token(authorization)
    
    # Insert devices
    for device in devices:
        await database.execute(
            """INSERT INTO devices (cluster, project, idf_code, name, model, serial, rack, site, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            device.cluster, device.project, device.idf_code,
            device.name, device.model, device.serial,
            device.rack, device.site, device.notes
        )
    
    return {"message": f"Created {len(devices)} devices successfully"}
