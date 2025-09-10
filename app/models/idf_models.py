from pydantic import BaseModel, Field, HttpUrl
from pydantic_core import ValidationError
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class MediaItem(BaseModel):
    url: Union[HttpUrl, str]  # Allow both absolute URLs and relative paths
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


class HealthCounts(BaseModel):
    ok: int
    revision: int
    falla: int
    libre: int
    reservado: int


class IdfHealth(BaseModel):
    level: str  # "green" | "yellow" | "red" | "gray"
    counts: HealthCounts


class IdfIndex(BaseModel):
    cluster: str
    project: str
    code: str
    title: str
    site: Optional[str] = None
    room: Optional[str] = None
    health: Optional[IdfHealth] = None


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
    diagram: Optional[MediaItem] = None
    table: Optional[IdfTable] = None
    health: Optional[IdfHealth] = None


class IdfUpsert(BaseModel):
    title: str
    description: Optional[str] = None
    site: Optional[str] = None
    room: Optional[str] = None
    table: Optional[IdfTable] = None


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