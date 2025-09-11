import json
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from app.db.mongo import database
from app.models.idf_models import IdfIndex, IdfPublic, IdfHealth, HealthCounts
from app.core.config import settings


router = APIRouter(tags=["public"])


def validate_cluster(cluster: str):
    """Validate that cluster is in allowed clusters"""
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster


def map_url_project_to_db_project(project: str) -> str:
    """Map URL project name to database project name"""
    project_mapping = {
        "sabinas": "Sabinas Project",
        "Sabinas%20Project": "Sabinas Project",
        "Sabinas Project": "Sabinas Project",
        # Add more mappings as needed
    }
    return project_mapping.get(project, project)


def compute_health(table_data: dict) -> Optional[IdfHealth]:
    """Compute health status from table rows"""
    if not table_data or not table_data.get("rows"):
        return None

    # Find status column
    status_column = None
    for col in table_data.get("columns", []):
        if col.get("type") == "status" or col.get("key") in ["status", "estado"]:
            status_column = col.get("key")
            break

    if not status_column:
        return None

    # Count status values
    counts = {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}

    for row in table_data["rows"]:
        status = row.get(status_column, "").lower()
        if status == "ok":
            counts["ok"] += 1
        elif status == "revisión":
            counts["revision"] += 1
        elif status == "falla":
            counts["falla"] += 1
        elif status == "libre":
            counts["libre"] += 1
        elif status == "reservado":
            counts["reservado"] += 1

    # Determine level
    if counts["falla"] > 0:
        level = "red"
    elif counts["revision"] > 0:
        level = "yellow"
    elif (counts["ok"] + counts["libre"] + counts["reservado"]) > 0:
        level = "green"
    else:
        level = "gray"

    return IdfHealth(
        level=level,
        counts=HealthCounts(**counts)
    )


@router.get("/{cluster}/{project}/idfs")
async def list_idfs(
    cluster: str = Depends(validate_cluster),
    project: str = "",
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    include_health: int = Query(0, description="Include health computation")
):
    """Get list of IDFs for a cluster/project"""
    # Map URL project to database project
    db_project = map_url_project_to_db_project(project)
    print(f"Listing IDFs for cluster: {cluster}, project: {project} (db_project: {db_project})")

    # Build SQL query
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
        idf_data = dict(row)  # Convert row to dict for easier processing

        if include_health and idf_data.get("table_data"):
            table_data = json.loads(idf_data["table_data"]) if isinstance(idf_data["table_data"], str) else idf_data["table_data"]
            health = compute_health(table_data)

        # Parse gallery field for each IDF
        if isinstance(idf_data["gallery"], str):
            idf_data["gallery"] = json.loads(idf_data["gallery"])
        if isinstance(idf_data["documents"], str):
            idf_data["documents"] = json.loads(idf_data["documents"])
        # Parse diagrams field (handle both old single diagram and new array)
        diagrams_data = []
        if "diagram" in idf_data and idf_data["diagram"]:
            if isinstance(idf_data["diagram"], str):
                parsed_diagram = json.loads(idf_data["diagram"])
                if isinstance(parsed_diagram, list):
                    diagrams_data = parsed_diagram
                elif parsed_diagram:
                    diagrams_data = [parsed_diagram]
            elif isinstance(idf_data["diagram"], list):
                diagrams_data = idf_data["diagram"]
            elif idf_data["diagram"]:
                diagrams_data = [idf_data["diagram"]]
        elif "diagrams" in idf_data and idf_data["diagrams"]:
            if isinstance(idf_data["diagrams"], str):
                diagrams_data = json.loads(idf_data["diagrams"])
            elif isinstance(idf_data["diagrams"], list):
                diagrams_data = idf_data["diagrams"]

        idf_data["diagrams"] = diagrams_data

        # Parse devices field if it exists and is a string
        if idf_data.get("devices") and isinstance(idf_data["devices"], str):
            idf_data["devices"] = json.loads(idf_data["devices"])

        # Parse media field
        media = None
        if idf_data.get("media"):
            media_data = json.loads(idf_data["media"]) if isinstance(idf_data["media"], str) else idf_data["media"]
            media_data = convert_relative_urls_to_absolute(media_data)
            if media_data.get("logo"):
                from app.models.idf_models import IdfMedia, MediaLogo
                media = IdfMedia(logo=MediaLogo(**media_data["logo"]))

        # Convert relative URLs to absolute URLs
        idf_data["gallery"] = convert_relative_urls_to_absolute(idf_data["gallery"])
        idf_data["documents"] = convert_relative_urls_to_absolute(idf_data["documents"])
        idf_data["diagrams"] = convert_relative_urls_to_absolute(idf_data["diagrams"])

        result.append(IdfIndex(
            cluster=idf_data["cluster"],
            project=idf_data["project"],
            code=idf_data["code"],
            title=idf_data["title"],
            site=idf_data["site"],
            room=idf_data["room"],
            health=health,
            media=media
        ))

    return result


