
# Sistema Etiquetas - Documentación Técnica Completa

## 📋 Descripción General

**Sistema Etiquetas** es una aplicación web full-stack multi-tenant para la gestión de marcos de distribución intermedia (IDF) de fibra óptica. El sistema permite administrar inventarios de equipos de red, monitorear estados de salud en tiempo real, y gestionar documentación técnica con un enfoque en la industria de telecomunicaciones.

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

**Backend:**
- **FastAPI** - Framework web ASGI con validación automática
- **PostgreSQL** - Base de datos principal con soporte JSON
- **Motor/Databases** - Driver asíncrono para base de datos
- **Pydantic v2** - Validación y serialización de datos
- **Python-multipart** - Manejo de uploads de archivos
- **QRCode** - Generación automática de códigos QR

**Frontend:**
- **React 18** - Framework de UI con TypeScript
- **Vite** - Build tool y servidor de desarrollo
- **Wouter** - Router ligero del lado del cliente
- **TanStack Query** - Gestión de estado del servidor y caché
- **shadcn/ui** - Biblioteca de componentes basada en Radix UI
- **Tailwind CSS** - Framework CSS utility-first

**Infraestructura:**
- **Replit** - Plataforma de desarrollo y deployment
- **Sistema de archivos estáticos** - Almacenamiento organizado por tenant

## 🌐 Arquitectura Multi-Tenant

### Estructura de URL
```
/{cluster}/{project}/...
```

**Ejemplos:**
- `/Trinity/Sabinas` - Proyecto Sabinas en cluster Trinity
- `/trk/trinity` - Proyecto Trinity en cluster TRK
- `/lab/demo` - Proyecto Demo en cluster Lab

### Mapeo de Proyectos
```typescript
// client/src/config/index.ts
const projectMapping = {
  "sabinas": "Sabinas Project",
  "Sabinas": "Sabinas Project", 
  "trinity": "Trinity",
  "Trinity": "Trinity"
};
```

## 🗄️ Estructura de Base de Datos

### Tabla Principal: `idfs`
```sql
CREATE TABLE idfs (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(50) NOT NULL,
    project VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    site VARCHAR(255),
    room VARCHAR(255),
    gallery JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    diagrams JSONB DEFAULT '[]',
    location JSONB,
    table_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cluster, project, code)
);
```

### Tabla Secundaria: `devices`
```sql
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(50) NOT NULL,
    project VARCHAR(50) NOT NULL,
    idf_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial VARCHAR(255),
    rack VARCHAR(255),
    site VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📁 Estructura de Archivos

### Backend (`app/`)
```
app/
├── core/
│   └── config.py          # Configuración y variables de entorno
├── db/
│   ├── database.py        # Exports de conexión DB
│   └── mongo.py           # Conexión PostgreSQL y operaciones
├── models/
│   └── idf_models.py      # Modelos Pydantic
├── routers/
│   ├── public_idfs.py     # Endpoints públicos de IDFs
│   ├── admin_idfs.py      # Endpoints admin (CRUD)
│   ├── assets.py          # Gestión de archivos estáticos
│   ├── devices.py         # Gestión de dispositivos
│   └── qr.py              # Generación de códigos QR
└── main.py                # Punto de entrada FastAPI
```

### Frontend (`client/src/`)
```
client/src/
├── components/
│   ├── ui/                # Componentes shadcn/ui
│   ├── DataTable.tsx      # Tabla de datos con estados
│   ├── Gallery.tsx        # Galería con lightbox
│   ├── AdminSidebar.tsx   # Panel de administración
│   ├── Navbar.tsx         # Navegación principal
│   └── StatusBadge.tsx    # Indicadores de estado
├── config/
│   └── index.ts           # Configuración multi-tenant
├── contexts/
│   └── ThemeContext.tsx   # Gestión de temas
├── lib/
│   ├── api.ts             # Cliente API
│   └── utils.ts           # Utilidades
├── pages/
│   ├── ClusterDirectory.tsx  # Directorio de clusters
│   ├── PublicList.tsx     # Lista pública de IDFs
│   ├── PublicDetail.tsx   # Detalle de IDF
│   └── CmsUpload.tsx      # CMS de administración
└── App.tsx                # Componente raíz
```

### Archivos Estáticos (`static/`)
```
static/
├── {cluster}/
│   └── {project}/
│       ├── gallery/       # Imágenes de galería
│       ├── documents/     # Documentos PDF/Office
│       ├── diagrams/      # Diagramas técnicos
│       ├── location/      # Mapas de ubicación
│       └── dfo/          # Layouts DFO específicos
└── logo.png              # Logos por cluster
```

## 🔌 API Endpoints

### Endpoints Públicos
```
GET  /api/{cluster}/{project}/idfs              # Lista IDFs con paginación
GET  /api/{cluster}/{project}/idfs/{code}       # Detalle específico de IDF
GET  /api/{cluster}/{project}/qr/{code}         # Código QR del IDF
GET  /static/{cluster}/{project}/{type}/{file} # Archivos estáticos
```

### Endpoints Admin (Requieren token)
```
POST   /api/admin/{cluster}/{project}/idfs           # Crear IDF
PUT    /api/admin/{cluster}/{project}/idfs/{code}    # Actualizar IDF
DELETE /api/admin/{cluster}/{project}/idfs/{code}    # Eliminar IDF
POST   /api/{cluster}/{project}/assets/{code}/upload # Upload archivos
POST   /api/{cluster}/{project}/devices/import       # Importar dispositivos CSV
```

### Autenticación Admin
```bash
Authorization: Bearer {ADMIN_TOKEN}
```

## 🎨 Sistema de Temas

### CSS Variables (Light/Dark)
```css
:root {
  --background: hsl(0, 0%, 100%);
  --foreground: hsl(222.2, 84%, 4.9%);
  --primary: hsl(223, 100%, 30%);
  --secondary: hsl(210, 40%, 96%);
  /* ... más variables */
}

