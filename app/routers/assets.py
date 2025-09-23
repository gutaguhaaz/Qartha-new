"""Asset management endpoints for media associated with IDFs."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.db.database import database
from app.routers.auth import get_current_admin

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
    }
    return project_mapping.get(decoded_project, decoded_project)


def map_db_project_to_folder_name(db_project_name: str) -> str:
    folder_name_mapping = {
        "Sabinas Project": "sabinas",
        "Trinity": "trinity",
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
# Upload endpoints
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
    current_images = idf.get("images", [])

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
        {"images": updated_images, "cluster": cluster, "project": db_project, "code": code},
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
    current_documents = idf.get("documents", [])

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
        {"documents": updated_documents, "cluster": cluster, "project": db_project, "code": code},
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
    current_diagrams = idf.get("diagrams", [])

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
        {"diagrams": updated_diagrams, "cluster": cluster, "project": db_project, "code": code},
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

    idf = await _get_idf(cluster, db_project, code)
    current_dfo = idf.get("dfo", [])

    new_paths = []
    for file in files:
        extension = Path(file.filename or "dfo.png").suffix or ".png"
        filename = f"{int(time.time() * 1000)}{extension}"
        file_path = STATIC_ROOT / cluster / folder_project / code / "dfo" / filename

        relative_path = await _write_upload(file, file_path)
        new_paths.append(relative_path)

    updated_dfo = current_dfo + new_paths

    await database.execute(
        "UPDATE idfs SET dfo = :dfo WHERE cluster = :cluster AND project = :project AND code = :code",
        {"dfo": updated_dfo, "cluster": cluster, "project": db_project, "code": code},
    )

    return {"paths": new_paths, "message": f"Uploaded {len(files)} DFO files successfully"}


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

    await database.execute(
        "UPDATE idfs SET logo = :logo WHERE cluster = :cluster AND project = :project AND code = :code",
        {"logo": relative_path, "cluster": cluster, "project": db_project, "code": code},
    )

    return {"path": relative_path, "message": "Logo uploaded successfully"}


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
    images = idf.get("images", [])

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
        {"images": images, "cluster": cluster, "project": db_project, "code": code},
    )

    return {"message": "Image deleted", "path": removed_path}


__all__ = ["router", "admin_router"]