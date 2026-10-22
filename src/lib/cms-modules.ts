import { ApiResult } from './api';

export type CmsAction = 'create' | 'update' | 'delete';
const messages: Record<string, Partial<Record<CmsAction, string>>> = {
  categories: { create: 'Tạo Danh Mục thành công', update: 'Cập nhật thành công', delete: 'Đã xóa danh mục' },
  types: { create: 'Tạo danh mục bài viết thành công', update: 'Cập nhật thành công', delete: 'Đã xóa danh mục bài viết' },
  tags: { create: 'Thêm Tag thành công', delete: 'Đã xóa' },
  banner: { create: 'Thêm thành công', update: 'Cập nhật thành công', delete: 'Đã xoá' },
  about: { create: 'Thêm thành công', update: 'Cập nhật thành công', delete: 'Đã xoá bài viết' },
  'about-content': { create: 'Thêm thành công', update: 'Cập nhật thành công', delete: 'Đã xoá' },
  'about-images': { create: 'Thêm hình ảnh thành công', delete: 'Đã xoá' },
  logos: { create: 'Thêm hình ảnh thành công', delete: 'Đã xoá' },
  contact: { create: 'Thêm thành công', update: 'Cập nhật thành công' },
  accounts: { update: 'Cập nhật thành công', delete: 'Đã xoá' },
};

export function classifyCmsWrite(module: string, action: CmsAction, result: ApiResult) {
  const data = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : {};
  const message = typeof result.data === 'string' ? result.data : data.message;
  const uncertain = result.status === 0 || Object.entries(data).some(([k, v]) => /status$/i.test(k) && v === 'unknown');
  if (result.status === 409) return { success: false, review: true, message: 'Dữ liệu xung đột (409). Giữ bản nháp; tải lại danh sách để đối chiếu trước khi thử lại thủ công.' };
  if (uncertain || result.status >= 500 && !(module === 'tags' && message === 'Tag đã tồn tại')) {
    return { success: false, review: true, message: 'Kết quả ghi chưa xác định. Giữ dữ liệu; tải lại và đối chiếu danh sách trước khi thử lại thủ công. Không tự gửi lại.' };
  }
  if (result.ok && message === messages[module]?.[action]) return { success: true, review: false, message: String(message) };
  // In particular createtypes returns HTTP 200 for an existing type.
  return { success: false, review: result.ok && message !== 'Danh mục đã tồn tại', message: result.message || 'Backend chưa xác nhận thao tác thành công. Giữ dữ liệu để đối chiếu.' };
}

export function cmsJsonBody(module: string, form: FormData) {
  const values: Record<string, unknown> = Object.fromEntries(form.entries());
  if (module === 'accounts') {
    if (values.role !== 'true' && values.role !== 'false') throw new Error('Role không hợp lệ');
    values.role = values.role === 'true';
  }
  if (module === 'contact' && (String(values.contact || '').length > 500 || String(values.map || '').length > 2000)) throw new Error('Liên hệ tối đa 500 ký tự, bản đồ tối đa 2000 ký tự. Dữ liệu được giữ nguyên.');
  const json = JSON.stringify(values);
  if (new TextEncoder().encode(json).byteLength > 1024 * 1024) throw new Error('Dữ liệu vượt giới hạn JSON 1 MiB. Dữ liệu được giữ nguyên.');
  return json;
}
