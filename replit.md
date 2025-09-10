# Qartha Smart Inventory Network

## Overview

Qartha is a comprehensive multi-tenant IDF (Intermediate Distribution Frame) directory management system that provides public browsing of network infrastructure with health monitoring capabilities. The system supports multiple clusters and projects through path-based routing, offering both public directory access and administrative content management. It features real-time health status tracking with a color-coded semaphore system, file management with organized directory structure, and QR code generation for each IDF location.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
The backend is built with **FastAPI** and uses an async architecture pattern with MongoDB for data persistence. The system implements multi-tenant routing through path-based parameters (`/api/{cluster}/{project}/...`) and validates cluster access against an allowed list. Static file serving is integrated for asset management with organized directory structures by cluster and project.

**Data Models**: The system uses Pydantic v2 for data validation with models including IdfPublic, IdfIndex, MediaItem, IdfTable, and health tracking structures. Health status is computed dynamically from table data with a semaphore system (green/yellow/red/gray).

**Authentication**: Simple bearer token authentication for admin operations, with public read access for directory browsing.

### Frontend Architecture
The frontend is a **React 18 SPA** built with Vite and TypeScript, using client-side routing with Wouter. The architecture follows a component-based design with shadcn/ui components and Tailwind CSS for styling. State management is handled through TanStack Query for server state and local React state for UI interactions.

**Routing Structure**: Multi-tenant routing mirrors the backend (`/{cluster}/{project}/...`) with public directory listing, detailed IDF views, and admin CMS access.

**Component Design**: Modular components include Gallery (with lightbox), DocList, DataTable (with status badges), PdfOrImage viewer, and StatusBadge for health indicators.

### Data Storage Solutions
**Primary Database**: MongoDB Atlas with Motor for async operations. Collections include `idfs` and `devices` with compound indexes for multi-tenant queries.

**Static Assets**: File system storage organized by cluster/project/type structure, served directly through FastAPI static file mounting.

**Database Schema**: The system uses a flexible schema approach with embedded documents for media items, table structures, and health data within IDF documents.

### Health Monitoring System
Real-time health computation based on device status within IDF tables. The system analyzes status columns to generate health counts (ok, revision, falla, libre, reservado) and determines overall health levels. Health indicators are displayed throughout the UI with consistent color coding.

### File Management
Integrated static file serving with automatic directory creation and URL generation. Supports multiple file types including images (gallery), documents (download links), and diagrams (PDF/image viewer with zoom controls). Files are organized in a hierarchical structure by cluster, project, and asset type.

## External Dependencies

### Database Services
- **MongoDB Atlas**: Primary data store for IDF and device information with async Motor driver
- Note: Drizzle configuration exists but MongoDB is the active database solution

### Frontend Libraries
- **React 18**: Core frontend framework with TypeScript support
- **Vite**: Build tool and development server with HMR
- **Wouter**: Lightweight client-side routing
- **TanStack Query**: Server state management and caching
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework

### Backend Libraries
- **FastAPI**: ASGI web framework with automatic API documentation
- **Pydantic v2**: Data validation and serialization
- **Motor**: Async MongoDB driver
- **python-multipart**: File upload handling
- **QRCode**: QR code generation for IDF locations
- **Uvicorn**: ASGI server for production deployment

### Build and Development Tools
- **TypeScript**: Static type checking for both frontend and backend integration
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **Font Awesome**: Icon library for UI elements

### Environment Configuration
The system requires configuration for MongoDB connection, static file directory, admin authentication token, cluster definitions, and optional public base URL for QR code generation in production environments.