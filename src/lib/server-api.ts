import { API_BASE, CmsRecord, normalizeList } from './api';

export async function serverGet<T = unknown>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function serverList(path: string): Promise<CmsRecord[]> {
  const data = await serverGet(path);
  return normalizeList(data);
}

export function stripHtml(value?: unknown) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
