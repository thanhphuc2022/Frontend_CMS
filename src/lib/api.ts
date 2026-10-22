export const LIVE_API_BASE = 'https://cms-backend-nodejs.vercel.app/api';
export const API_BASE = (
  typeof window === 'undefined'
    ? process.env.BACKEND_API_BASE_URL?.trim() || LIVE_API_BASE
    : '/api/backend'
).replace(/\/+$/, '');

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

let sessionVersion = 0;
export function saveTokens(accessToken?: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  sessionVersion++;
  if (accessToken) localStorage.setItem('thny_access_token', accessToken);
  if (refreshToken) localStorage.setItem('thny_refresh_token', refreshToken);
  window.dispatchEvent(new Event('thny-auth-change'));
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  sessionVersion++;
  localStorage.removeItem('thny_access_token');
  localStorage.removeItem('thny_refresh_token');
  window.dispatchEvent(new Event('thny-auth-change'));
}

async function requestOnce<T = unknown>(path: string, options: RequestInit = {}, useAuth = true): Promise<ApiResult<T>> {
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

// The current backend issues a new access token, without rotating the refresh
// token. Share one refresh across concurrent requests and never replay a write.
let refreshInFlight: Promise<ApiResult> | null = null;
let verificationInFlight: Promise<SessionState> | null = null;

function expiresSoon(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() + 30_000;
  } catch { return false; } // Decoding is scheduling only; the server verifies identity.
}

export function refreshAccessToken(): Promise<ApiResult> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  const version = sessionVersion;
  if (!refreshToken) return Promise.resolve({ ok: false, status: 401, data: null, message: 'Cần đăng nhập lại để tiếp tục. Dữ liệu đã nhập được giữ nguyên.' });
  refreshInFlight = (async () => {
    const result = await requestOnce<{ accesstoken?: string }>('/refreshtoken', {
      method: 'POST', headers: { Authorization: `Bearer ${refreshToken}` },
    }, false);
    // Logout or a newer login while refresh was pending must win.
    if (version !== sessionVersion || getRefreshToken() !== refreshToken || getAccessToken() !== accessToken) {
      return { ok: false, status: 401, data: null, message: 'Phiên đã thay đổi. Vui lòng kiểm tra đăng nhập.' };
    }
    if (result.ok && typeof result.data?.accesstoken === 'string' && result.data.accesstoken) {
      saveTokens(result.data.accesstoken);
      return result;
    }
    return { ...result, ok: false, message: result.status === 401
      ? 'Không xác minh được phiên. Hãy thử kiểm tra phiên hoặc đăng nhập lại; token chưa bị xóa.'
      : 'Backend chưa thể làm mới phiên. Giữ dữ liệu và thử lại khi kết nối ổn định.' };
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export type SessionState = 'absent' | 'verified' | 'unavailable' | 'reauthenticate';

export function verifySession(): Promise<SessionState> {
  if (!getAccessToken() && !getRefreshToken()) return Promise.resolve('absent');
  if (verificationInFlight) return verificationInFlight;
  verificationInFlight = (async (): Promise<SessionState> => {
    const token = getAccessToken();
    let result = await requestOnce('/checktoken', { method: 'POST' });
    if (token !== getAccessToken()) return getAccessToken() ? 'unavailable' : 'absent';
    if (result.ok && result.data === true) return getAccessToken() ? 'verified' : 'absent';
    if (!result.ok && result.status !== 401) return 'unavailable';
    // checktoken=false also covers DB errors in the current backend. Do not
    // erase credentials or claim the user logged out based on that response.
    const refreshed = await refreshAccessToken();
    if (!refreshed.ok) return refreshed.status === 401 ? 'reauthenticate' : 'unavailable';
    result = await requestOnce('/checktoken', { method: 'POST' });
    return result.ok && result.data === true && getAccessToken() ? 'verified' : 'unavailable';
  })().finally(() => { verificationInFlight = null; });
  return verificationInFlight;
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}, useAuth = true): Promise<ApiResult<T>> {
  if (useAuth && (getAccessToken() && expiresSoon(getAccessToken()) || !getAccessToken() && getRefreshToken())) {
    const refresh = await refreshAccessToken();
    if (!refresh.ok) return refresh as ApiResult<T>;
  }
  const token = getAccessToken();
  const result = await requestOnce<T>(path, options, useAuth);
  // changePass also uses 401 for a wrong current password, independently of
  // token validity. Preserve this business error instead of refreshing it.
  if (path === '/changePass' && result.status === 401 && result.data && typeof result.data === 'object' && (result.data as Record<string, unknown>).message === 'Mật khẩu không đúng') return result;
  if (useAuth && result.status === 401 && getRefreshToken()) {
    const refreshed = token !== getAccessToken() ? { ok: true } : await refreshAccessToken();
    if (refreshed.ok && ['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
      return requestOnce<T>(path, options, useAuth);
    }
    return { ...result, message: 'Yêu cầu chưa được xác thực. Kiểm tra phiên rồi thực hiện lại thủ công; dữ liệu đã nhập được giữ nguyên.' };
  }
  if (result.status === 403) return { ...result, message: 'Tài khoản không có quyền thực hiện thao tác này (403).' };
  return result;
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
  if (Array.isArray(record.contact)) return record.contact as CmsRecord[];

  return [];
}

export function recordKey(record: CmsRecord, fallback: number) {
  return String(record.id || record._id || record.slug || record.username || record.email || fallback);
}
