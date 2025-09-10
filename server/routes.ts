import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // All API routes are handled by FastAPI backend
  // This file is kept for compatibility with the existing structure
  
  const httpServer = createServer(app);
  return httpServer;
}
