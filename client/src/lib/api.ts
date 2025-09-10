import { apiRequest } from "./queryClient";

// Base URL for API requests - use relative paths to leverage proxy
const API_BASE = "";

export interface IdfSearchParams {
  q?: string;
  limit?: number;
  skip?: number;
  include_health?: number;
}

export async function getIdfs(cluster: string, project: string, options: IdfSearchParams = {}) {
  try {
    const { limit = 50, include_health = 1 } = options;
    const response = await fetch(`${API_BASE}/api/${cluster}/${project}/idfs?limit=${limit}&include_health=${include_health}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch IDFs: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function getIdf(cluster: string, project: string, code: string) {
  const url = `${API_BASE}/api/${cluster}/${project}/idfs/${code}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch IDF: ${response.statusText}`);
  return response.json();
}

export async function uploadCsv(cluster: string, project: string, code: string, file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('code', code);

  const url = `${API_BASE}/api/${cluster}/${project}/devices/upload_csv`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) throw new Error(`Failed to upload CSV: ${response.statusText}`);
  return response.json();
}

export async function uploadAsset(cluster: string, project: string, code: string, file: File, assetType: 'images' | 'documents' | 'diagram', token: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('code', code);

  const url = `${API_BASE}/api/${cluster}/${project}/assets/${assetType}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) throw new Error(`Failed to upload asset: ${response.statusText}`);
  return response.json();
}

export async function uploadLogo(cluster: string, project: string, file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE}/api/${cluster}/${project}/assets/logo`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) throw new Error(`Failed to upload logo: ${response.statusText}`);
  return response.json();
}

export async function getLogo(cluster: string, project: string = 'trinity') {
  const url = `${API_BASE}/api/${cluster}/${project}/logo`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch logo: ${response.statusText}`);
  return response.json();
}

export function downloadCsvTemplate() {
  const headers = ['name', 'model', 'serial', 'rack', 'site', 'notes'];
  const csvContent = headers.join(',') + '\n';

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'device-template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}