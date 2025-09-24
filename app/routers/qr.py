import io
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.core.config import settings
from app.db.database import database
from app.routers.auth import get_current_user


router = APIRouter(tags=["qr"])


def _absolute_frontend_url(request: Request, cluster: str, project: str, code: str) -> str:
    """
    Construye URL absoluta hacia la vista pública del IDF.
    Prioriza PUBLIC_BASE_URL (producción). Si no existe, infiere del request (demo).
    """
    base = settings.PUBLIC_BASE_URL
    if not base:
        # Ej: http://host:port  (sin path)
        base = str(request.base_url).rstrip("/")
    
    # Map project name for URL - handle both old and new format
    project_mapping = {
        "Sabinas Project": "sabinas",
        "Sabinas": "sabinas", 
        "Monclova Project": "monclova",
        "Monclova": "monclova",
        "Trinity": "trinity",
        "trinity": "trinity"
    }
    url_project = project_mapping.get(project, project.lower().replace(" ", ""))
    
    # Front SPA route (without hash):
    return f"{base}/{cluster}/{url_project}/idf/{code}"


@router.get("/{cluster}/{project}/idfs/{code}/qr.png")
async def get_idf_qr_png(
    cluster: str,
    project: str,
    code: str,
    request: Request,
    _current_user: dict = Depends(get_current_user),
):
    # verifica existencia
    doc = await database.fetch_one(
        "SELECT * FROM idfs WHERE cluster = :cluster AND project = :project AND code = :code",
        {"cluster": cluster, "project": project, "code": code}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="IDF no encontrado")

    url = _absolute_frontend_url(request, cluster, project, code)

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")
