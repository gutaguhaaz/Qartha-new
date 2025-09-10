import { apiRequest } from "./queryClient";

const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface IdfSearchParams {
  q?: string;
  limit?: number;
  skip?: number;
  include_health?: number;
}

export async function getIdfs(cluster: string, project: string, params: IdfSearchParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.skip) searchParams.set('skip', params.skip.toString());
  if (params.include_health) searchParams.set('include_health', params.include_health.toString());
  
  const url = `${API_BASE}/api/${cluster}/${project}/idfs?${searchParams}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch IDFs: ${response.statusText}`);
  return response.json();
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
  
  const url = `${API_BASE}/api/${cluster}/${project}/devices/upload_csv?code=${code}`;
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
