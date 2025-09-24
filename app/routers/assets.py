"""Asset management endpoints for media associated with IDFs."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.db.database import database
from app.routers.auth import get_current_admin, get_current_user

router = APIRouter(tags=["assets"])
admin_router = APIRouter(tags=["admin-assets"])

STATIC_ROOT = Path(settings.STATIC_DIR)


def validate_cluster(cluster: str) -> str:
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
        "monclova": "Monclova Project",
        "Monclova": "Monclova Project",
        "Monclova Project": "Monclova Project",
    }
    return project_mapping.get(decoded_project, decoded_project)


def map_db_project_to_folder_name(db_project_name: str) -> str:
    folder_name_mapping = {
        "Sabinas Project": "sabinas",
        "Trinity": "trinity", 
        "Monclova Project": "monclova",
    }
    return folder_name_mapping.get(
        db_project_name, db_project_name.lower().replace(" ", "-")
    )


async def _get_idf(cluster: str, project: str, code: str) -> dict:
    row = await database.fetch_one(
        """
        SELECT images, documents, diagrams, location, dfo, logo
          FROM idfs
         WHERE cluster = :cluster AND project = :project AND code = :code
        """,
        {"cluster": cluster, "project": project, "code": code},
    )
    if not row:
        raise HTTPException(status_code=404, detail="IDF not found")
    return dict(row)


async def _write_upload(file: UploadFile, destination: Path) -> str:
    destination.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    destination.write_bytes(content)
    return str(destination.relative_to(STATIC_ROOT))


# ---------------------------------------------------------------------------
# Upload endpoints - MULTIPLE FILES
# ---------------------------------------------------------------------------

@router.post("/{cluster}/{project}/assets/{code}/images")
async def upload_images(
    files: List[UploadFile] = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)

    idf = await _get_idf(cluster, db_project, code)
    current_images = idf.get("images") or []

    # Handle case where images might be stored as JSON string
    if isinstance(current_images, str):
        try:
            current_images = json.loads(current_images)
        except json.JSONDecodeError:
            current_images = []
    elif current_images is None:
        current_images = []

    new_paths = []
    for file in files:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="All files must be images")

        extension = Path(file.filename or "image.jpg").suffix or ".jpg"
        filename = f"{int(time.time() * 1000)}{extension}"
        file_path = STATIC_ROOT / cluster / folder_project / code / "images" / filename

        relative_path = await _write_upload(file, file_path)
        new_paths.append(relative_path)

    updated_images = current_images + new_paths

    await database.execute(
        "UPDATE idfs SET images = :images WHERE cluster = :cluster AND project = :project AND code = :code",
        {"images": json.dumps(updated_images), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"paths": new_paths, "message": f"Uploaded {len(files)} images successfully"}


@router.post("/{cluster}/{project}/assets/{code}/documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)

    idf = await _get_idf(cluster, db_project, code)
    current_documents = idf.get("documents") or []

    # Handle case where documents might be stored as JSON string
    if isinstance(current_documents, str):
        try:
            current_documents = json.loads(current_documents)
        except json.JSONDecodeError:
            current_documents = []
    elif current_documents is None:
        current_documents = []

    new_paths = []
    for file in files:
        extension = Path(file.filename or "document.pdf").suffix or ".pdf"
        filename = f"{int(time.time() * 1000)}{extension}"
        file_path = STATIC_ROOT / cluster / folder_project / code / "documents" / filename

        relative_path = await _write_upload(file, file_path)
        new_paths.append(relative_path)

    updated_documents = current_documents + new_paths

    await database.execute(
        "UPDATE idfs SET documents = :documents WHERE cluster = :cluster AND project = :project AND code = :code",
        {"documents": json.dumps(updated_documents), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"paths": new_paths, "message": f"Uploaded {len(files)} documents successfully"}


@router.post("/{cluster}/{project}/assets/{code}/diagrams")
async def upload_diagrams(
    files: List[UploadFile] = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)

    idf = await _get_idf(cluster, db_project, code)
    current_diagrams = idf.get("diagrams") or []

    # Handle case where diagrams might be stored as JSON string
    if isinstance(current_diagrams, str):
        try:
            current_diagrams = json.loads(current_diagrams)
        except json.JSONDecodeError:
            current_diagrams = []
    elif current_diagrams is None:
        current_diagrams = []

    new_paths = []
    for file in files:
        extension = Path(file.filename or "diagram.png").suffix or ".png"
        filename = f"{int(time.time() * 1000)}{extension}"
        file_path = STATIC_ROOT / cluster / folder_project / code / "diagrams" / filename

        relative_path = await _write_upload(file, file_path)
        new_paths.append(relative_path)

    updated_diagrams = current_diagrams + new_paths

    await database.execute(
        "UPDATE idfs SET diagrams = :diagrams WHERE cluster = :cluster AND project = :project AND code = :code",
        {"diagrams": json.dumps(updated_diagrams), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"paths": new_paths, "message": f"Uploaded {len(files)} diagrams successfully"}


@router.post("/{cluster}/{project}/assets/{code}/dfo")
async def upload_dfo(
    files: List[UploadFile] = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)

    uploaded_files = []
    for file in files:
        # Allow both images and PDFs for DFO
        if not file.content_type or not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} must be an image or PDF")

        timestamp = int(time.time() * 1000)
        extension = Path(file.filename or "dfo.png").suffix or ".png"
        filename = f"{timestamp}{extension}"
        file_path = STATIC_ROOT / cluster / folder_project / code / "dfo" / filename

        relative_path = await _write_upload(file, file_path)

        # Generate clean relative URL without absolute domain
        uploaded_files.append({
            "url": f"/static/{cluster}/{folder_project}/{code}/dfo/{filename}",
            "name": file.filename or "DFO",
            "kind": "diagram" if file.content_type and file.content_type.startswith("image/") else "document"
        })

    # Get current DFO to append to it, instead of overwriting
    idf = await _get_idf(cluster, db_project, code)
    current_dfo = idf.get("dfo") or []
    if isinstance(current_dfo, str):
        try:
            current_dfo = json.loads(current_dfo)
        except json.JSONDecodeError:
            current_dfo = []

    # Ensure current_dfo contains only clean objects
    clean_current_dfo = []
    for item in current_dfo:
        if isinstance(item, dict) and "url" in item:
            # Clean up any existing malformed URLs
            url = item["url"]
            if url.startswith("/static/") and not ("{'url':" in url or "replit.dev" in url):
                clean_current_dfo.append(item)
        elif isinstance(item, str) and item.startswith("/static/"):
            clean_current_dfo.append({
                "url": item,
                "name": "DFO",
                "kind": "diagram"
            })

    updated_dfo = clean_current_dfo + uploaded_files

    # Update database
    result = await database.execute(
        "UPDATE idfs SET dfo = :dfo WHERE cluster = :cluster AND project = :project AND code = :code",
        {"dfo": json.dumps(updated_dfo), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"uploaded": uploaded_files, "count": len(uploaded_files)}


# ---------------------------------------------------------------------------
# Upload endpoints - SINGLE FILES
# ---------------------------------------------------------------------------

@router.post("/{cluster}/{project}/assets/{code}/location")
async def upload_location(
    file: UploadFile = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    extension = Path(file.filename or "location.jpg").suffix or ".jpg"
    filename = f"location{extension}"
    file_path = STATIC_ROOT / cluster / folder_project / code / "location" / filename

    relative_path = await _write_upload(file, file_path)

    await database.execute(
        "UPDATE idfs SET location = :location WHERE cluster = :cluster AND project = :project AND code = :code",
        {"location": relative_path, "cluster": cluster, "project": db_project, "code": code},
    )

    return {"path": relative_path, "message": "Location image uploaded successfully"}


@router.post("/{cluster}/{project}/assets/{code}/logo")
async def upload_logo(
    file: UploadFile = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    extension = Path(file.filename or "logo.png").suffix or ".png"
    filename = f"logo{extension}"
    file_path = STATIC_ROOT / cluster / folder_project / code / "logo" / filename

    relative_path = await _write_upload(file, file_path)

    # Update database with the relative path
    result = await database.execute(
        "UPDATE idfs SET logo = :logo WHERE cluster = :cluster AND project = :project AND code = :code",
        {"logo": relative_path, "cluster": cluster, "project": db_project, "code": code},
    )

    # Verify the update happened
    updated_idf = await database.fetch_one(
        "SELECT logo FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )

    if not updated_idf:
        raise HTTPException(status_code=404, detail="IDF not found for logo update")

    return {
        "path": relative_path, 
        "message": "Logo uploaded successfully",
        "database_value": updated_idf["logo"]
    }


# ---------------------------------------------------------------------------
# GET endpoints for individual assets
# ---------------------------------------------------------------------------

@router.get("/{cluster}/{project}/assets/{code}/logo")
async def get_idf_logo(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _current_user: dict = Depends(get_current_user),
):
    """Get logo for specific IDF"""
    db_project = map_url_project_to_db_project(project)

    idf = await _get_idf(cluster, db_project, code)
    logo_path = idf.get("logo")

    if not logo_path:
        raise HTTPException(status_code=404, detail="Logo not found")

    # Check if file exists in filesystem
    full_path = STATIC_ROOT / logo_path
    if not full_path.exists():
        # Clean up database entry if file doesn't exist
        await database.execute(
            "UPDATE idfs SET logo = NULL WHERE cluster = :cluster AND project = :project AND code = :code",
            {"cluster": cluster, "project": db_project, "code": code},
        )
        raise HTTPException(status_code=404, detail="Logo file not found")

    return {
        "url": f"/static/{logo_path}",
        "name": "IDF Logo",
        "path": logo_path
    }

# ---------------------------------------------------------------------------
# Delete assets
# ---------------------------------------------------------------------------

@router.delete("/{cluster}/{project}/assets/{code}/images/{index}")
async def delete_image(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    index: int = 0,
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    images = idf.get("images") or []

    # Handle case where images might be stored as JSON string
    if isinstance(images, str):
        try:
            images = json.loads(images)
        except json.JSONDecodeError:
            images = []
    elif images is None:
        images = []

    if index < 0 or index >= len(images):
        raise HTTPException(status_code=404, detail="Image not found")

    removed_path = images.pop(index)

    # Remove file from filesystem
    try:
        (STATIC_ROOT / removed_path).unlink(missing_ok=True)
    except OSError:
        pass

    await database.execute(
        "UPDATE idfs SET images = :images WHERE cluster = :cluster AND project = :project AND code = :code",
        {"images": json.dumps(images), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "Image deleted", "path": removed_path}


@router.delete("/{cluster}/{project}/assets/{code}/documents/{index}")
async def delete_document(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    index: int = 0,
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    documents = idf.get("documents") or []

    # Handle case where documents might be stored as JSON string
    if isinstance(documents, str):
        try:
            documents = json.loads(documents)
        except json.JSONDecodeError:
            documents = []
    elif documents is None:
        documents = []

    if index < 0 or index >= len(documents):
        raise HTTPException(status_code=404, detail="Document not found")

    removed_path = documents.pop(index)

    # Remove file from filesystem
    try:
        (STATIC_ROOT / removed_path).unlink(missing_ok=True)
    except OSError:
        pass

    await database.execute(
        "UPDATE idfs SET documents = :documents WHERE cluster = :cluster AND project = :project AND code = :code",
        {"documents": json.dumps(documents), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "Document deleted", "path": removed_path}


@router.delete("/{cluster}/{project}/assets/{code}/diagrams/{index}")
async def delete_diagram(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    index: int = 0,
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    diagrams = idf.get("diagrams") or []

    # Handle case where diagrams might be stored as JSON string
    if isinstance(diagrams, str):
        try:
            diagrams = json.loads(diagrams)
        except json.JSONDecodeError:
            diagrams = []
    elif diagrams is None:
        diagrams = []

    if index < 0 or index >= len(diagrams):
        raise HTTPException(status_code=404, detail="Diagram not found")

    removed_path = diagrams.pop(index)

    # Remove file from filesystem
    try:
        (STATIC_ROOT / removed_path).unlink(missing_ok=True)
    except OSError:
        pass

    await database.execute(
        "UPDATE idfs SET diagrams = :diagrams WHERE cluster = :cluster AND project = :project AND code = :code",
        {"diagrams": json.dumps(diagrams), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "Diagram deleted", "path": removed_path}


@router.delete("/{cluster}/{project}/assets/{code}/dfo/{index}")
async def delete_dfo(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    index: int = 0,
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    dfo = idf.get("dfo") or []

    # Handle case where dfo might be stored as JSON string
    if isinstance(dfo, str):
        try:
            dfo = json.loads(dfo)
        except json.JSONDecodeError:
            dfo = []
    elif dfo is None:
        dfo = []

    if index < 0 or index >= len(dfo):
        raise HTTPException(status_code=404, detail="DFO file not found")

    removed_item = dfo.pop(index)

    # Handle both old format (string) and new format (object)
    if isinstance(removed_item, dict):
        removed_path = removed_item.get("url", "").replace("/static/", "")
    else:
        removed_path = removed_item

    # Remove file from filesystem
    try:
        (STATIC_ROOT / removed_path).unlink(missing_ok=True)
    except OSError:
        pass

    await database.execute(
        "UPDATE idfs SET dfo = :dfo WHERE cluster = :cluster AND project = :project AND code = :code",
        {"dfo": json.dumps(dfo), "cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "DFO file deleted", "path": removed_path}


@router.delete("/{cluster}/{project}/assets/{code}/location")
async def delete_location(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    location = idf.get("location")

    if not location:
        raise HTTPException(status_code=404, detail="Location image not found")

    # Remove file from filesystem
    try:
        (STATIC_ROOT / location).unlink(missing_ok=True)
    except OSError:
        pass

    await database.execute(
        "UPDATE idfs SET location = NULL WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "Location image deleted", "path": location}


@router.delete("/{cluster}/{project}/assets/{code}/logo")
async def delete_logo(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    logo = idf.get("logo")

    if not logo:
        raise HTTPException(status_code=404, detail="Logo not found")

    # Remove file from filesystem
    try:
        (STATIC_ROOT / logo).unlink(missing_ok=True)
    except OSError:
        pass

    await database.execute(
        "UPDATE idfs SET logo = NULL WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "Logo deleted", "path": logo}


__all__ = ["router", "admin_router"]