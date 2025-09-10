
# Qartha Backend Documentation

## Arquitectura General

El backend de Qartha está construido con **FastAPI** usando Python 3.11+ y sigue una arquitectura asíncrona modular. El sistema implementa un patrón multi-tenant con separación por cluster y proyecto a nivel de URL.

### Stack Tecnológico
- **FastAPI** - Framework web asíncrono con validación automática
- **PostgreSQL** - Base de datos principal con soporte JSON
- **Databases** - Cliente asíncrono para PostgreSQL
- **Pydantic v2** - Validación y serialización de datos
- **Python-multipart** - Manejo de uploads de archivos
- **QRCode** - Generación de códigos QR
- **Uvicorn** - Servidor ASGI

## Estructura del Proyecto

```
app/
├── core/
│   └── config.py          # Configuración y variables de entorno
├── db/
│   └── mongo.py           # Conexión a BD y operaciones (mal nombrado, es PostgreSQL)
├── models/
│   └── idf_models.py      # Modelos Pydantic para validación
├── routers/
│   ├── public_idfs.py     # Endpoints públicos de IDFs
│   ├── admin_idfs.py      # Endpoints administrativos
│   ├── assets.py          # Gestión de archivos (imágenes, docs, diagramas)
│   ├── devices.py         # Gestión de dispositivos
│   └── qr.py              # Generación de códigos QR
└── main.py                # Punto de entrada de la aplicación
```

## Configuración del Sistema

### Variables de Entorno Requeridas

```python
DATABASE_URL: str          # Conexión a PostgreSQL
STATIC_DIR: str           # Directorio para archivos estáticos
ADMIN_TOKEN: str          # Token de autenticación para operaciones admin
DEFAULT_CLUSTER: str      # Cluster por defecto
ALLOWED_CLUSTERS: list    # Lista de clusters permitidos
DEFAULT_PROJECT: str      # Proyecto por defecto
PUBLIC_BASE_URL: str      # URL base para códigos QR (opcional)
```

### Configuración por Defecto

```python
DATABASE_URL = "postgresql://localhost:5432/qartha"
STATIC_DIR = "static"
ADMIN_TOKEN = "qartha-admin-2025-secure-token"
DEFAULT_CLUSTER = "trk"
ALLOWED_CLUSTERS = ["trk", "lab", "alpha"]
DEFAULT_PROJECT = "trinity"
```

## Esquema de Base de Datos

### Tabla: `idfs`

```sql
CREATE TABLE idfs (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(50) NOT NULL,           -- Identificador del cluster
    project VARCHAR(50) NOT NULL,           -- Identificador del proyecto
    code VARCHAR(50) NOT NULL,              -- Código único del IDF
    title VARCHAR(255) NOT NULL,            -- Título descriptivo
    description TEXT,                       -- Descripción detallada
    site VARCHAR(255),                      -- Sitio/ubicación
    room VARCHAR(255),                      -- Sala/cuarto específico
    gallery JSONB DEFAULT '[]',             -- Array de imágenes
    documents JSONB DEFAULT '[]',           -- Array de documentos
    diagram JSONB,                          -- Diagrama (objeto único)
    table_data JSONB,                       -- Datos de tabla con columnas y filas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cluster, project, code)          -- Clave única compuesta
);
```

### Tabla: `devices`

```sql
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(50) NOT NULL,
    project VARCHAR(50) NOT NULL,
    idf_code VARCHAR(50) NOT NULL,          -- Referencia al IDF
    name VARCHAR(255) NOT NULL,             -- Nombre del dispositivo
    model VARCHAR(255),                     -- Modelo
    serial VARCHAR(255),                    -- Número de serie
    rack VARCHAR(255),                      -- Ubicación en rack
    site VARCHAR(255),                      -- Sitio
    notes TEXT,                             -- Notas adicionales
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Índices de Rendimiento

```sql
CREATE INDEX idx_devices_cluster_project_idf ON devices(cluster, project, idf_code);
```

## Modelos de Datos (Pydantic)

### Modelos Base

```python
class MediaItem(BaseModel):
    url: HttpUrl                            # URL del archivo
    name: Optional[str] = None              # Nombre original
    kind: str                              # "image" | "document" | "diagram"

class TableColumn(BaseModel):
    key: str                               # Clave única de la columna
    label: str                             # Etiqueta mostrada
    type: str                              # "text" | "number" | "date" | "select" | "status"
    options: Optional[List[str]] = None    # Opciones para select/status