.dark {
  --background: hsl(223, 100%, 30%);
  --foreground: hsl(213, 31%, 91%);
  /* ... variables para tema oscuro */
}
```

### Clases de Estado
```css
.status-green  { @apply bg-green-500 bg-opacity-10 text-green-400; }
.status-yellow { @apply bg-yellow-500 bg-opacity-10 text-yellow-400; }
.status-red    { @apply bg-red-500 bg-opacity-10 text-red-400; }
.status-blue   { @apply bg-blue-500 bg-opacity-10 text-blue-400; }
.status-gray   { @apply bg-gray-500 bg-opacity-10 text-gray-400; }
```

## 📊 Sistema de Monitoreo de Salud

### Lógica de Cálculo
```typescript
function computeHealth(tableData: IdfTable): IdfHealth {
  const counts = { ok: 0, revision: 0, falla: 0, libre: 0, reservado: 0 };
  
  // Analizar columna de estado
  tableData.rows.forEach(row => {
    const status = row.status?.toLowerCase();
    if (status in counts) counts[status]++;
  });
  
  // Determinar nivel de salud
  const level = counts.falla > 0 ? "red" :
                counts.revision > 0 ? "yellow" :
                (counts.ok + counts.libre + counts.reservado) > 0 ? "green" : "gray";
                
  return { level, counts };
}
```

### Estados de Salud
- **🟢 Green (ok):** Todos los dispositivos operacionales
- **🟡 Yellow (revisión):** Algunos dispositivos bajo revisión
- **🔴 Red (falla):** Fallas críticas detectadas
- **⚪ Gray:** Sin datos disponibles

## 📋 Esquemas de Datos

### IDF Completo (IdfPublic)
```typescript
interface IdfPublic {
  cluster: string;
  project: string;
  code: string;
  title: string;
  description?: string;
  site?: string;
  room?: string;
  gallery: MediaItem[];
  documents: MediaItem[];
  diagrams: MediaItem[];
  location?: MediaItem;
  table?: IdfTable;
  health?: IdfHealth;
}
```

### Tabla Dinámica (IdfTable)
```typescript
interface IdfTable {
  columns: TableColumn[];
  rows: Record<string, any>[];
}

interface TableColumn {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "status";
  options?: string[];
}
```

### Media Item
```typescript
interface MediaItem {
  url: string;
  name?: string;
  kind: "image" | "document" | "diagram";
}
```

## 🔄 Flujos de Trabajo Principales

### 1. Crear Nuevo IDF
```typescript
// Frontend: AddIdfDialog.tsx
const mutation = useMutation({
  mutationFn: (data) => createIdf({ cluster, project, body: data, token }),
  onSuccess: (newIdf) => {
    navigate(`/${cluster}/${project}/idf/${newIdf.code}`);
  }
});

// Backend: admin_idfs.py
@router.post("/{cluster}/{project}/idfs")
async def create_idf(idf_data: IdfCreate):
  # Validar cluster y proyecto
  # Insertar en base de datos
  # Retornar IDF creado
