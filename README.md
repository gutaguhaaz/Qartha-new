# Qartha Smart Inventory Network

A comprehensive multi-tenant IDF (Intermediate Distribution Frame) directory management system built with FastAPI backend and React frontend.

## Features

- **Multi-tenant Architecture**: Support for multiple clusters and projects with path-based routing
- **Public IDF Directory**: Browse and search IDFs with health status indicators
- **Admin CMS**: Upload and manage assets (images, documents, diagrams) and import devices via CSV
- **Health Monitoring**: Real-time status tracking with color-coded semaphore system
- **File Management**: Integrated static file serving with organized directory structure
- **Dynamic Tables**: Customizable table rendering with status badges
- **PDF Viewer**: Integrated diagram viewing with zoom controls
- **Image Gallery**: Responsive gallery with lightbox functionality
- **QR Code Generation**: Automatic QR code generation for each IDF

## Tech Stack

### Backend
- **FastAPI** with Pydantic v2 for API and data validation
- **MongoDB Atlas** with Motor for async database operations
- **Python-multipart** for file uploads
- **QRCode** for QR code generation
- **Uvicorn** as ASGI server

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **Wouter** for client-side routing
- **TanStack Query** for data fetching
- **shadcn/ui** for UI components

## Environment Setup

### Backend Environment Variables

```bash
MONGO_URL_ATLAS=mongodb://localhost:27017
DB_NAME=qartha
STATIC_DIR=static
ADMIN_TOKEN=changeme-demo-token
DEFAULT_CLUSTER=trk
ALLOWED_CLUSTERS=trk,lab
DEFAULT_PROJECT=trinity
PUBLIC_BASE_URL=  # Optional: for production QR codes
