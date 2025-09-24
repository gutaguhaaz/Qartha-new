import { config } from "@/config";

export interface IdfSearchParams {
  q?: string;
  limit?: number;
  skip?: number;
  include_health?: number;
}

const API_PREFIX = (config.api.baseUrl || "").replace(/\/$/, "");
const API_ROOT = `${API_PREFIX}/api`;
const API_BASE = API_PREFIX; // Assuming API_BASE should be the prefix

const buildUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${normalized}`;
};

const handleUnauthorized = () => {
  const loginPath = "/login";
  const currentPath = window.location.pathname + window.location.search + window.location.hash;

  if (!window.location.pathname.startsWith(loginPath)) {
    sessionStorage.setItem("redirect_to", currentPath || "/");
    document.cookie = `redirect_to=${encodeURIComponent(currentPath || "/")}; path=/; max-age=300; SameSite=Lax`;
    window.location.href = loginPath;
  }

  throw new Error("Unauthorized");
};

export async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(buildUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      "X-Requested-With": "fetch",
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function requestJson(path: string, data?: unknown, method: string = "POST") {
  return request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

async function requestForm(path: string, formData: FormData, method: string = "POST") {
  const response = await fetch(buildUrl(path), {
    method,
    credentials: "include",
    body: formData,
    headers: {
      "X-Requested-With": "fetch",
    },
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function getIdfs(cluster: string, project: string, options: IdfSearchParams = {}) {
  const params = new URLSearchParams();
  const { limit = 50, skip = 0, include_health = 1, q } = options;

  params.set("limit", limit.toString());
  params.set("skip", skip.toString());
  params.set("include_health", include_health.toString());
  if (q) params.set("q", q);

  return request(`/${cluster}/${project}/idfs?${params.toString()}`, { method: "GET" });
}

export async function getIdf(cluster: string, project: string, code: string) {
  return request(`/${cluster}/${project}/idfs/${code}`, { method: "GET" });
}

export interface MediaPayload {
  url: string;
  name?: string;
  kind: string;
}

export interface IdfUpsertPayload {
  title: string;
  description?: string;
  site?: string;
  room?: string;
  images?: MediaPayload[];
  documents?: MediaPayload[];
  diagrams?: MediaPayload[];
  location?: MediaPayload[];
  dfo?: MediaPayload | null;
  table?: any | null;
}

export type IdfCreatePayload = IdfUpsertPayload & { code: string };

export async function createIdf(cluster: string, project: string, payload: IdfCreatePayload) {
  return requestJson(`/admin/${cluster}/${project}/idfs`, payload, "POST");
}

export async function updateIdf(cluster: string, project: string, code: string, payload: IdfUpsertPayload) {
  return requestJson(`/admin/${cluster}/${project}/idfs/${code}`, payload, "PUT");
}

export async function deleteIdf(cluster: string, project: string, code: string) {
  return request(`/admin/${cluster}/${project}/idfs/${code}`, { method: "DELETE" });
}

export async function uploadCsv(cluster: string, project: string, code: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("code", code);
  return requestForm(`/${cluster}/${project}/devices/upload_csv`, formData);
}

export async function uploadAssets(
  cluster: string,
  project: string,
  code: string,
  files: File[],
  assetType: "images" | "documents" | "diagrams" | "dfo",
) {
  const formData = new FormData();
  files.forEach(file => formData.append("files", file));
  return requestForm(`/${cluster}/${project}/assets/${code}/${assetType}`, formData);
}

export async function uploadSingleAsset(
  cluster: string,
  project: string,
  code: string,
  file: File,
  assetType: "location" | "logo",
) {
  const formData = new FormData();
  formData.append("file", file);
  return requestForm(`/${cluster}/${project}/assets/${code}/${assetType}`, formData);
}

export async function uploadAsset(
  cluster: string,
  project: string,
  code: string,
  file: File,
  assetType: "images" | "documents" | "diagrams" | "dfo" | "location" | "logo",
) {
  const formData = new FormData();

  if (assetType === "location" || assetType === "logo") {
    formData.append("file", file);
    return requestForm(`/${cluster}/${project}/assets/${code}/${assetType}`, formData);
  } else {
    formData.append("files", file);
    return requestForm(`/${cluster}/${project}/assets/${code}/${assetType}`, formData);
  }
}

export async function deleteAsset(
  cluster: string,
  project: string,
  code: string,
  type: "images" | "documents" | "diagrams" | "location" | "dfo",
  index: number,
) {
  const response = await fetch(
    `${API_BASE}/api/${cluster}/${encodeURIComponent(project)}/assets/${code}/${type}/${index}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to delete ${type}`);
  }
  return response.json();
}

export async function updateDocumentTitle(
  cluster: string,
  project: string,
  code: string,
  index: number,
  title: string,
) {
  const response = await fetch(
    `${API_BASE}/api/${cluster}/${encodeURIComponent(project)}/assets/${code}/documents/${index}/title?title=${encodeURIComponent(title)}`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update document title");
  }
  return response.json();
}

export async function uploadLogo(cluster: string, project: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return requestForm(`/admin/${cluster}/${project}/assets/logo`, formData);
}

export async function getLogo(cluster: string, project: string) {
  return request(`/${cluster}/${project}/logo`, { method: "GET" });
}

export async function uploadIdfLogo(cluster: string, project: string, code: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return requestForm(
    `/admin/${encodeURIComponent(cluster)}/${encodeURIComponent(project)}/assets/${encodeURIComponent(code)}/logo`,
    formData,
    'POST'
  );
};

export function downloadCsvTemplate() {
  const headers = ["name", "model", "serial", "rack", "site", "notes"];
  const csvContent = `${headers.join(",")}\n`;

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "device-template.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}