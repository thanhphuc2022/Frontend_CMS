export const LIVE_API_BASE = 'https://blog-tinhocnhuy.vercel.app/api';
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window === 'undefined' ? LIVE_API_BASE : '/api/backend')
).replace(/\/$/, '');

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

export type CmsRecord = Record<string, unknown> & {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  slug?: string;
  description?: string;
  avatar?: string;
  images?: string;
  date?: string;
  views?: number;
  username?: string;
  email?: string;
  fullname?: string;
  role?: boolean;
};

export function getAccessToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('thny_access_token') || '';
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('thny_refresh_token') || '';
}

export function saveTokens(accessToken?: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  if (accessToken) localStorage.setItem('thny_access_token', accessToken);
  if (refreshToken) localStorage.setItem('thny_refresh_token', refreshToken);
  window.dispatchEvent(new Event('thny-auth-change'));
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('thny_access_token');
  localStorage.removeItem('thny_refresh_token');
  window.dispatchEvent(new Event('thny-auth-change'));
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}, useAuth = true): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (useAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    const message = typeof data === 'string' ? data : data?.message || data?.error || response.statusText;

    return {
      ok: response.ok,
      status: response.status,
      data: data as T,
      message,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      message: error instanceof Error ? error.message : 'Không thể kết nối API',
    };
  }
}

export function toFormData(values: Record<string, string>, file?: File | null) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    formData.append(key, value);
  });
  if (file) formData.append('file', file);
  return formData;
}

export function normalizeList(data: unknown): CmsRecord[] {
  if (Array.isArray(data)) return data as CmsRecord[];
  if (!data || typeof data !== 'object') return [];

  const record = data as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data as CmsRecord[];
  if (Array.isArray(record.content_banner)) return record.content_banner as CmsRecord[];
  if (Array.isArray(record.about)) return record.about as CmsRecord[];
  if (Array.isArray(record.about_images)) return record.about_images as CmsRecord[];
  if (Array.isArray(record.image_logo)) return record.image_logo as CmsRecord[];
  if (Array.isArray(record.types)) return record.types as CmsRecord[];
  if (Array.isArray(record.tag)) return record.tag as CmsRecord[];
  if (Array.isArray(record.categories)) return record.categories as CmsRecord[];

  return [];
}

export function recordKey(record: CmsRecord, fallback: number) {
  return String(record.id || record._id || record.slug || record.username || record.email || fallback);
}
