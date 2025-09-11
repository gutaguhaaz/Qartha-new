import os
import json
import glob
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form, Header
from typing import Optional
from app.core.config import settings
from app.db.mongo import database


router = APIRouter(tags=["assets"])


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
        raise HTTPException(status_code=401, detail=f"Invalid token. Expected: {settings.ADMIN_TOKEN}, Got: {token}")

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
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    authorization: Optional[str] = Header(None)
):
    """Upload image for IDF"""
    validate_cluster(cluster)
    verify_admin_token(authorization)

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
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
        "UPDATE idfs SET gallery = :gallery WHERE cluster = :cluster AND project = :project AND code = :code",
        {"gallery": json.dumps(gallery), "cluster": cluster, "project": project, "code": code}
    )

    return {"url": url, "message": "Image uploaded successfully"}


@router.post("/{cluster}/{project}/assets/documents")
async def upload_document(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    authorization: Optional[str] = Header(None)
):
    """Upload document for IDF"""
    validate_cluster(cluster)
    verify_admin_token(authorization)

    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
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
        "UPDATE idfs SET documents = :documents WHERE cluster = :cluster AND project = :project AND code = :code",
        {"documents": json.dumps(documents), "cluster": cluster, "project": project, "code": code}
    )

    return {"url": url, "message": "Document uploaded successfully"}


@router.post("/{cluster}/{project}/assets/diagram")
async def upload_diagram(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    authorization: Optional[str] = Header(None)
):
    """Upload diagram for IDF"""
    validate_cluster(cluster)
    verify_admin_token(authorization)

    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
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

    # Get current diagrams array
    current_idf = await database.fetch_one(
        "SELECT diagrams FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
    )
    
    current_diagrams = []
    if current_idf and current_idf["diagrams"]:
        if isinstance(current_idf["diagrams"], str):
            current_diagrams = json.loads(current_idf["diagrams"])
        else:
            current_diagrams = current_idf["diagrams"]
    
    # Add new diagram to array
    new_diagram = {
        "url": url,
        "name": file.filename,
        "kind": "diagram"
    }
    current_diagrams.append(new_diagram)

    await database.execute(
        "UPDATE idfs SET diagrams = :diagrams WHERE cluster = :cluster AND project = :project AND code = :code",
        {"diagrams": json.dumps(current_diagrams), "cluster": cluster, "project": project, "code": code}
    )

    return {"url": url, "message": "Diagram uploaded successfully"}


@router.post("/{cluster}/{project}/assets/logo")
async def upload_logo(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Upload cluster logo"""
    validate_cluster(cluster)
    verify_admin_token(authorization)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Remove existing logos for this cluster
    for existing in glob.glob(os.path.join(settings.STATIC_DIR, cluster, "logo.*")):
        try:
            os.remove(existing)
        except OSError:
            pass

    file_extension = os.path.splitext(file.filename or "logo.png")[1]
    file_path = os.path.join(
        settings.STATIC_DIR,
        cluster,
        f"logo{file_extension}"
    )

    url = await save_file(file, file_path)

    return {"url": url, "message": "Logo uploaded successfully"}


@router.get("/{cluster}/logo")
async def get_cluster_logo(cluster: str):
    """Get cluster logo"""
    logo_dir = os.path.join(settings.STATIC_DIR, cluster)

    # Look for common image formats
    for ext in ['png', 'jpg', 'jpeg', 'gif', 'svg']:
        logo_path = os.path.join(logo_dir, f"logo.{ext}")
        if os.path.exists(logo_path):
            return {"url": f"/static/{cluster}/logo.{ext}"}

    return {"url": None, "message": "No logo found"}


@router.get("/{cluster}/{project}/logo")
async def get_logo(cluster: str, project: str):
    """Get project logo"""
    # Check both cluster-level and project-level logo locations
    logo_locations = [
        os.path.join(settings.STATIC_DIR, cluster, project),
        os.path.join(settings.STATIC_DIR, cluster)
    ]

    # Look for common image formats in both locations
    for logo_dir in logo_locations:
        for ext in ['png', 'jpg', 'jpeg', 'gif', 'svg']:
            logo_path = os.path.join(logo_dir, f"logo.{ext}")
            if os.path.exists(logo_path):
                relative_path = logo_path.replace(settings.STATIC_DIR, "")
                return {"url": f"/static{relative_path}"}

    # Return a default or placeholder response instead of 404
    return {"url": None, "message": "No logo found"}


@router.post("/{cluster}/{project}/assets/{code}/logo")
async def upload_idf_logo(
    cluster: str,
    project: str,
    code: str,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    """Upload logo for specific IDF"""
    validate_cluster(cluster)
    verify_admin_token(authorization)

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check if file is PNG or JPG
    allowed_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG and JPG files are allowed")

    # Check if IDF exists
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
    )

    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")

    # Remove existing logo for this IDF
    logo_dir = os.path.join(settings.STATIC_DIR, cluster, project, "logos")
    for existing in glob.glob(os.path.join(logo_dir, f"{code}-logo.*")):
        try:
            os.remove(existing)
        except OSError:
            pass

    # Save new logo
    file_extension = os.path.splitext(file.filename or "logo.png")[1]
    if not file_extension:
        file_extension = ".png" if file.content_type == "image/png" else ".jpg"
    
    file_path = os.path.join(
        settings.STATIC_DIR,
        cluster,
        project,
        "logos",
        f"{code}-logo{file_extension}"
    )

    url = await save_file(file, file_path)

    # Update IDF media.logo
    media_item = {
        "name": file.filename or f"{code}-logo{file_extension}",
        "url": url
    }

    # Parse current media or create new
    media = json.loads(idf["media"]) if isinstance(idf["media"], str) and idf["media"] else {}
    media["logo"] = media_item

    await database.execute(
        "UPDATE idfs SET media = :media WHERE cluster = :cluster AND project = :project AND code = :code",
        {"media": json.dumps(media), "cluster": cluster, "project": project, "code": code}
    )

    return {"name": media_item["name"], "url": url}