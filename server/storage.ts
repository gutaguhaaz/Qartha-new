// This file is kept for compatibility with the existing structure
// All data storage is handled by MongoDB in the FastAPI backend

export interface IStorage {
  // Placeholder interface for compatibility
}

export class MemStorage implements IStorage {
  constructor() {
    // No-op for compatibility
  }
}

export const storage = new MemStorage();
