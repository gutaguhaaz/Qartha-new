
# Qartha Smart Inventory Network - Complete Documentation

## Overview

Qartha is a comprehensive multi-tenant IDF (Intermediate Distribution Frame) directory management system that provides public browsing of network infrastructure with health monitoring capabilities. The system supports multiple clusters and projects through path-based routing, offering both public directory access and administrative content management.

## Key Features

- **Multi-tenant Architecture**: Support for multiple clusters and projects with path-based routing
- **Public IDF Directory**: Browse and search IDFs with health status indicators
- **Admin CMS**: Upload and manage assets (images, documents, diagrams) and import devices via CSV
- **Health Monitoring**: Real-time status tracking with color-coded semaphore system
- **File Management**: Integrated static file serving with organized directory structure
- **Dynamic Tables**: Customizable table rendering with status badges
- **PDF Viewer**: Integrated diagram viewing with zoom controls
- **Image Gallery**: Responsive gallery with lightbox functionality
- **QR Code Generation**: Automatic QR code generation for each IDF
- **Dark/Light Theme System**: Complete theme switching with system preference detection

## Tech Stack

### Backend Technologies
- **FastAPI** - Modern, fast (high-performance) web framework for building APIs with Python 3.7+
- **MongoDB Atlas** - Cloud-hosted NoSQL database with Motor for async operations
- **Pydantic v2** - Data validation and serialization using Python type hints
- **Python-multipart** - For handling file uploads
- **QRCode[PIL]** - QR code generation library
- **Uvicorn** - ASGI server for production deployment
- **Pydantic-settings** - Settings management using environment variables

### Frontend Technologies
- **React 18** - Modern React with TypeScript support
- **TypeScript** - Static type checking and enhanced developer experience
- **Vite** - Fast build tool and development server with HMR
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Wouter** - Lightweight client-side routing (alternative to React Router)
- **TanStack Query** - Powerful data synchronization for React
- **shadcn/ui** - High-quality UI components built on Radix UI primitives
- **Framer Motion** - Production-ready motion library for React
- **Next Themes** - Theme management system

### Development Tools
- **TypeScript** - Full-stack type safety
- **ESBuild** - Fast JavaScript bundler for production builds
- **PostCSS** - CSS processing with Tailwind CSS integration
- **Font Awesome** - Comprehensive icon library

## Architecture

### Backend Architecture

The backend follows a modular FastAPI architecture with the following structure:

```
app/
├── core/
│   └── config.py          # Environment configuration and settings
├── db/
│   └── mongo.py           # MongoDB connection and operations
├── models/
│   └── idf_models.py      # Pydantic data models
├── routers/
│   ├── public_idfs.py     # Public IDF endpoints
│   ├── admin_idfs.py      # Admin IDF management
│   ├── assets.py          # Asset management endpoints
│   ├── devices.py         # Device management endpoints
│   └── qr.py              # QR code generation
└── main.py                # FastAPI application entry point
```

#### Key Backend Features:
- **Multi-tenant routing**: Path-based tenant isolation (`/api/{cluster}/{project}/`)
- **Async MongoDB operations**: Using Motor driver for high performance
- **File upload handling**: Organized static file management
- **Health status computation**: Dynamic health calculation from device data
- **QR code generation**: Automatic QR codes for each IDF location

### Frontend Architecture

The frontend is a React 18 SPA built with modern patterns:

```
client/src/
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── AdminSidebar.tsx   # Admin navigation component
│   ├── DataTable.tsx      # Dynamic table component
│   ├── Gallery.tsx        # Image gallery with lightbox
│   ├── Navbar.tsx         # Main navigation
│   └── ThemeToggle.tsx    # Theme switching component
├── contexts/
│   └── ThemeContext.tsx   # Theme management context
├── lib/
│   ├── api.ts             # API client functions
│   ├── queryClient.ts     # TanStack Query configuration
│   └── utils.ts           # Utility functions
├── pages/
│   ├── PublicList.tsx     # IDF directory listing
│   ├── PublicDetail.tsx   # Individual IDF details
│   ├── CmsUpload.tsx      # Admin management interface
│   └── not-found.tsx      # 404 page
└── App.tsx                # Main application component
```

