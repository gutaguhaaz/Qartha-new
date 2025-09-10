import os
import json
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from typing import Optional
from app.core.config import settings
from app.db.mongo import database


router = APIRouter(prefix="/api", tags=["assets"])


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


async def save_file(file: UploadFile, file_path: str) -> str:
    """Save uploaded file and return URL"""
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Return relative URL
    relative_path = file_path.replace(settings.STATIC_DIR, "")
    return f"/static{relative_path}"


@router.post("/{cluster}/{project}/assets/images")
async def upload_image(
    file: UploadFile = File(...),
    code: str = Form(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    authorization: Optional[str] = None
):
    """Upload image for IDF"""
    verify_admin_token(authorization)
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = $1 AND project = $2 AND code = $3",
        cluster, project, code
    )
    
    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")
    
    # Parse current gallery
    gallery = json.loads(idf["gallery"]) if isinstance(idf["gallery"], str) else idf["gallery"]
    
    # Save file
    file_extension = os.path.splitext(file.filename or "image.jpg")[1]
    file_path = os.path.join(
        settings.STATIC_DIR,
        cluster,
        project,
        "images",
        f"{code}_{len(gallery)}{file_extension}"
    )
    
    url = await save_file(file, file_path)
    
    # Update IDF gallery
    media_item = {
        "url": url,
        "name": file.filename,
        "kind": "image"
    }
    
    gallery.append(media_item)
    
    await database.execute(
        "UPDATE idfs SET gallery = $1 WHERE cluster = $2 AND project = $3 AND code = $4",
        json.dumps(gallery), cluster, project, code
    )
    
    return {"url": url, "message": "Image uploaded successfully"}


@router.post("/{cluster}/{project}/assets/documents")
async def upload_document(
    file: UploadFile = File(...),
    code: str = Form(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    authorization: Optional[str] = None
):
    """Upload document for IDF"""
    verify_admin_token(authorization)
    
    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = $1 AND project = $2 AND code = $3",
        cluster, project, code
    )
    
    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")
    
    # Parse current documents
    documents = json.loads(idf["documents"]) if isinstance(idf["documents"], str) else idf["documents"]
    
    # Save file
    file_extension = os.path.splitext(file.filename or "document.pdf")[1]
    file_path = os.path.join(
        settings.STATIC_DIR,
        cluster,
        project,
        "documents",
        f"{code}_{len(documents)}{file_extension}"
    )
    
    url = await save_file(file, file_path)
    
    # Update IDF documents
    media_item = {
        "url": url,
        "name": file.filename,
        "kind": "document"
    }
    
    documents.append(media_item)
    
    await database.execute(
        "UPDATE idfs SET documents = $1 WHERE cluster = $2 AND project = $3 AND code = $4",
        json.dumps(documents), cluster, project, code
    )
    
    return {"url": url, "message": "Document uploaded successfully"}


@router.post("/{cluster}/{project}/assets/diagram")
async def upload_diagram(
    file: UploadFile = File(...),
    code: str = Form(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    authorization: Optional[str] = None
):
    """Upload diagram for IDF"""
    verify_admin_token(authorization)
    
    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = $1 AND project = $2 AND code = $3",
        cluster, project, code
    )
    
    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")
    
    # Save file
    file_extension = os.path.splitext(file.filename or "diagram.pdf")[1]
    file_path = os.path.join(
        settings.STATIC_DIR,
        cluster,
        project,
        "diagrams",
        f"{code}_diagram{file_extension}"
    )
    
    url = await save_file(file, file_path)
    
    # Update IDF diagram
    media_item = {
        "url": url,
        "name": file.filename,
        "kind": "diagram"
    }
    
    await database.execute(
        "UPDATE idfs SET diagram = $1 WHERE cluster = $2 AND project = $3 AND code = $4",
        json.dumps(media_item), cluster, project, code
    )
    
    return {"url": url, "message": "Diagram uploaded successfully"}