```

### 2. Upload de Archivos
```typescript
// Frontend: AdminSidebar.tsx
const uploadFile = async (file: File, type: string) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return fetch(`/api/${cluster}/${project}/assets/${code}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
};

// Backend: assets.py
@router.post("/{cluster}/{project}/assets/{code}/upload")
async def upload_asset(file: UploadFile, asset_type: str):
  # Validar tipo de archivo
  # Crear directorio si no existe
  # Guardar archivo
  # Actualizar registro en BD
```

### 3. Renderizado de Tabla DFO
```typescript
// DataTable.tsx
const renderOdfTable = () => {
  return (
    <div className="odf-container">
      <div className="odf-header">ODF IDF-{code}</div>
      <table className="odf-table">
        {displayTable.rows.map((row, index) => (
          <tr key={index}>
            <td className={`fiber-cell ${getFiberClass(row.fiber)}`}>
              {row.fiber}
            </td>
            <td className={`status-cell ${getStatusClass(row.status)}`}>
              <StatusBadge status={row.status} />
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
};
```

## 🛠️ Herramientas de Desarrollo

### Comandos Disponibles
```bash
# Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (desarrollo)
cd client && npm run dev

# Build producción
cd client && npm run build
```

### Variables de Entorno
```bash
# Backend (.env)
DATABASE_URL=postgresql://localhost/qartha
ADMIN_TOKEN=changeme-demo-token
STATIC_DIR=static
PUBLIC_BASE_URL=https://your-repl.replit.app
ALLOWED_CLUSTERS=Trinity,trk,lab,alpha

# Frontend
VITE_API_BASE_URL=/api
```

## 🎯 Componentes Clave para Modificar

### 1. Agregar Nuevo Campo a IDF
**Archivos a modificar:**
- `shared/schema.ts` - Agregar al esquema TypeScript
- `app/models/idf_models.py` - Agregar al modelo Pydantic
- `app/db/mongo.py` - Actualizar tabla SQL
- `client/src/components/AdminSidebar.tsx` - Agregar input en formulario
- `client/src/pages/PublicDetail.tsx` - Mostrar campo en detalle

### 2. Nuevo Tipo de Asset
**Archivos a modificar:**
- `app/routers/assets.py` - Agregar validación de tipo
- `client/src/components/AdminSidebar.tsx` - Agregar opción de upload
- `client/src/pages/PublicDetail.tsx` - Agregar tab para nuevo tipo

### 3. Nuevo Cluster/Proyecto
**Archivos a modificar:**
- `client/src/config/index.ts` - Agregar a configuración
- `app/core/config.py` - Agregar a ALLOWED_CLUSTERS
- `app/db/mongo.py` - Agregar datos seed si es necesario

### 4. Personalizar Tabla DFO
**Archivos a modificar:**
- `client/src/components/DataTable.tsx` - Modificar renderOdfTable()
- `client/src/index.css` - Agregar estilos .odf-* específicos

## 🔧 Patterns de Código Importantes

### 1. Mapeo URL a Proyecto
```typescript
// Siempre usar estas funciones para mapeo
const dbProject = map_url_project_to_db_project(project);
const urlProject = config.urlMapping.projectToUrlPath(project);
```

### 2. Validación de Cluster
```python
# Backend: Siempre validar cluster en endpoints
def validate_cluster(cluster: str):
    if cluster not in settings.ALLOWED_CLUSTERS:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster
```

### 3. Conversión de URLs Relativas
```python
# Backend: Convertir URLs relativas a absolutas
def convert_relative_urls_to_absolute(data):
    if isinstance(data, dict) and "url" in data:
        if data["url"].startswith("/static"):
            data["url"] = f"{settings.PUBLIC_BASE_URL}{data['url']}"
    return data
```

### 4. Gestión de Estado React
```typescript
// Usar TanStack Query para estado del servidor
const { data: idf, isLoading } = useQuery({
  queryKey: ["/api", cluster, project, "idfs", code],
  queryFn: () => getIdf(cluster, project, code),
});

// Estado local para UI
const [activeTab, setActiveTab] = useState<string>("table");
```

## 🚀 Deployment en Replit

### Configuración de Workflow
```bash
# .replit
[deployment]
run = "uvicorn app.main:app --host 0.0.0.0 --port 8000"
build = "cd client && npm run build"

[env]
PORT = "8000"
```

### Archivos Estáticos en Producción
```python
# main.py - Servir frontend estático
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse("dist/index.html")
```

## 📝 Notas para IA/Agentes

### Reglas de Modificación
1. **NUNCA** modificar `package.json`, `pyproject.toml`, `vite.config.ts` sin ser solicitado explícitamente
2. **SIEMPRE** usar la estructura multi-tenant existente
3. **MANTENER** la consistencia en el mapeo de URLs
4. **VALIDAR** clusters y proyectos en todos los endpoints
5. **USAR** 0.0.0.0 en lugar de localhost para binding de puertos
6. **PRESERVAR** el sistema de temas y estilos existente

### Convenciones de Nombres
- **Clusters:** PascalCase o lowercase (Trinity, trk, lab)
- **Proyectos:** Espacios permitidos ("Sabinas Project") con mapeo URL
- **Códigos IDF:** Formato IDF-#### (IDF-1004)
- **Archivos:** snake_case para backend, camelCase para frontend

### Testing Rápido
```bash
# Verificar endpoints
curl http://localhost:8000/api/Trinity/Sabinas/idfs
curl http://localhost:8000/health

# Verificar frontend
curl http://localhost:3000/Trinity/Sabinas
```

Esta documentación está diseñada para que cualquier IA pueda entender completamente la arquitectura y hacer modificaciones precisas sin romper la funcionalidad existente.
