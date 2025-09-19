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
    import urllib.parse
    # Decode URL encoded project name
    decoded_project = urllib.parse.unquote(project)
    
    project_mapping = {
        "sabinas": "Sabinas Project",
        "Sabinas": "Sabinas Project",
        "Sabinas Project": "Sabinas Project",
        "Sabinas%20Project": "Sabinas Project",  # Handle URL format
        "monclova": "Monclova Project",
        "Monclova": "Monclova Project", 
        "Monclova Project": "Monclova Project",
        "Monclova%20Project": "Monclova Project",  # Handle URL format
        "trinity": "Trinity",
        "Trinity": "Trinity",
        # Add mappings for trk cluster
        "trinity/sabinas": "Sabinas Project",
        "sabinas/trinity": "Sabinas Project",
        # Add more mappings as needed
    }
    return project_mapping.get(decoded_project, decoded_project)


def map_db_project_to_static_path(project: str) -> str:
    """Map database project name to static file path"""
    project_to_path = {
        "Sabinas Project": "sabinas",
        "Monclova Project": "monclova",
        "Trinity": "trinity",
        "sabinas": "sabinas",
        "monclova": "monclova",
        "trinity": "trinity"
    }
    return project_to_path.get(project, project.lower().replace(' ', ''))


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

        # Handle NULL values by providing defaults
        idf_data["gallery"] = idf_data.get("gallery") or "[]"
        idf_data["documents"] = idf_data.get("documents") or "[]"
        idf_data["diagram"] = idf_data.get("diagram") or None
        idf_data["table_data"] = idf_data.get("table_data") or None
        idf_data["location"] = idf_data.get("location") or None
        idf_data["title"] = idf_data.get("title") or idf_data.get("code", "")
        idf_data["site"] = idf_data.get("site") or ""
        idf_data["room"] = idf_data.get("room") or ""

        if include_health and idf_data.get("table_data"):
            table_data = json.loads(idf_data["table_data"]) if isinstance(idf_data["table_data"], str) else idf_data["table_data"]
            health = compute_health(table_data)

        # Parse gallery field for each IDF
        if isinstance(idf_data["gallery"], str) and idf_data["gallery"]:
            idf_data["gallery"] = json.loads(idf_data["gallery"])
        else:
            idf_data["gallery"] = []
            
        if isinstance(idf_data["documents"], str) and idf_data["documents"]:
            idf_data["documents"] = json.loads(idf_data["documents"])
        else:
            idf_data["documents"] = []
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

        # Parse location field for index (simplified version)
        location_available = False
        if idf_data.get("location"):
            try:
                if isinstance(idf_data["location"], str):
                    location_data = json.loads(idf_data["location"])
                else:
                    location_data = idf_data["location"]
                
                if isinstance(location_data, list) and len(location_data) > 0:
                    location_available = True
                elif isinstance(location_data, dict) and location_data.get("url"):
                    location_available = True
            except (json.JSONDecodeError, TypeError):
                location_available = False

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

    # Handle NULL values by providing defaults
    idf_dict["gallery"] = idf_dict.get("gallery") or "[]"
    idf_dict["documents"] = idf_dict.get("documents") or "[]"
    idf_dict["diagram"] = idf_dict.get("diagram") or None
    idf_dict["table_data"] = idf_dict.get("table_data") or None
    idf_dict["location"] = idf_dict.get("location") or None
    idf_dict["title"] = idf_dict.get("title") or idf_dict.get("code", "")
    idf_dict["site"] = idf_dict.get("site") or ""
    idf_dict["room"] = idf_dict.get("room") or ""
    idf_dict["description"] = idf_dict.get("description") or None

    # Parse JSON fields
    if isinstance(idf_dict["gallery"], str) and idf_dict["gallery"]:
        idf_dict["gallery"] = json.loads(idf_dict["gallery"])
    else:
        idf_dict["gallery"] = []
        
    if isinstance(idf_dict["documents"], str) and idf_dict["documents"]:
        idf_dict["documents"] = json.loads(idf_dict["documents"])
    else:
        idf_dict["documents"] = []
    # Parse diagrams field (handle both old single diagram and new array)
    diagrams_data = []
    if idf_dict.get("diagram"):
        if isinstance(idf_dict["diagram"], str):
            try:
                parsed_diagram = json.loads(idf_dict["diagram"])
                if isinstance(parsed_diagram, list):
                    diagrams_data = parsed_diagram
                elif parsed_diagram:
                    diagrams_data = [parsed_diagram]
            except (json.JSONDecodeError, TypeError):
                pass
        elif isinstance(idf_dict["diagram"], list):
            diagrams_data = idf_dict["diagram"]
        elif idf_dict["diagram"]:
            diagrams_data = [idf_dict["diagram"]]
    elif idf_dict.get("diagrams"):
        if isinstance(idf_dict["diagrams"], str):
            try:
                diagrams_data = json.loads(idf_dict["diagrams"])
            except (json.JSONDecodeError, TypeError):
                diagrams_data = []
        elif isinstance(idf_dict["diagrams"], list):
            diagrams_data = idf_dict["diagrams"]

    idf_dict["diagrams"] = diagrams_data

    # Parse dfo field and table data - check if table_data contains DFO information
    dfo = None
    table_data = None
    
    try:
        # Check if table_data contains DFO information (as shown in database screenshot)
        if idf_dict.get("table_data"):
            table_data_raw = idf_dict["table_data"]
            
            # Parse table_data if it's a string
            if isinstance(table_data_raw, str):
                try:
                    parsed_data = json.loads(table_data_raw)
                except json.JSONDecodeError:
                    parsed_data = table_data_raw
            else:
                parsed_data = table_data_raw
            
            # Check if parsed_data is the DFO object itself (has url, kind, name but no columns/rows)
            if isinstance(parsed_data, dict) and "url" in parsed_data and "kind" in parsed_data and "columns" not in parsed_data:
                dfo = {
                    "name": parsed_data.get("name", f"{idf_dict['code']}_dfo.png"),
                    "url": parsed_data["url"],
                    "kind": parsed_data.get("kind", "image")
                }
                dfo = convert_relative_urls_to_absolute(dfo)
                # Since table_data contained DFO info, there's no actual table data
                table_data = None
            elif isinstance(parsed_data, dict) and "columns" in parsed_data and "rows" in parsed_data:
                # This is actual table data
                table_data = parsed_data
            else:
                # Neither DFO nor table data, set both to None/defaults
                table_data = parsed_data if isinstance(parsed_data, dict) else None
        
        # If no DFO found in table_data, check other sources
        if not dfo:
            # Check if there's a direct url column
            if idf_dict.get("url"):
                dfo = {
                    "name": f"{idf_dict['code']}_dfo.png",
                    "url": idf_dict["url"],
                    "kind": "image"
                }
                dfo = convert_relative_urls_to_absolute(dfo)
            
            # Then check if there's a dedicated dfo field
            elif idf_dict.get("dfo"):
                dfo_data = json.loads(idf_dict["dfo"]) if isinstance(idf_dict["dfo"], str) else idf_dict["dfo"]
                # Handle both array and single object formats
                if isinstance(dfo_data, list) and len(dfo_data) > 0:
                    dfo_item = dfo_data[0]  # Take first item from array
                    dfo = convert_relative_urls_to_absolute(dfo_item)
                elif isinstance(dfo_data, dict):
                    dfo = convert_relative_urls_to_absolute(dfo_data)
            
            # If still no DFO data, create a default one based on the IDF code
            if not dfo:
                dfo = {
                    "name": f"{idf_dict['code']}_dfo.png",
                    "url": f"/static/{cluster}/{map_db_project_to_static_path(map_url_project_to_db_project(project))}/dfo/{idf_dict['code']}_dfo.png",
                    "kind": "image"
                }
        
    except Exception as e:
        print(f"Error parsing DFO data for {idf_dict['code']}: {e}")
        # Fallback to default DFO
        dfo = {
            "name": f"{idf_dict['code']}_dfo.png", 
            "url": f"/static/{cluster}/{map_db_project_to_static_path(map_url_project_to_db_project(project))}/dfo/{idf_dict['code']}_dfo.png",
            "kind": "image"
        }
        table_data = None

    # Compute health if table exists
    health = None
    if table_data and isinstance(table_data, dict):
        health = compute_health(table_data)

    # Parse location field (handle array format from database)
    location = None
    if idf_dict.get("location"):
        try:
            # Handle string JSON data
            if isinstance(idf_dict["location"], str):
                location_data = json.loads(idf_dict["location"])
            else:
                location_data = idf_dict["location"]
            
            # Handle both array and single object formats
            if isinstance(location_data, list) and len(location_data) > 0:
                location_item = location_data[0]  # Take first item from array
                location = convert_relative_urls_to_absolute(location_item)
            elif isinstance(location_data, dict):
                location = convert_relative_urls_to_absolute(location_data)
            else:
                print(f"Unexpected location data format for {idf_dict['code']}: {type(location_data)}")
                location = None
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing location data for {idf_dict['code']}: {e}")
            location = None

    # Parse media field
    media = None
    if idf_dict.get("media"):
        try:
            media_data = json.loads(idf_dict["media"]) if isinstance(idf_dict["media"], str) else idf_dict["media"]
            media_data = convert_relative_urls_to_absolute(media_data)
            if media_data.get("logo"):
                from app.models.idf_models import IdfMedia, MediaLogo
                media = IdfMedia(logo=MediaLogo(**media_data["logo"]))
        except (json.JSONDecodeError, TypeError):
            media = None

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
        dfo=dfo,
        location=location,
        table=table_data,
        health=health,
        media=media
    )