def convert_relative_urls_to_absolute(data: Any) -> Any:
    """Convert relative URLs to absolute URLs"""
    if isinstance(data, dict):
        if "url" in data and isinstance(data["url"], str):
            if data["url"].startswith("/static"):
                data = data.copy()
                data["url"] = f"{settings.PUBLIC_BASE_URL}{data['url']}"
            elif not data["url"].startswith(("http://", "https://", settings.PUBLIC_BASE_URL)):
                # Handle relative URLs that don't start with /static
                data = data.copy()
                if data["url"].startswith("/"):
                    data["url"] = f"{settings.PUBLIC_BASE_URL}{data['url']}"
                else:
                    data["url"] = f"{settings.PUBLIC_BASE_URL}/static/{data['url']}"
        return {k: convert_relative_urls_to_absolute(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_relative_urls_to_absolute(item) for item in data]
    return data


@router.get("/{cluster}/{project}/idfs/{code}")
async def get_idf(
    code: str,
    cluster: str = Depends(validate_cluster),
    project: str = ""
):
    """Get a specific IDF by code"""
    # Map URL project to database project
    db_project = map_url_project_to_db_project(project)
    
    idf = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": db_project, "code": code}
    )

    if not idf:
        raise HTTPException(status_code=404, detail="IDF not found")

    # Convert to dict for processing
    idf_dict = dict(idf)

    # Parse JSON fields
    if isinstance(idf_dict["gallery"], str):
        idf_dict["gallery"] = json.loads(idf_dict["gallery"])
    if isinstance(idf_dict["documents"], str):
        idf_dict["documents"] = json.loads(idf_dict["documents"])
    # Parse diagrams field (handle both old single diagram and new array)
    diagrams_data = []
    if "diagram" in idf_dict and idf_dict["diagram"]:
        if isinstance(idf_dict["diagram"], str):
            parsed_diagram = json.loads(idf_dict["diagram"])
            if isinstance(parsed_diagram, list):
                diagrams_data = parsed_diagram
            elif parsed_diagram:
                diagrams_data = [parsed_diagram]
        elif isinstance(idf_dict["diagram"], list):
            diagrams_data = idf_dict["diagram"]
        elif idf_dict["diagram"]:
            diagrams_data = [idf_dict["diagram"]]
    elif "diagrams" in idf_dict and idf_dict["diagrams"]:
        if isinstance(idf_dict["diagrams"], str):
            diagrams_data = json.loads(idf_dict["diagrams"])
        elif isinstance(idf_dict["diagrams"], list):
            diagrams_data = idf_dict["diagrams"]

    idf_dict["diagrams"] = diagrams_data

    # Parse table data
    if isinstance(idf_dict.get("table_data"), str) and idf_dict["table_data"]:
        idf_dict["table"] = json.loads(idf_dict["table_data"])
    else:
        idf_dict["table"] = idf_dict.get("table_data")

    # Compute health if table exists
    health = None
    if idf_dict.get("table"):
        health = compute_health(idf_dict["table"])

    # Parse location field (handle array format from database)
    location = None
    if idf_dict.get("location"):
        location_data = json.loads(idf_dict["location"]) if isinstance(idf_dict["location"], str) else idf_dict["location"]
        # Handle both array and single object formats
        if isinstance(location_data, list) and len(location_data) > 0:
            location_item = location_data[0]  # Take first item from array
            location = convert_relative_urls_to_absolute(location_item)
        elif isinstance(location_data, dict):
            location = convert_relative_urls_to_absolute(location_data)

    # Parse media field
    media = None
    if idf_dict.get("media"):
        media_data = json.loads(idf_dict["media"]) if isinstance(idf_dict["media"], str) else idf_dict["media"]
        media_data = convert_relative_urls_to_absolute(media_data)
        if media_data.get("logo"):
            from app.models.idf_models import IdfMedia, MediaLogo
            media = IdfMedia(logo=MediaLogo(**media_data["logo"]))

    # Convert relative URLs to absolute URLs
    idf_dict["gallery"] = convert_relative_urls_to_absolute(idf_dict["gallery"])
    idf_dict["documents"] = convert_relative_urls_to_absolute(idf_dict["documents"])
    idf_dict["diagrams"] = convert_relative_urls_to_absolute(idf_dict["diagrams"])

    return IdfPublic(
        cluster=idf_dict["cluster"],
        project=idf_dict["project"],
        code=idf_dict["code"],
        title=idf_dict.get("title", idf_dict.get("name", "")),
        description=idf_dict.get("description"),
        site=idf_dict.get("site"),
        room=idf_dict.get("room"),
        gallery=convert_relative_urls_to_absolute(idf_dict["gallery"]),
        documents=convert_relative_urls_to_absolute(idf_dict["documents"]),
        diagrams=convert_relative_urls_to_absolute(idf_dict["diagrams"]),
        location=location,
        table=idf_dict["table"],
        health=health,
        media=media
    )