class IdfTable(BaseModel):
    columns: List[TableColumn]             # Definición de columnas
    rows: List[Dict[str, Any]]            # Datos de las filas
```

### Modelos de Salud del Sistema

```python
class HealthCounts(BaseModel):
    ok: int                               # Dispositivos operativos
    revision: int                         # En revisión
    falla: int                           # Con fallas
    libre: int                           # Puertos libres
    reservado: int                       # Puertos reservados

class IdfHealth(BaseModel):
    level: str                           # "green" | "yellow" | "red" | "gray"
    counts: HealthCounts
```

### Modelos de Respuesta

```python
class IdfIndex(BaseModel):               # Para listados
    cluster: str
    project: str
    code: str
    title: str
    site: Optional[str] = None
    room: Optional[str] = None
    health: Optional[IdfHealth] = None

class IdfPublic(BaseModel):              # Para vista detallada
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

class IdfUpsert(BaseModel):              # Para crear/actualizar
    title: str
    description: Optional[str] = None
    site: Optional[str] = None
    room: Optional[str] = None
    table: Optional[IdfTable] = None
```

## Sistema Multi-Tenant

### Validación de Clusters

```python
def validate_cluster(cluster: str):
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster
```

### Estructura de URLs

Todos los endpoints siguen el patrón:
```
/api/{cluster}/{project}/...
```

Ejemplos:
- `/api/trk/trinity/idfs` - IDFs del cluster TRK, proyecto Trinity
- `/api/lab/demo/idfs/IDF-001` - IDF específico del cluster LAB

## Sistema de Autenticación

### Autenticación Admin

```python
def verify_admin_token(authorization: str = Header(...)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    if token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return token
```

### Niveles de Acceso

- **Público**: Lectura de IDFs y generación de QR
- **Admin**: CRUD completo de IDFs, upload de archivos, gestión de dispositivos

## API Endpoints

### Endpoints Públicos (Sin Autenticación)

#### GET /api/{cluster}/{project}/idfs
Obtiene lista de IDFs con estado de salud opcional.

**Query Parameters:**
- `q: str` - Búsqueda en título, código, sitio, sala
- `limit: int` - Límite de resultados (1-100, default: 50)
- `skip: int` - Offset para paginación (default: 0)
- `include_health: int` - Incluir cálculo de salud (0|1, default: 0)

**Response:** `List[IdfIndex]`

#### GET /api/{cluster}/{project}/idfs/{code}
Obtiene detalles completos de un IDF específico.

**Response:** `IdfPublic`

#### GET /api/{cluster}/{project}/idfs/{code}/qr.png
Genera código QR que apunta a la vista pública del IDF.

**Response:** Imagen PNG

### Endpoints Administrativos (Requieren Bearer Token)

#### POST /api/{cluster}/{project}/idfs/{code}
Crea un nuevo IDF.

**Headers:** `Authorization: Bearer {token}`
**Body:** `IdfUpsert`
**Response:** `IdfPublic`

#### PUT /api/{cluster}/{project}/idfs/{code}
Actualiza un IDF existente.

**Headers:** `Authorization: Bearer {token}`
**Body:** `IdfUpsert`
**Response:** `IdfPublic`

#### DELETE /api/{cluster}/{project}/idfs/{code}
Elimina un IDF.

**Headers:** `Authorization: Bearer {token}`
**Response:** `{"message": "IDF deleted successfully"}`

### Gestión de Archivos

#### POST /api/{cluster}/{project}/assets/images
Sube imágenes para la galería de un IDF.

**Headers:** `Authorization: Bearer {token}`
**Form Data:**
- `file: UploadFile` - Archivo de imagen
- `code: str` - Código del IDF

**Response:** `{"url": string, "message": string}`

#### POST /api/{cluster}/{project}/assets/documents
Sube documentos para un IDF.

**Headers:** `Authorization: Bearer {token}`
**Form Data:**
- `file: UploadFile` - Archivo de documento
- `code: str` - Código del IDF

#### POST /api/{cluster}/{project}/assets/diagram
Sube diagrama para un IDF.

**Headers:** `Authorization: Bearer {token}`
**Form Data:**
- `file: UploadFile` - Archivo de diagrama
- `code: str` - Código del IDF

### Gestión de Dispositivos

#### POST /api/{cluster}/{project}/devices/upload_csv
Importa dispositivos desde archivo CSV.

**Headers:** `Authorization: Bearer {token}`
**Form Data:**
- `file: UploadFile` - Archivo CSV
- `code: str` - Código del IDF

**Formato CSV Esperado:**
```csv
name,model,serial,rack,site,notes
Switch-01,Cisco 2960,ABC123,R1-U10,Building A,Primary switch
```

#### POST /api/{cluster}/{project}/devices
Crea dispositivos manualmente.

**Headers:** `Authorization: Bearer {token}`
**Body:** `List[Device]`

## Sistema de Cálculo de Salud

### Algoritmo de Salud

El sistema analiza la columna de estado en las tablas de dispositivos:

```python
def compute_health(table_data: dict) -> Optional[IdfHealth]:
    # Busca columna de estado
    status_column = None
    for col in table_data.get("columns", []):
        if col.get("type") == "status" or col.get("key") in ["status", "estado"]:
            status_column = col.get("key")
            break
    
    # Cuenta estados
    counts = {"ok": 0, "revision": 0, "falla": 0, "libre": 0, "reservado": 0}
    
    for row in table_data["rows"]:
        status = row.get(status_column, "").lower()
        if status in counts:
            counts[status] += 1
    
    # Determina nivel de salud
    if counts["falla"] > 0:
        level = "red"           # Crítico
    elif counts["revision"] > 0:
        level = "yellow"        # Advertencia
    elif (counts["ok"] + counts["libre"] + counts["reservado"]) > 0:
        level = "green"         # Operativo
    else:
        level = "gray"          # Sin datos
    
    return IdfHealth(level=level, counts=HealthCounts(**counts))
```

### Estados Reconocidos

- **ok**: Dispositivo operativo
- **revisión**: Requiere atención
- **falla**: Dispositivo crítico
- **libre**: Puerto/conexión disponible
- **reservado**: Puerto/conexión reservada

## Gestión de Archivos Estáticos

### Estructura de Directorios

```
static/
├── {cluster}/
│   └── {project}/
│       ├── images/
│       │   └── {code}_{index}.{ext}
│       ├── documents/
│       │   └── {code}_{index}.{ext}
│       └── diagrams/
│           └── {code}_diagram.{ext}
```

### URLs de Archivos

Los archivos se sirven en:
```
/static/{cluster}/{project}/{type}/{filename}
```

## Inicialización y Datos de Prueba

### Arranque de la Aplicación

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await ensure_indexes()    # Crea tablas e índices
    await seed_data()         # Datos de ejemplo si la BD está vacía
    yield
    # Shutdown
    await close_database()    # Cierra conexiones
```

### Datos de Prueba

El sistema incluye datos de ejemplo para:
- **TRK/Trinity**: 5 IDFs con tablas completas
- **TRK/Alpha**: 3 IDFs para desarrollo
- **LAB/Demo**: 2 IDFs para pruebas

## Configuración CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Para desarrollo - restringir en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Endpoints de Salud del Sistema

#### GET /
**Response:** `{"message": "Qartha Smart Inventory Network API"}`

#### GET /health
**Response:** `{"status": "healthy", "version": "1.0.0"}`

## Manejo de Errores

### Códigos de Error Estándar

- **404**: Cluster no encontrado, IDF no encontrado
- **401**: Token de autenticación inválido
- **400**: Datos de entrada inválidos
- **409**: IDF ya existe (en creación)
- **422**: Error de validación Pydantic

### Formato de Respuesta de Error

```json
{
    "detail": "Descripción del error"
}
```

## Consideraciones de Rendimiento

### Base de Datos

- Índices en columnas de búsqueda frecuente
- Operaciones asíncronas para alta concurrencia
- JSONB para datos estructurados variables

### Archivos

- Organización jerárquica por cluster/proyecto
- Validación de tipos de archivo
- Gestión automática de nombres de archivo

### Memoria

- Streaming de archivos grandes
- Conexiones de BD con pooling automático
- Carga lazy de cálculos de salud

## Escalabilidad

### Multi-tenancy

- Separación lógica por cluster/proyecto
- Validación automática de acceso
- Datos aislados por tenant

### Horizontal Scaling

- Stateless design
- Archivos estáticos externalizables
- Base de datos centralizada con réplicas

## Seguridad

### Autenticación

- Bearer token para operaciones administrativas
- Validación en cada endpoint protegido

### Validación de Entrada

- Pydantic para validación automática
- Sanitización de nombres de archivo
- Validación de tipos MIME

### Protección de Archivos

- Prevención de path traversal
- Limitación de tipos de archivo
- Organización segura de directorios

---

Este documento cubre toda la arquitectura del backend. El frontend debe consumir estos endpoints respetando la estructura de URLs multi-tenant y los formatos de datos definidos en los modelos Pydantic.
