import { z } from "zod";

// Media Item Schema
export const mediaItemSchema = z.object({
  url: z.string(),
  name: z.string().optional(),
  kind: z.enum(["image", "document", "diagram"]),
});

// Table Column Schema
export const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "date", "select", "status"]),
  options: z.array(z.string()).optional(),
});

// IDF Table Schema
export const idfTableSchema = z.object({
  columns: z.array(tableColumnSchema),
  rows: z.array(z.record(z.any())),
});

// Health Counts Schema
export const healthCountsSchema = z.object({
  ok: z.number().int().min(0),
  revision: z.number().int().min(0),
  falla: z.number().int().min(0),
  libre: z.number().int().min(0),
  reservado: z.number().int().min(0),
});

// IDF Health Schema
export const idfHealthSchema = z.object({
  level: z.enum(["green", "yellow", "red", "gray"]),
  counts: healthCountsSchema,
});

// Media Logo Schema
export const mediaLogoSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

// IDF Media Schema
export const idfMediaSchema = z.object({
  logo: mediaLogoSchema.optional(),
});

// IDF Index Schema (for list view)
export const idfIndexSchema = z.object({
  cluster: z.string(),
  project: z.string(),
  code: z.string(),
  title: z.string(),
  site: z.string().optional(),
  room: z.string().optional(),
  health: idfHealthSchema.optional(),
  media: idfMediaSchema.optional(),
});

// IDF Public Schema (for detail view)
export const idfPublicSchema = z.object({
  cluster: z.string(),
  project: z.string(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  site: z.string().optional(),
  room: z.string().optional(),
  images: z.array(z.union([z.string(), mediaItemSchema])),
  documents: z.array(z.union([z.string(), mediaItemSchema])),
  diagrams: z.array(z.union([z.string(), mediaItemSchema])),
  dfo: z.array(z.union([z.string(), mediaItemSchema])),
  location: z.union([z.string(), z.array(z.union([z.string(), mediaItemSchema]))]).optional(),
  table: idfTableSchema.optional(),
  health: idfHealthSchema.optional(),
  media: idfMediaSchema.optional(),
});

// IDF Upsert Schema (for create/update)
export const idfUpsertSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  site: z.string().optional(),
  room: z.string().optional(),
  images: z.array(z.union([z.string(), mediaItemSchema])).optional(),
  documents: z.array(z.union([z.string(), mediaItemSchema])).optional(),
  diagrams: z.array(z.union([z.string(), mediaItemSchema])).optional(),
  location: z.union([z.string(), z.array(z.union([z.string(), mediaItemSchema]))]).optional(),
  dfo: z.array(z.union([z.string(), mediaItemSchema])).optional(),
  table: idfTableSchema.optional(),
});

// Device Schema
export const deviceSchema = z.object({
  cluster: z.string(),
  project: z.string(),
  idf_code: z.string(),
  name: z.string(),
  model: z.string().optional(),
  serial: z.string().optional(),
  rack: z.string().optional(),
  site: z.string().optional(),
  notes: z.string().optional(),
});

// Type exports
export type MediaItem = z.infer<typeof mediaItemSchema>;
export type MediaLogo = z.infer<typeof mediaLogoSchema>;
export type IdfMedia = z.infer<typeof idfMediaSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type IdfTable = z.infer<typeof idfTableSchema>;
export type HealthCounts = z.infer<typeof healthCountsSchema>;
export type IdfHealth = z.infer<typeof idfHealthSchema>;
export type IdfIndex = z.infer<typeof idfIndexSchema>;
export type IdfPublic = z.infer<typeof idfPublicSchema>;
export type IdfUpsert = z.infer<typeof idfUpsertSchema>;
export type Device = z.infer<typeof deviceSchema>;

export interface MediaItem {
  url: string;
  name?: string;
  kind?: string;
}

export interface IdfPublic {
  cluster: string;
  project: string;
  code: string;
  title: string;
  description?: string;
  site?: string;
  room?: string;
  images: (string | MediaItem)[];
  documents: (string | MediaItem)[];
  diagrams: (string | MediaItem)[];
  location?: string | (string | MediaItem)[];
  dfo: (string | MediaItem)[];
  logo?: string;
  table?: IdfTable;
  health?: IdfHealth;
  media?: {
    logo?: MediaItem;
  };
}

export interface IdfIndex {
  cluster: string;
  project: string;
  code: string;
  title: string;
  site?: string;
  room?: string;
  health?: IdfHealth;
  logo?: string;
}

export interface IdfCreate {
  code: string;
  title: string;
  description?: string;
  site?: string;
  room?: string;
  images?: (string | MediaItem)[];
  documents?: (string | MediaItem)[];
  diagrams?: (string | MediaItem)[];
  location?: string | (string | MediaItem)[];
  dfo?: (string | MediaItem)[];
  logo?: string;
  table?: IdfTable;
}

export interface IdfUpsert {
  title: string;
  description?: string;
  site?: string;
  room?: string;
  images?: (string | MediaItem)[];
  documents?: (string | MediaItem)[];
  diagrams?: (string | MediaItem)[];
  location?: string | (string | MediaItem)[];
  dfo?: (string | MediaItem)[];
  logo?: string;
  table?: IdfTable;
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

export interface MediaItem {
  url: string;
  name?: string;
  kind: string;
}