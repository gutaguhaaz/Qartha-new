"""Asset management endpoints for media associated with IDFs."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.db.database import database
from app.routers.auth import get_current_admin

router = APIRouter(tags=["assets"])

# Admin asset management endpoints
admin_router = APIRouter(tags=["admin-assets"])

STATIC_ROOT = Path(settings.STATIC_DIR)


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

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


# Admin endpoints for asset management
@admin_router.post("/{cluster}/{project}/assets/logo")
async def upload_project_logo_admin(
    file: UploadFile = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _admin: dict = Depends(get_current_admin),
):
    """Upload project logo (admin only)"""
    db_project = map_url_project_to_db_project(project)
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="File must be an image")
    
    # Create directory structure
    project_dir = STATIC_ROOT / cluster / project.lower()
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    filename = f"logo{Path(file.filename or '').suffix}"
    file_path = project_dir / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"message": "Logo uploaded successfully", "path": str(file_path.relative_to(STATIC_ROOT))}


@admin_router.post("/{cluster}/{project}/assets/{code}/logo") 
async def upload_idf_logo_admin(
    file: UploadFile = File(...),
    cluster: str = Depends(validate_cluster),
    project: str = "",
    code: str = "",
    _admin: dict = Depends(get_current_admin),
):
    """Upload IDF-specific logo (admin only)"""
    db_project = map_url_project_to_db_project(project)
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="File must be an image")
    
    # Create directory structure  
    idf_dir = STATIC_ROOT / cluster / project.lower() / "idfs"
    idf_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    filename = f"{code}_logo{Path(file.filename or '').suffix}"
    file_path = idf_dir / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"message": "IDF logo uploaded successfully", "path": str(file_path.relative_to(STATIC_ROOT))}


@admin_router.post("/{cluster}/{project}/assets/{asset_type}")
async def upload_asset_admin(
    file: UploadFile = File(...),
    code: str = Form(...),
    asset_type: str = "",
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _admin: dict = Depends(get_current_admin),
):
    """Upload asset for IDF (admin only)"""
    db_project = map_url_project_to_db_project(project)
    
    # Validate asset type
    if asset_type not in ["images", "documents", "diagrams", "location", "dfo"]:
        raise HTTPException(status_code=422, detail="Invalid asset type")
    
    # Create directory structure
    asset_dir = STATIC_ROOT / cluster / project.lower() / asset_type
    asset_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename
    timestamp = int(time.time())
    file_extension = Path(file.filename or "").suffix
    filename = f"{code}_{timestamp}{file_extension}"
    file_path = asset_dir / filename
    
    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {
        "message": "Asset uploaded successfully",
        "url": f"/static/{cluster}/{project.lower()}/{asset_type}/{filename}",
        "name": file.filename,
        "kind": asset_type.rstrip('s')  # Remove plural 's'
    }


def map_db_project_to_folder_name(db_project_name: str) -> str:
    folder_name_mapping = {
        "Sabinas Project": "sabinas",
        "Trinity": "trinity",
    }
    return folder_name_mapping.get(
        db_project_name, db_project_name.lower().replace(" ", "-")
    )


def _load_media_list(value: Optional[object]) -> list[dict[str, str]]:
    if not value:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        return parsed if isinstance(parsed, list) else []
    return []


def _resolve_static_path(url: str | None) -> Optional[Path]:
    if not url:
        return None
    if url.startswith("/static/"):
        relative = url[len("/static/") :]
        return STATIC_ROOT / relative
    public_base = (settings.PUBLIC_BASE_URL or "").rstrip("/")
    if public_base and url.startswith(public_base):
        remainder = url[len(public_base) :]
        if remainder.startswith("/static/"):
            return STATIC_ROOT / remainder[len("/static/") :]
    return None


def _remove_media_file(url: str | None) -> None:
    path = _resolve_static_path(url)
    if path and path.is_file():
        try:
            path.unlink()
        except OSError:
            # Ignore errors removing files; they may already be gone
            pass


async def _write_upload(file: UploadFile, destination: Path) -> str:
    destination.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    destination.write_bytes(content)
    return f"/static/{destination.relative_to(STATIC_ROOT).as_posix()}"


async def _store_media_item(
    cluster: str,
    project: str,
    code: str,
    column: str,
    media_items: list[dict[str, str]],
) -> None:
    query = f"""
        UPDATE idfs
           SET {column} = :value,
               updated_at = NOW()
         WHERE cluster = :cluster AND project = :project AND code = :code
    """
    await database.execute(
        query,
        {
            "value": json.dumps(media_items),
            "cluster": cluster,
            "project": project,
            "code": code,
        },
    )


async def _get_idf(cluster: str, project: str, code: str) -> dict[str, object]:
    row = await database.fetch_one(
        """
        SELECT gallery, documents, diagrams, location, media
          FROM idfs
         WHERE cluster = :cluster AND project = :project AND code = :code
        """,
        {"cluster": cluster, "project": project, "code": code},
    )
    if not row:
        raise HTTPException(status_code=404, detail="IDF not found")
    return dict(row)


# ---------------------------------------------------------------------------
# Upload endpoints
# ---------------------------------------------------------------------------


@router.post("/{cluster}/{project}/assets/images")
async def upload_image(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    gallery = _load_media_list(idf.get("gallery"))

    folder_project = map_db_project_to_folder_name(db_project)
    dest_dir = STATIC_ROOT / cluster / folder_project / "images"
    extension = Path(file.filename or "image.jpg").suffix or ".jpg"
    filename = f"{code}_{len(gallery)}_{int(time.time() * 1000)}{extension}"
    file_path = dest_dir / filename

    url = await _write_upload(file, file_path)
    gallery.append({
        "url": url,
        "name": file.filename or filename,
        "kind": "image",
    })

    await _store_media_item(cluster, db_project, code, "gallery", gallery)
    return {"url": url, "message": "Image uploaded successfully"}


@router.post("/{cluster}/{project}/assets/location")
async def upload_location_image(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)

    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    locations = _load_media_list(idf.get("location"))

    folder_project = map_db_project_to_folder_name(db_project)
    dest_dir = STATIC_ROOT / cluster / folder_project / "location"
    extension = Path(file.filename or "location.jpg").suffix or ".jpg"
    filename = f"{code}_location_{int(time.time() * 1000)}{extension}"
    file_path = dest_dir / filename

    url = await _write_upload(file, file_path)
    locations.append({
        "url": url,
        "name": file.filename or filename,
        "kind": "image",
    })

    await _store_media_item(cluster, db_project, code, "location", locations)
    return {"url": url, "message": "Location image uploaded successfully"}


@router.post("/{cluster}/{project}/assets/documents")
async def upload_document(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)

    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    documents = _load_media_list(idf.get("documents"))

    folder_project = map_db_project_to_folder_name(db_project)
    dest_dir = STATIC_ROOT / cluster / folder_project / "documents"
    extension = Path(file.filename or "document.pdf").suffix or ".pdf"
    filename = f"{code}_{len(documents)}_{int(time.time() * 1000)}{extension}"
    file_path = dest_dir / filename

    url = await _write_upload(file, file_path)
    documents.append({
        "url": url,
        "name": file.filename or filename,
        "kind": "document",
    })

    await _store_media_item(cluster, db_project, code, "documents", documents)
    return {"url": url, "message": "Document uploaded successfully"}


@router.post("/{cluster}/{project}/assets/diagram")
async def upload_diagram(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    code: str = Form(...),
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)

    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    diagrams = _load_media_list(idf.get("diagrams"))

    folder_project = map_db_project_to_folder_name(db_project)
    dest_dir = STATIC_ROOT / cluster / folder_project / "diagrams"
    extension = Path(file.filename or "diagram.png").suffix or ".png"
    filename = f"{code}_diagram_{int(time.time() * 1000)}{extension}"
    file_path = dest_dir / filename

    url = await _write_upload(file, file_path)
    diagrams.append({
        "url": url,
        "name": file.filename or filename,
        "kind": "diagram",
    })

    await _store_media_item(cluster, db_project, code, "diagrams", diagrams)
    return {"url": url, "message": "Diagram uploaded successfully"}


# ---------------------------------------------------------------------------
# Logo management
# ---------------------------------------------------------------------------


@router.post("/{cluster}/{project}/assets/logo")
async def upload_logo(
    cluster: str,
    project: str,
    file: UploadFile = File(...),
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)
    logo_dir = STATIC_ROOT / cluster / folder_project
    logo_dir.mkdir(parents=True, exist_ok=True)

    for existing in logo_dir.glob("logo.*"):
        try:
            existing.unlink()
        except OSError:
            pass

    extension = Path(file.filename or "logo.png").suffix or ".png"
    file_path = logo_dir / f"logo{extension}"
    url = await _write_upload(file, file_path)
    return {"url": url, "message": "Logo uploaded successfully"}


@router.get("/{cluster}/logo")
async def get_cluster_logo(cluster: str):
    logo_dir = STATIC_ROOT / cluster
    for ext in ["png", "jpg", "jpeg", "gif", "svg"]:
        logo_path = logo_dir / f"logo.{ext}"
        if logo_path.exists():
            return {"url": f"/static/{logo_path.relative_to(STATIC_ROOT).as_posix()}"}
    return {"url": None, "message": "No logo found"}


@router.get("/{cluster}/{project}/logo")
async def get_logo(cluster: str, project: str):
    db_project = map_url_project_to_db_project(project)
    folder_project = map_db_project_to_folder_name(db_project)
    search_dirs = [STATIC_ROOT / cluster / folder_project, STATIC_ROOT / cluster]

    for directory in search_dirs:
        for ext in ["png", "jpg", "jpeg", "gif", "svg"]:
            logo_path = directory / f"logo.{ext}"
            if logo_path.exists():
                return {"url": f"/static/{logo_path.relative_to(STATIC_ROOT).as_posix()}"}
    return {"url": None, "message": "No logo found"}


@router.post("/{cluster}/{project}/assets/{code}/logo")
async def upload_idf_logo(
    cluster: str,
    project: str,
    code: str,
    file: UploadFile = File(...),
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    media = idf.get("media") or {}
    if isinstance(media, str):
        try:
            media = json.loads(media)
        except json.JSONDecodeError:
            media = {}

    folder_project = map_db_project_to_folder_name(db_project)
    logo_dir = STATIC_ROOT / cluster / folder_project / "logos"
    logo_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "logo.png").suffix or ".png"
    file_path = logo_dir / f"{code}-logo{extension}"
    url = await _write_upload(file, file_path)

    media["logo"] = {
        "name": file.filename or f"{code}-logo{extension}",
        "url": url,
    }

    await database.execute(
        """
        UPDATE idfs
           SET media = :media,
               updated_at = NOW()
         WHERE cluster = :cluster AND project = :project AND code = :code
        """,
        {
            "media": json.dumps(media),
            "cluster": cluster,
            "project": db_project,
            "code": code,
        },
    )

    return {"name": media["logo"]["name"], "url": url}


# ---------------------------------------------------------------------------
# Delete assets
# ---------------------------------------------------------------------------


ASSET_COLUMN_MAP = {
    "images": "gallery",
    "documents": "documents",
    "diagrams": "diagrams",
    "location": "location",
}


@router.delete("/{cluster}/{project}/assets/{code}/{asset_type}/{index}")
async def delete_media_asset(
    cluster: str,
    project: str,
    code: str,
    asset_type: str,
    index: int,
    _admin: dict = Depends(get_current_admin),
):
    validate_cluster(cluster)
    if asset_type not in ASSET_COLUMN_MAP:
        raise HTTPException(status_code=400, detail="Unsupported asset type")

    db_project = map_url_project_to_db_project(project)
    idf = await _get_idf(cluster, db_project, code)
    column = ASSET_COLUMN_MAP[asset_type]
    media_items = _load_media_list(idf.get(column))

    if index < 0 or index >= len(media_items):
        raise HTTPException(status_code=404, detail="Asset not found")

    removed = media_items.pop(index)
    await _store_media_item(cluster, db_project, code, column, media_items)
    _remove_media_file(removed.get("url"))

    return {"message": "Asset deleted", "item": removed}


__all__ = ["router", "admin_router"]