## Database Schema

### MongoDB Collections

#### `idfs` Collection
```javascript
{
  _id: ObjectId,
  cluster: String,        // Tenant cluster identifier
  project: String,        // Project within cluster
  code: String,          // Unique IDF identifier
  title: String,         // Display name
  site: String,          // Physical location
  room: String,          // Room/area location
  tables: [              // Device/connection tables
    {
      name: String,
      columns: [String],
      rows: [[String]]
    }
  ],
  media: {
    gallery: [            // Image gallery
      {
        name: String,
        url: String
      }
    ],
    documents: [          // PDF/document files
      {
        name: String,
        url: String
      }
    ],
    diagrams: [           // Technical diagrams
      {
        name: String,
        url: String
      }
    ]
  },
  health: {              // Computed health status
    level: String,       // green, yellow, red, gray
    counts: {
      ok: Number,
      revision: Number,
      falla: Number,
      libre: Number,
      reservado: Number
    }
  }
}
```

#### `devices` Collection
```javascript
{
  _id: ObjectId,
  cluster: String,
  project: String,
  idf_code: String,
  // Additional device-specific fields from CSV imports
}
```

### Indexes
- Compound index on `(cluster, project)` for multi-tenant queries
- Compound index on `(cluster, project, code)` for unique IDF lookups

## API Endpoints

### Public Endpoints
- `GET /api/{cluster}/{project}/idfs` - List IDFs with health status
- `GET /api/{cluster}/{project}/idfs/{code}` - Get specific IDF details
- `GET /api/{cluster}/{project}/qr/{code}` - Generate QR code for IDF

### Admin Endpoints (Require Authentication)
- `POST /api/{cluster}/{project}/idfs` - Create new IDF
- `PUT /api/{cluster}/{project}/idfs/{code}` - Update IDF
- `DELETE /api/{cluster}/{project}/idfs/{code}` - Delete IDF
- `POST /api/{cluster}/{project}/assets/{code}/upload` - Upload assets
- `POST /api/{cluster}/{project}/devices/import` - Import devices from CSV

### Static File Serving
- `GET /static/{cluster}/{project}/{type}/{filename}` - Serve uploaded files

## Environment Configuration

### Backend Environment Variables

```bash
# Database Configuration
MONGO_URL_ATLAS=mongodb://localhost:27017
DB_NAME=qartha

# File Storage
STATIC_DIR=static

# Security
ADMIN_TOKEN=changeme-demo-token

# Multi-tenant Configuration
DEFAULT_CLUSTER=trk
ALLOWED_CLUSTERS=trk,lab
DEFAULT_PROJECT=trinity

# Optional: Production URL for QR codes
PUBLIC_BASE_URL=https://your-domain.com
```

### Frontend Environment Variables

```bash
# API Configuration (handled by Vite proxy)
VITE_API_BASE_URL=/api
```

## Development Setup

### Prerequisites
- **Python 3.11+** - For backend development
- **Node.js 20+** - For frontend development
- **MongoDB** - Database (local or Atlas)

### Backend Setup

1. **Install Python dependencies:**
```bash
# Dependencies are managed via pyproject.toml
uv sync  # or pip install -r requirements.txt if generated
```

2. **Configure environment:**
```bash
# Create .env file or set environment variables
export MONGO_URL_ATLAS="mongodb://localhost:27017"
export DB_NAME="qartha"
export ADMIN_TOKEN="your-secret-token"
```

3. **Start backend server:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

The development setup uses Vite's proxy to route `/api/*` requests to the FastAPI backend.

## Deployment

### Replit Deployment

The project is configured for Replit deployment with:

```bash
# Build command
npm run build

# Run command  
npm run start
```

### Production Environment

For production deployment:

1. **Database**: Use MongoDB Atlas for production
2. **Static Files**: Ensure proper file storage and CDN setup
3. **Environment Variables**: Set all required environment variables
4. **SSL/HTTPS**: Configure for secure connections
5. **CORS**: Update CORS settings for production domains

