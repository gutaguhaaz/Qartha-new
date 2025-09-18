import { z } from "zod";

// Media Item Schema
export const mediaItemSchema = z.object({
  url: z.string().url(),
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
  gallery: z.array(mediaItemSchema),
  documents: z.array(mediaItemSchema),
  diagrams: z.array(mediaItemSchema),
  dfo: mediaItemSchema.optional(),
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
  dfo: mediaItemSchema.optional(),
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
