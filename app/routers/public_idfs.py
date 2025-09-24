import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.database import database
from app.models.idf_models import IdfHealth, HealthCounts, IdfIndex, IdfPublic, MediaItem
from app.routers.auth import get_current_user
from app.core.config import settings


router = APIRouter(tags=["public"])


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
        "Sabinas%20Project": "Sabinas Project",
        "trinity": "Trinity",
        "Trinity": "Trinity",
        "trinity/sabinas": "Sabinas Project",
        "sabinas/trinity": "Sabinas Project",
    }
    return project_mapping.get(decoded_project, decoded_project)


def compute_health(table_data: Optional[Dict[str, Any]]):
    """Compute health status based on table data status values"""
    if not table_data:
        return {
            "level": "gray",
            "counts": {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
        }

    if not isinstance(table_data, dict):
        return {
            "level": "gray",
            "counts": {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
        }

    rows = table_data.get("rows", [])
    if not rows:
        return {
            "level": "green",
            "counts": {"ok": 1, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
        }

    counts = {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}

    for row in rows:
        status = row.get("status", "").lower()
        if status in counts:
            counts[status] += 1

    if counts["falla"] > 0:
        level = "red"
    elif counts["revision"] > 0:
        level = "yellow"
    elif counts["ok"] > 0:
        level = "green"
    else:
        level = "gray"

    return {"level": level, "counts": counts}


def convert_relative_to_absolute(paths, single_value=False):
    """Convert relative paths to relative URLs for proper static file serving"""
    if paths is None:
        return None if single_value else []

    if isinstance(paths, str):
        if not paths:
            return None if single_value else []
        # Try to parse as JSON first
        try:
            parsed_paths = json.loads(paths)
            # If it's a list, process each item
            if isinstance(parsed_paths, list):
                if single_value:
                    # For single value fields, return first item or None
                    return f"/static/{parsed_paths[0]}" if parsed_paths else None
                else:
                    return [f"/static/{path}" for path in parsed_paths if path]
            # If it's a single string
            elif isinstance(parsed_paths, str) and parsed_paths:
                if single_value:
                    return f"/static/{parsed_paths}"
                else:
                    return [f"/static/{parsed_paths}"]
            return None if single_value else []
        except (json.JSONDecodeError, TypeError):
            # If not JSON, treat as single path
            if single_value:
                return f"/static/{paths}"
            else:
                return [f"/static/{paths}"]
    elif isinstance(paths, list):
        if not paths:  # Empty list
            return None if single_value else []
        if single_value:
            # For single value fields, return first item or None
            return f"/static/{paths[0]}" if paths else None
        else:
            return [f"/static/{path}" for path in paths if path]

    return None if single_value else []


@router.get("/{cluster}/{project}/idfs")
async def list_idfs(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    include_health: int = Query(0, description="Include health computation"),
    _current_user: dict = Depends(get_current_user),
):
    """Get list of IDFs for a cluster/project"""
    db_project = map_url_project_to_db_project(project)

    base_query = "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project"
    params = {"cluster": cluster, "project": db_project}

    if q:
        base_query += " AND (code ILIKE :q OR title ILIKE :q OR site ILIKE :q OR room ILIKE :q)"
        params["q"] = f"%{q}%"

    base_query += " ORDER BY title OFFSET :skip LIMIT :limit"
    params["skip"] = skip
    params["limit"] = limit

    rows = await database.fetch_all(base_query, params)

    result = []
    for row in rows:
        health = None
        idf_data = dict(row)

        if include_health and idf_data.get("table_data"):
            table_data = json.loads(idf_data["table_data"]) if isinstance(idf_data["table_data"], str) else idf_data["table_data"]
            health = compute_health(table_data)

        # Parse DFO data with URL cleaning
        dfo_data = idf_data.get("dfo") # Changed from row.get("dfo") to idf_data.get("dfo")
        if dfo_data:
            try:
                parsed_dfo = json.loads(dfo_data) if isinstance(dfo_data, str) else dfo_data
                if isinstance(parsed_dfo, list) and len(parsed_dfo) > 0:
                    # Clean up any malformed URLs in DFO data
                    first_dfo = parsed_dfo[0]
                    if isinstance(first_dfo, dict) and "url" in first_dfo:
                        url = first_dfo["url"]
                        # Clean malformed URLs that contain nested structures
                        if "replit.dev" in url or "{'url':" in url:
                            # Try to extract clean path from malformed URL
                            import re
                            match = re.search(r'/static/([^\'"}]+)', url)
                            if match:
                                clean_url = f"/static/{match.group(1)}"
                                first_dfo["url"] = clean_url
                        elif not url.startswith("/static/"):
                            first_dfo["url"] = f"/static/{url}"
                    idf_data["dfo"] = first_dfo # Changed from result["dfo"] to idf_data["dfo"]
            except (json.JSONDecodeError, TypeError):
                idf_data["dfo"] = None # Changed from result["dfo"] to idf_data["dfo"]
        else:
            idf_data["dfo"] = None # Changed from result["dfo"] to idf_data["dfo"]


        result.append(IdfIndex(
            cluster=idf_data["cluster"],
            project=idf_data["project"],
            code=idf_data["code"],
            title=idf_data.get("title", ""),
            site=idf_data.get("site", ""),
            room=idf_data.get("room", ""),
            health=health,
            logo=convert_relative_to_absolute(idf_data.get("logo"), single_value=True) if idf_data.get("logo") else None
        ))

    return result


@router.get("/{cluster}/{project}/logo")
async def get_logo(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _current_user: dict = Depends(get_current_user),
):
    """Get logo for cluster/project"""
    db_project = map_url_project_to_db_project(project)

    # Check if there's any IDF with a logo in the database first
    idf_with_logo = await database.fetch_one(
        "SELECT logo FROM idfs WHERE cluster = :cluster AND project = :project AND logo IS NOT NULL LIMIT 1",
        {"cluster": cluster, "project": db_project}
    )

    if idf_with_logo and idf_with_logo["logo"]:
        logo_path = idf_with_logo["logo"]
        # Check if file exists
        full_path = Path(f"static/{logo_path}")
        if full_path.exists():
            return {"url": f"/static/{logo_path}"}

    # Check if there's a specific IDF with media containing logo (legacy support)
    idf = await database.fetch_one(
        "SELECT media FROM idfs WHERE cluster = :cluster AND project = :project LIMIT 1",
        {"cluster": cluster, "project": db_project}
    )

    if idf and idf["media"]:
        try:
            media_data = json.loads(idf["media"]) if isinstance(idf["media"], str) else idf["media"]
            if media_data and "logo" in media_data and media_data["logo"]:
                logo_url = media_data["logo"]["url"]
                if logo_url:
                    return {"url": logo_url}
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Fallback to filesystem logo
    project_path_str = project.lower().replace(" ", "")
    logo_path = Path(f"static/{cluster}/{project_path_str}/logo.png")

    if logo_path.exists():
        return {"url": f"/static/{cluster}/{project_path_str}/logo.png"}

    # Fallback to cluster logo
    cluster_logo_path = Path(f"static/{cluster}/logo.png")
    if cluster_logo_path.exists():
        return {"url": f"/static/{cluster}/logo.png"}

    raise HTTPException(status_code=404, detail="Logo not found")


@router.get("/{cluster}/{project}/idfs/{code}")
async def get_idf(
    code: str,
    cluster: str = Depends(validate_cluster),
    project: str = "",
    _current_user: dict = Depends(get_current_user),
):
    """Get a specific IDF by code"""
    db_project = map_url_project_to_db_project(project)

    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code}
    )

    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")

    idf_dict = dict(idf)

    # Compute health if table exists
    health = None
    if idf_dict.get("table_data"):
        table_data = json.loads(idf_dict["table_data"]) if isinstance(idf_dict["table_data"], str) else idf_dict["table_data"]
        health = compute_health(table_data)

    # Parse table_data properly
    table_data = None
    if idf_dict.get("table_data"):
        try:
            if isinstance(idf_dict["table_data"], str):
                table_data = json.loads(idf_dict["table_data"])
            else:
                table_data = idf_dict["table_data"]

            # Ensure table_data is either None or a proper dict with columns and rows
            if isinstance(table_data, list):
                table_data = None
            elif isinstance(table_data, dict) and not table_data.get("columns"):
                table_data = None
        except (json.JSONDecodeError, TypeError):
            table_data = None

    # Helper function to parse JSON fields safely
    def parse_asset_field(field_data):
        if field_data is None:
            return []
        if isinstance(field_data, list):
            return field_data
        if isinstance(field_data, str):
            if not field_data.strip():
                return []
            try:
                parsed = json.loads(field_data)
                return parsed if isinstance(parsed, list) else [parsed] if parsed else []
            except (json.JSONDecodeError, TypeError):
                return [field_data] if field_data.strip() else []
        return field_data

    # This section was modified to correctly handle the location field
    location_item = None
    if idf_dict.get("location"):
        location_value = idf_dict["location"]
        if isinstance(location_value, str):
            try:
                # Try to parse as JSON first (new format)
                location_data = json.loads(location_value)
                if isinstance(location_data, str):
                    # It's a JSON string containing the path
                    # Ensure the path has /static/ prefix
                    clean_path = location_data
                    if not clean_path.startswith("/static/"):
                        clean_path = f"/static/{clean_path}"
                    location_item = MediaItem(
                        url=clean_path,
                        name="Location Image",
                        kind="image"
                    )
            except json.JSONDecodeError:
                # Fallback to old format (direct string path)
                clean_path = location_value
                if not clean_path.startswith("/static/"):
                    clean_path = f"/static/{clean_path}"
                location_item = MediaItem(
                    url=clean_path,
                    name="Location Image",
                    kind="image"
                )
        elif isinstance(location_value, dict):
            # Already a dict format
            location_item = MediaItem(**location_value)

    # Process documents with proper structure preservation
    documents_data = parse_asset_field(idf_dict.get("documents", []))
    processed_documents = []
    
    # Debug: print raw documents data
    print(f"Raw documents from DB: {idf_dict.get('documents', [])}")
    print(f"Parsed documents data: {documents_data}")
    
    for doc in documents_data:
        if isinstance(doc, dict):
            # Preserve all fields and fix URL
            url = doc.get("url", "")
            if not url.startswith("/static/"):
                url = f"/static/{url}"
            doc_item = {
                "url": url,
                "title": doc.get("title", ""),
                "name": doc.get("name", ""),
                "kind": doc.get("kind", "document")
            }
            print(f"Processed document: {doc_item}")
            processed_documents.append(doc_item)
        elif isinstance(doc, str):
            # String format - create basic structure
            url = doc if doc.startswith("/static/") else f"/static/{doc}"
            doc_item = {
                "url": url,
                "title": "",
                "name": "",
                "kind": "document"
            }
            print(f"Processed string document: {doc_item}")
            processed_documents.append(doc_item)

    return IdfPublic(
        cluster=idf_dict["cluster"],</old_str></old_str>

    return IdfPublic(
        cluster=idf_dict["cluster"],
        project=idf_dict["project"],
        code=idf_dict["code"],
        title=idf_dict.get("title", ""),
        description=idf_dict.get("description"),
        site=idf_dict.get("site", ""),
        room=idf_dict.get("room", ""),
        images=convert_relative_to_absolute(parse_asset_field(idf_dict.get("images", []))),
        documents=processed_documents,
        diagrams=convert_relative_to_absolute(parse_asset_field(idf_dict.get("diagrams", []))),
        location=location_item.url if location_item else None,
        dfo=convert_relative_to_absolute(parse_asset_field(idf_dict.get("dfo", []))),
        logo=convert_relative_to_absolute(parse_asset_field(idf_dict.get("logo")), single_value=True) if idf_dict.get("logo") else None,
        table=table_data,
        health=health
    )</old_str>
        diagrams=convert_relative_to_absolute(parse_asset_field(idf_dict.get("diagrams", []))),
        location=location_item.url if location_item else None,
        dfo=convert_relative_to_absolute(parse_asset_field(idf_dict.get("dfo", []))),
        logo=convert_relative_to_absolute(parse_asset_field(idf_dict.get("logo")), single_value=True) if idf_dict.get("logo") else None,
        table=table_data,
        health=health
    )