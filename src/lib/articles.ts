import { apiRequest, ApiResult, CmsRecord } from './api';

export type ArticleKind = 'posts' | 'news';
export type WriteAction = 'create' | 'update' | 'delete';
export const articleConfig = {
  posts: { label: 'bài viết', list: '/AllPost', detail: '/post/', create: '/createPost', update: '/updatePost/', delete: '/deletePost/', lookup: '/loadAllCategories', relation: 'category', relationId: 'categoryId', upload: '/uploadimagesPost' },
  news: { label: 'tin tức', list: '/AllNews', detail: '/Newsid/', create: '/createNews', update: '/updateNews/', delete: '/deleteNews/', lookup: '/alltype', relation: 'types', relationId: 'typesid', upload: '/uploadimagesNews' },
} as const;

export type ArticlePage = { data: CmsRecord[]; total: number; pages: number; page: number; limit: number };
export function parseArticlePage(data: unknown, requestedPage: number): ArticlePage {
  const p = data as Record<string, unknown> | null;
  if (!p || !Array.isArray(p.data) || !['total', 'pages', 'currentPage', 'limit'].every((k) => typeof p[k] === 'number' && Number.isInteger(p[k]) && Number(p[k]) >= 0) || Number(p.limit) < 1) throw new Error('Response phân trang không hợp lệ');
  // News clamps currentPage but queries skip using the requested page.
  const pages = Number(p.pages);
  return { data: p.data as CmsRecord[], total: Number(p.total), pages, limit: Number(p.limit), page: Math.max(1, Math.min(requestedPage, Math.max(1, pages))) };
}

export async function fetchArticlePage(kind: ArticleKind, requestedPage: number, signal?: AbortSignal): Promise<ArticlePage> {
  const result = await apiRequest(`${articleConfig[kind].list}?page=${requestedPage}`, { cache: 'no-store', signal }, false);
  if (!result.ok) throw new Error(result.message);
  const page = parseArticlePage(result.data, requestedPage);
  if (page.page !== requestedPage) return fetchArticlePage(kind, page.page, signal);
  return page;
}

export async function fetchArticleDetail(kind: ArticleKind, id: string): Promise<CmsRecord> {
  const result = await apiRequest<CmsRecord>(`${articleConfig[kind].detail}${encodeURIComponent(id)}`, { cache: 'no-store' }, false);
  if (!result.ok || result.data?.id !== id || typeof result.data.content !== 'string') throw new Error(result.message || 'Không tải được chi tiết');
  return result.data;
}

export type WriteOutcome = { state: 'success' | 'error' | 'conflict' | 'unknown'; message: string; id?: string };
export function classifyArticleWrite(kind: ArticleKind, action: WriteAction, result: ApiResult, expectedId?: string): WriteOutcome {
  const data = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {};
  const id = typeof data.id === 'string' && data.id ? data.id : expectedId;
  if (result.status === 0 || ['creationStatus', 'updateStatus', 'deleteStatus'].some((key) => data[key] === 'unknown')) return { state: 'unknown', id, message: 'Kết quả ghi chưa xác định. Dữ liệu nhập được giữ lại. Đối chiếu danh sách và chi tiết trước khi thử lại; không tự gửi lại.' };
  if (result.status === 409) return { state: 'conflict', id, message: 'Dữ liệu đã thay đổi. Giữ lại bản nháp và đối chiếu chi tiết mới trước khi cập nhật lại.' };
  const expected = action === 'delete' ? 'Đã xóa bài viết' : action === 'update' ? 'Cập nhật thành công' : kind === 'posts' ? 'Đã thêm bài viết' : 'Thêm thành công';
  if (result.ok && data.message === expected && typeof data.id === 'string' && data.id.length > 0 && (!expectedId || data.id === expectedId)) return { state: 'success', id: data.id, message: expected };
  if (result.ok && data.message !== 'Vui lòng điền đầy đủ thông tin' && !String(data.message || '').startsWith('Không tìm thấy')) return { state: 'unknown', id, message: 'Chưa nhận được xác nhận lưu theo hợp đồng backend. Giữ bản nháp và đối chiếu trước khi thử lại.' };
  return { state: 'error', id, message: result.message || 'Thao tác thất bại' };
}

export function articleTags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v) : typeof value === 'string' && value ? [value] : [];
}

export function buildArticleBody(kind: ArticleKind, form: FormData, content: string, record?: CmsRecord): FormData | string {
  const config = articleConfig[kind];
  const values: Record<string, string | string[]> = { title: String(form.get('title') || ''), description: String(form.get('description') || ''), content, [config.relation]: String(form.get(config.relation) || '') };
  if (record) values.slug = String(form.get('slug') || '');
  const tags = form.getAll('tag').map(String);
  if (kind === 'news') values.tag = tags;
  const file = form.get('file');
  const hasFile = file instanceof Blob && file.size > 0;
  if (!values.title || !values.description || !values[config.relation] || !content.trim() || (record && !values.slug)) throw new Error('Vui lòng điền đầy đủ thông tin');
  if (String(values.title).length > 200 || String(values.description).length > 5000 || content.length > 500_000 || String(values[config.relation]).length > 100 || String(values.slug || '').length > 250 || tags.some((t) => t.length > 100)) throw new Error('Dữ liệu vượt giới hạn backend');
  if (!record && !hasFile) throw new Error('Vui lòng chọn ảnh đại diện');
  if (hasFile && file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5 MB');
  // JSON updates are accepted by body-parser + multer, and can express tag: [].
  if (record && !hasFile) {
    const json = JSON.stringify(values);
    if (new TextEncoder().encode(json).byteLength > 1024 * 1024) throw new Error('Dữ liệu JSON vượt giới hạn 1 MiB của backend. Bản nháp được giữ lại.');
    return json;
  }
  if (record && kind === 'news' && tags.length === 0 && articleTags(record.tag).length > 0) throw new Error('Để xóa hết tag, lưu không đổi ảnh trước, sau đó đổi ảnh trong lần lưu tiếp theo.');
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) body.append(key, item);
  const textFields = [...body.values()];
  // Installed Busboy emits field/parts limit events at the configured boundary:
  // a 100 KiB field or 20 text fields plus the file is rejected by this backend.
  if (textFields.length >= 20) throw new Error('Multipart chỉ hỗ trợ tối đa 19 trường chữ kèm ảnh. Vui lòng giảm số tag; bản nháp được giữ lại.');
  if (textFields.some((value) => typeof value === 'string' && new TextEncoder().encode(value).byteLength >= 100 * 1024)) throw new Error('Mỗi trường multipart phải nhỏ hơn 100 KiB UTF-8. Vui lòng rút gọn nội dung trước khi gửi kèm ảnh; bản nháp được giữ lại.');
  if (hasFile) body.append('file', file);
  return body;
}