### Docker Deployment (Alternative)

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install -e .
COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "start"]
```

## Key Features Deep Dive

### Multi-tenant Architecture

The system supports multiple tenants through URL-based routing:
- **Cluster**: Top-level organization (e.g., "trk", "lab")
- **Project**: Sub-organization within cluster (e.g., "trinity")
- **URL Structure**: `/{cluster}/{project}/...`

### Health Monitoring System

Health status is computed from device tables:
- **Green**: All devices operational
- **Yellow**: Some devices under review
- **Red**: Critical failures detected
- **Gray**: No data available

Health computation analyzes status columns in device tables and counts:
- `ok`: Operational devices
- `revision`: Devices under review
- `falla`: Failed devices
- `libre`: Available ports/connections
- `reservado`: Reserved ports/connections

### File Management

Organized file storage structure:
```
static/
├── {cluster}/
│   └── {project}/
│       ├── gallery/
│       ├── documents/
│       └── diagrams/
```

### Theme System

Complete dark/light theme implementation:
- **System preference detection**
- **localStorage persistence**
- **Instant theme switching**
- **Tailwind CSS dark mode support**

## Migration Guide

### From Other Systems

#### Database Migration
1. **Export existing data** to JSON/CSV format
2. **Transform data** to match Qartha schema
3. **Import using MongoDB tools** or custom scripts
4. **Update file references** to match new static file structure

#### File Migration
1. **Organize files** by cluster/project/type structure
2. **Update file URLs** in database records
3. **Verify file accessibility** through static file serving

### Version Upgrades

#### Backend Upgrades
1. **Update dependencies** in `pyproject.toml`
2. **Run database migrations** if schema changes
3. **Test API endpoints** for breaking changes
4. **Update environment variables** if needed

#### Frontend Upgrades
1. **Update Node.js dependencies** in `package.json`
2. **Test component compatibility** with new versions
3. **Update TypeScript types** if needed
4. **Verify build process** works correctly

## Security Considerations

### Authentication
- **Bearer token authentication** for admin endpoints
- **No authentication required** for public read access
- **Environment-based token configuration**

### Data Validation
- **Pydantic models** for request/response validation
- **TypeScript types** for frontend type safety
- **Input sanitization** for file uploads

### File Security
- **Organized file storage** prevents path traversal
- **File type validation** for uploads
- **Static file serving** through FastAPI

## Performance Optimization

### Backend Optimization
- **Async operations** using Motor driver
- **MongoDB indexing** for efficient queries
- **Connection pooling** for database operations
- **Static file caching** for media assets

### Frontend Optimization
- **Code splitting** with Vite
- **Lazy loading** for route components
- **TanStack Query caching** for API responses
- **Optimized images** and asset compression

## Troubleshooting

### Common Issues

#### Backend Issues
1. **MongoDB connection errors**: Check connection string and network access
2. **File upload failures**: Verify static directory permissions
3. **Health computation errors**: Check table data structure

#### Frontend Issues
1. **API connection errors**: Verify backend is running and accessible
2. **Theme switching issues**: Check ThemeProvider setup
3. **Routing problems**: Verify Wouter configuration

### Debug Mode

Enable debug logging:
```bash
# Backend
export LOG_LEVEL=DEBUG

# Frontend (in browser console)
localStorage.setItem('debug', 'qartha:*')
```

## Contributing

### Code Style
- **Backend**: Follow PEP 8 Python style guide
- **Frontend**: Use Prettier and ESLint configurations
- **TypeScript**: Strict type checking enabled

### Testing
- **Backend**: Use pytest for API testing
- **Frontend**: Use Vitest for component testing
- **E2E**: Consider Playwright for integration testing

### Pull Request Process
1. **Fork repository** and create feature branch
2. **Implement changes** with proper testing
3. **Update documentation** as needed
4. **Submit pull request** with clear description

---

## Support

For technical support or questions:
- **Documentation**: This file and inline code comments
- **Issue Tracking**: Use project issue tracker
- **Code Review**: All changes should be reviewed

This documentation provides a comprehensive overview of the Qartha system architecture, setup, and operations. Keep this document updated as the system evolves.
