"""Pydantic models for IDF and user domain objects."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

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
    title: str = ""
    site: Optional[str] = ""
    room: Optional[str] = ""
    health: Optional[IdfHealth] = None
    media: Optional[IdfMedia] = None


class IdfPublic(BaseModel):
    cluster: str
    project: str
    code: str
    title: str = ""
    description: Optional[str] = None
    site: Optional[str] = ""
    room: Optional[str] = ""
    gallery: List[MediaItem] = Field(default_factory=list)
    documents: List[MediaItem] = Field(default_factory=list)
    diagrams: List[MediaItem] = Field(default_factory=list)
    dfo: Optional[MediaItem] = None
    location: Optional[MediaItem] = None
    location_items: List[MediaItem] = Field(default_factory=list)
    table: Optional[IdfTable] = None
    health: Optional[IdfHealth] = None
    media: Optional[IdfMedia] = None


class IdfUpsert(BaseModel):
    title: str
    description: Optional[str] = None
    site: Optional[str] = None
    room: Optional[str] = None
    gallery: List[MediaItem] = Field(default_factory=list)
    documents: List[MediaItem] = Field(default_factory=list)
    diagrams: List[MediaItem] = Field(default_factory=list)
    location: List[MediaItem] = Field(default_factory=list)
    dfo: Optional[MediaItem] = None
    table: Optional[IdfTable] = None


class IdfCreate(IdfUpsert):
    code: str


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
