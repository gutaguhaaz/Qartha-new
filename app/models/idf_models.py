from typing import Optional, List, Dict, Any, Union
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class MediaItem(BaseModel):
    url: Union[HttpUrl, str]
    name: Optional[str] = None
    kind: str  # "image" | "document" | "diagram"


class TableColumn(BaseModel):
    key: str
    label: str
    type: str  # "text" | "number" | "date" | "select" | "status"
    options: Optional[List[str]] = None


class IdfTable(BaseModel):
    columns: List[TableColumn]
    rows: List[Dict[str, Any]]
    dfo_image: Optional[str] = None


class HealthCounts(BaseModel):
    ok: int
    revision: int
    falla: int
    libre: int
    reservado: int


class IdfHealth(BaseModel):
    level: str  # "green" | "yellow" | "red" | "gray"
    counts: HealthCounts


class MediaLogo(BaseModel):
    name: str
    url: Union[HttpUrl, str]


class IdfMedia(BaseModel):
    logo: Optional[MediaLogo] = None


class IdfIndex(BaseModel):
    cluster: str
    project: str
    code: str
    title: str
    site: Optional[str] = None
    room: Optional[str] = None
    health: Optional[IdfHealth] = None
    media: Optional[IdfMedia] = None


class IdfPublic(BaseModel):
    cluster: str
    project: str
    code: str
    title: str
    description: Optional[str] = None
    site: Optional[str] = None
    room: Optional[str] = None
    gallery: List[MediaItem]
    documents: List[MediaItem]
    diagrams: List[MediaItem]
    location: Optional[MediaItem] = None
    table: Optional[IdfTable] = None
    health: Optional[IdfHealth] = None
    media: Optional[IdfMedia] = None


class IdfUpsert(BaseModel):
    title: str
    description: Optional[str] = None
    site: Optional[str] = None
    room: Optional[str] = None
    table: Optional[IdfTable] = None


class IdfCreate(IdfUpsert):
    code: str
    site: str


class Device(BaseModel):
    cluster: str
    project: str
    idf_code: str
    name: str
    model: Optional[str] = None
    serial: Optional[str] = None
    rack: Optional[str] = None
    site: Optional[str] = None
    notes: Optional[str] = None

