
# Frontend API Integration Guide

## Base URL y Estructura

Todos los endpoints del backend siguen el patrón:
```
/api/{cluster}/{project}/...
```

**Base URL**: `http://localhost:8000` (desarrollo) o tu dominio en producción
**Clusters disponibles**: `["trk", "lab", "alpha"]` (configurables via environment)
**Proyectos por defecto**: `trinity`, `demo`, `alpha`

## Autenticación

### Token de Admin
Para endpoints administrativos, incluir header:
```typescript
headers: {
  'Authorization': `Bearer ${ADMIN_TOKEN}`
}
```

El token se obtiene de la variable de entorno `VITE_ADMIN_TOKEN`.

## Endpoints Públicos (Sin Autenticación)

### 1. Listar IDFs
```typescript
// GET /api/{cluster}/{project}/idfs
interface GetIdfsParams {
  q?: string;           // Búsqueda en título, código, sitio, sala
  limit?: number;       // 1-100, default: 50
  skip?: number;        // Offset para paginación, default: 0
  include_health?: 0|1; // Incluir cálculo de salud, default: 0
}

// Response Type
interface IdfIndex {
  cluster: string;
  project: string;
  code: string;
  title: string;
  site?: string;
  room?: string;
  health?: IdfHealth;
}

interface IdfHealth {
  level: "green" | "yellow" | "red" | "gray";
  counts: {
    ok: number;
    revision: number;
    falla: number;
    libre: number;
    reservado: number;
  };
}

// Ejemplo de uso
const { data: idfs } = useQuery({
  queryKey: ['idfs', cluster, project, searchQuery, limit, skip],
  queryFn: () => fetch(`/api/${cluster}/${project}/idfs?q=${searchQuery}&limit=${limit}&skip=${skip}&include_health=1`)
    .then(res => res.json())
});
```

### 2. Obtener IDF Específico
```typescript
// GET /api/{cluster}/{project}/idfs/{code}
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
  diagram?: MediaItem;
  table?: IdfTable;
  health?: IdfHealth;
}

interface MediaItem {
  url: string;          // URL completa del archivo
  name?: string;        // Nombre original del archivo
  kind: "image" | "document" | "diagram";
}

interface IdfTable {
  columns: TableColumn[];
  rows: Record<string, any>[];
}

interface TableColumn {
  key: string;          // Clave única de la columna
  label: string;        // Etiqueta mostrada
  type: "text" | "number" | "date" | "select" | "status";
  options?: string[];   // Opciones para select/status
}

// Ejemplo de uso
const { data: idf } = useQuery({
  queryKey: ['idf', cluster, project, code],
  queryFn: () => fetch(`/api/${cluster}/${project}/idfs/${code}`)
    .then(res => res.json())
});
```

### 3. Generar Código QR
```typescript
// GET /api/{cluster}/{project}/idfs/{code}/qr.png
// Retorna: imagen PNG

// Ejemplo de uso
const qrUrl = `/api/${cluster}/${project}/idfs/${code}/qr.png`;
<img src={qrUrl} alt="QR Code" className="w-32 h-32" />
```

## Endpoints Administrativos (Requieren Token)

### 4. Crear IDF
```typescript
// POST /api/{cluster}/{project}/idfs/{code}
interface IdfUpsert {
  title: string;
  description?: string;
  site?: string;
  room?: string;
  table?: IdfTable;
}

// Ejemplo de uso
const createIdf = useMutation({
  mutationFn: (data: IdfUpsert) => 
    fetch(`/api/${cluster}/${project}/idfs/${code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  onSuccess: () => {
    queryClient.invalidateQueries(['idfs']);
  }
});
```

### 5. Actualizar IDF
```typescript
// PUT /api/{cluster}/{project}/idfs/{code}
// Mismo body que crear IDF

const updateIdf = useMutation({
  mutationFn: (data: IdfUpsert) => 
    fetch(`/api/${cluster}/${project}/idfs/${code}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(data)
    }).then(res => res.json())
});
```

### 6. Eliminar IDF
```typescript
// DELETE /api/{cluster}/{project}/idfs/{code}
// Response: { message: "IDF deleted successfully" }

const deleteIdf = useMutation({
  mutationFn: () => 
    fetch(`/api/${cluster}/${project}/idfs/${code}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }).then(res => res.json())
});
```

## Gestión de Archivos

### 7. Subir Imágenes
```typescript
// POST /api/{cluster}/{project}/assets/images
// Form Data: file (UploadFile), code (string)

const uploadImage = useMutation({
  mutationFn: ({ file, code }: { file: File; code: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('code', code);
    
    return fetch(`/api/${cluster}/${project}/assets/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    }).then(res => res.json());
  }
});

// Response: { url: string, message: string }
```

### 8. Subir Documentos
```typescript
// POST /api/{cluster}/{project}/assets/documents
// Mismo formato que imágenes

const uploadDocument = useMutation({
  mutationFn: ({ file, code }: { file: File; code: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('code', code);
    
    return fetch(`/api/${cluster}/${project}/assets/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    }).then(res => res.json());
  }
});
```

### 9. Subir Diagrama
```typescript
// POST /api/{cluster}/{project}/assets/diagram
// Mismo formato que imágenes, pero solo permite un diagrama por IDF

const uploadDiagram = useMutation({
  mutationFn: ({ file, code }: { file: File; code: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('code', code);
    
    return fetch(`/api/${cluster}/${project}/assets/diagram`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    }).then(res => res.json());
  }
});
```

## Gestión de Dispositivos

### 10. Importar Dispositivos desde CSV
```typescript
// POST /api/{cluster}/{project}/devices/upload_csv
// Form Data: file (CSV), code (string)

// Formato CSV esperado:
// name,model,serial,rack,site,notes
// Switch-01,Cisco 2960,ABC123,R1-U10,Building A,Primary switch

const uploadDevicesCSV = useMutation({
  mutationFn: ({ file, code }: { file: File; code: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('code', code);
    
    return fetch(`/api/${cluster}/${project}/devices/upload_csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      },
      body: formData
    }).then(res => res.json());
  }
});

// Response: { message: "Uploaded X devices successfully" }
```

### 11. Crear Dispositivos Manualmente
```typescript
// POST /api/{cluster}/{project}/devices
interface Device {
  cluster: string;
  project: string;
  idf_code: string;
  name: string;
  model?: string;
  serial?: string;
  rack?: string;
  site?: string;
  notes?: string;
}

const createDevices = useMutation({
  mutationFn: (devices: Device[]) => 
    fetch(`/api/${cluster}/${project}/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(devices)
    }).then(res => res.json())
});
```

## Endpoints de Sistema

### 12. Salud del Sistema
```typescript
// GET /health
// Response: { status: "healthy", version: "1.0.0" }

// GET /
// Response: { message: "Qartha Smart Inventory Network API" }
```

## Manejo de Errores

### Códigos de Error Estándar
```typescript
interface APIError {
  detail: string;
}

// Códigos comunes:
// 401: Token inválido o faltante
// 404: Cluster no encontrado, IDF no encontrado
// 409: IDF ya existe (en creación)
// 400: Datos de entrada inválidos
// 422: Error de validación Pydantic

// Ejemplo de manejo de errores
const handleAPIError = (error: any) => {
  if (error.status === 401) {
    // Redirigir a login o mostrar mensaje de autenticación
  } else if (error.status === 404) {
    // Mostrar "No encontrado"
  } else {
    // Error genérico
    console.error('API Error:', error);
  }
};
```

## Tipos TypeScript Completos

```typescript
// Exportar todos los tipos para uso en el frontend
export interface IdfIndex {
  cluster: string;
  project: string;
  code: string;
  title: string;
  site?: string;
  room?: string;
  health?: IdfHealth;
}

export interface IdfPublic {
  cluster: string;
  project: string;
  code: string;
  title: string;
  description?: string;
  site?: string;
  room?: string;
  gallery: MediaItem[];
  documents: MediaItem[];
  diagram?: MediaItem;
  table?: IdfTable;
  health?: IdfHealth;
}

export interface IdfUpsert {
  title: string;
  description?: string;
  site?: string;
  room?: string;
  table?: IdfTable;
}

export interface MediaItem {
  url: string;
  name?: string;
  kind: "image" | "document" | "diagram";
}

export interface IdfTable {
  columns: TableColumn[];
  rows: Record<string, any>[];
}

export interface TableColumn {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "status";
  options?: string[];
}

export interface IdfHealth {
  level: "green" | "yellow" | "red" | "gray";
  counts: {
    ok: number;
    revision: number;
    falla: number;
    libre: number;
    reservado: number;
  };
}

export interface Device {
  cluster: string;
  project: string;
  idf_code: string;
  name: string;
  model?: string;
  serial?: string;
  rack?: string;
  site?: string;
  notes?: string;
}
```

## Configuración de React Query

```typescript
// hooks/useApi.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys
export const queryKeys = {
  idfs: (cluster: string, project: string, params?: any) => 
    ['idfs', cluster, project, params],
  idf: (cluster: string, project: string, code: string) => 
    ['idf', cluster, project, code],
};

// Custom hooks para cada endpoint
export const useIdfs = (cluster: string, project: string, params?: GetIdfsParams) => {
  return useQuery({
    queryKey: queryKeys.idfs(cluster, project, params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.skip) searchParams.set('skip', params.skip.toString());
      if (params?.include_health) searchParams.set('include_health', params.include_health.toString());
      
      const url = `/api/${cluster}/${project}/idfs?${searchParams}`;
      return fetch(url).then(res => res.json());
    }
  });
};

export const useIdf = (cluster: string, project: string, code: string) => {
  return useQuery({
    queryKey: queryKeys.idf(cluster, project, code),
    queryFn: () => fetch(`/api/${cluster}/${project}/idfs/${code}`)
      .then(res => res.json())
  });
};
```

## Variables de Entorno Frontend

```typescript
// .env
VITE_ADMIN_TOKEN=qartha-admin-2025-secure-token
VITE_API_BASE_URL=http://localhost:8000
VITE_CLUSTERS=trk,lab,alpha
VITE_DEFAULT_CLUSTER=trk
VITE_DEFAULT_PROJECT=trinity
VITE_PROJECTS_trk=trinity,alpha
VITE_PROJECTS_lab=demo,test
VITE_PROJECTS_alpha=dev,staging
```

Esta guía completa te permitirá integrar todos los endpoints del backend con el frontend de forma consistente y tipada.
