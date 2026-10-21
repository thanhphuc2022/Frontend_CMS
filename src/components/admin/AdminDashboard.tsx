'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, clearTokens, CmsRecord, getAccessToken, normalizeList, recordKey, toFormData } from '@/lib/api';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'file' | 'select';
  options?: string[];
  required?: boolean;
};

type ModuleConfig = {
  key: string;
  label: string;
  description: string;
  listPath: string;
  createPath?: string;
  createHref?: string;
  updatePath?: (id: string) => string;
  deletePath?: (id: string) => string;
  deleteBodyField?: string;
  idField?: string;
  createFields?: Field[];
  updateFields?: Field[];
  multipart?: boolean;
  columns: string[];
  imageFields?: string[];
  authList?: boolean;
};

type PendingAction = {
  type: 'edit' | 'delete';
  item: CmsRecord;
} | null;

const modules: ModuleConfig[] = [
  {
    key: 'posts',
    label: 'Bài viết',
    description: 'Quản lý bài viết Post. Khi cần thêm bài mới, mở trang soạn riêng để thao tác rộng rãi hơn.',
    listPath: '/AllPost',
    createHref: '/admin/posts/create',
    updatePath: (id) => `/updatePost/${id}`,
    deletePath: (id) => `/deletePost/${id}`,
    idField: 'id',
    multipart: true,
    columns: ['title', 'categoryId', 'date', 'views'],
    updateFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'slug', label: 'Slug', required: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', required: true },
      { name: 'category', label: 'Tên danh mục', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
      { name: 'file', label: 'Ảnh mới', type: 'file' },
    ],
  },
  {
    key: 'news',
    label: 'Tin tức',
    description: 'Quản lý tin tức, loại tin và tag.',
    listPath: '/AllNews',
    createPath: '/createNews',
    updatePath: (id) => `/updateNews/${id}`,
    deletePath: (id) => `/deleteNews/${id}`,
    idField: 'id',
    multipart: true,
    columns: ['title', 'typesid', 'date', 'views'],
    createFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', required: true },
      { name: 'types', label: 'Tên loại tin', required: true },
      { name: 'tag', label: 'Tag' },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
      { name: 'file', label: 'Ảnh đại diện', type: 'file', required: true },
    ],
    updateFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'slug', label: 'Slug', required: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', required: true },
      { name: 'types', label: 'Tên loại tin', required: true },
      { name: 'tag', label: 'Tag' },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
      { name: 'file', label: 'Ảnh mới', type: 'file' },
    ],
  },
  {
    key: 'categories',
    label: 'Danh mục Post',
    description: 'Danh mục dùng cho Post.',
    listPath: '/loadAllCategories',
    createPath: '/createCategories',
    updatePath: (id) => `/updateCategories/${id}`,
    deletePath: (id) => `/deleteCategories/${id}`,
    idField: 'id',
    columns: ['id', 'name'],
    createFields: [{ name: 'name', label: 'Tên danh mục', required: true }],
    updateFields: [{ name: 'name', label: 'Tên danh mục', required: true }],
  },
  {
    key: 'types',
    label: 'Loại tin',
    description: 'Danh mục dùng cho News.',
    listPath: '/alltype',
    createPath: '/createtypes',
    updatePath: (id) => `/updatetypes/${id}`,
    deletePath: (id) => `/deletetypes/${id}`,
    idField: 'id',
    columns: ['id', 'name'],
    createFields: [{ name: 'name', label: 'Tên loại tin', required: true }],
    updateFields: [{ name: 'name', label: 'Tên loại tin', required: true }],
  },
  {
    key: 'tags',
    label: 'Tag',
    description: 'Tag cho tin tức.',
    listPath: '/alltag',
    createPath: '/createtag',
    deletePath: () => '/deletetag',
    deleteBodyField: 'tag',
    idField: 'name',
    columns: ['name'],
    createFields: [{ name: 'tag', label: 'Tên tag', required: true }],
  },
  {
    key: 'banner',
    label: 'Banner',
    description: 'Banner hero và CTA ngoài trang chủ.',
    listPath: '/allcontentbanner',
    createPath: '/createcontentbanner',
    updatePath: (id) => `/updatecontentbanner/${id}`,
    deletePath: (id) => `/deletecontentbanner/${id}`,
    idField: 'id',
    multipart: true,
    columns: ['images', 'title', 'linkservices'],
    imageFields: ['images', 'image', 'avatar', 'url', 'link_images', 'link_Images'],
    createFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea' },
      { name: 'linkservices', label: 'Link dịch vụ' },
      { name: 'file', label: 'Ảnh banner', type: 'file', required: true },
    ],
    updateFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea' },
      { name: 'linkservices', label: 'Link dịch vụ' },
      { name: 'file', label: 'Ảnh mới', type: 'file' },
    ],
  },
  {
    key: 'about',
    label: 'Giới thiệu',
    description: 'Các block giới thiệu có ảnh.',
    listPath: '/allabout',
    createPath: '/createabout',
    updatePath: (id) => `/updateabout/${id}`,
    deletePath: (id) => `/deleteabout/${id}`,
    idField: 'id',
    multipart: true,
    columns: ['images', 'title', 'id'],
    imageFields: ['images', 'image', 'avatar', 'url', 'link_images', 'link_Images'],
    createFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
      { name: 'file', label: 'Ảnh', type: 'file', required: true },
    ],
    updateFields: [
      { name: 'title', label: 'Tiêu đề', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
      { name: 'file', label: 'Ảnh mới', type: 'file' },
    ],
  },
  {
    key: 'about-content',
    label: 'Nội dung giới thiệu',
    description: 'Khối giới thiệu ngắn ngoài trang chủ.',
    listPath: '/aboutcontent',
    createPath: '/createaboutcontent',
    updatePath: () => '/updateaboutcontent',
    deletePath: () => '/deleteaboutcontent',
    idField: '_id',
    columns: ['content'],
    createFields: [{ name: 'content_about_index', label: 'Nội dung', type: 'textarea', required: true }],
    updateFields: [{ name: 'content_about_index', label: 'Nội dung', type: 'textarea', required: true }],
  },
  {
    key: 'about-images',
    label: 'Ảnh giới thiệu',
    description: 'Thư viện ảnh giới thiệu.',
    listPath: '/allaboutimage',
    createPath: '/createaboutimage',
    deletePath: (id) => `/deleteaboutiamge/${id}`,
    idField: 'public_id',
    multipart: true,
    columns: ['link_images', 'public_id'],
    imageFields: ['link_images', 'images', 'image', 'avatar', 'url'],
    createFields: [{ name: 'file', label: 'Ảnh', type: 'file', required: true }],
  },
  {
    key: 'logos',
    label: 'Logo',
    description: 'Logo khách hàng/đối tác.',
    listPath: '/allimagelogo',
    createPath: '/createimagelogo',
    deletePath: (id) => `/deleteimagelogo/${id}`,
    idField: 'public_id',
    multipart: true,
    columns: ['link_Images', 'public_id'],
    imageFields: ['link_Images', 'link_images', 'images', 'image', 'avatar', 'url'],
    createFields: [{ name: 'file', label: 'Ảnh logo', type: 'file', required: true }],
  },
  {
    key: 'contact',
    label: 'Liên hệ',
    description: 'Thông tin liên hệ và iframe bản đồ.',
    listPath: '/getcontact',
    createPath: '/createcontact',
    updatePath: () => '/updatecontact',
    idField: '_id',
    columns: ['contact', 'map'],
    createFields: [
      { name: 'contact', label: 'Thông tin liên hệ', type: 'textarea', required: true },
      { name: 'map', label: 'Bản đồ', type: 'textarea', required: true },
    ],
    updateFields: [
      { name: 'contact', label: 'Thông tin liên hệ', type: 'textarea', required: true },
      { name: 'map', label: 'Bản đồ', type: 'textarea', required: true },
    ],
  },
  {
    key: 'accounts',
    label: 'Tài khoản',
    description: 'Quản trị account, role và xóa tài khoản.',
    listPath: '/allaccount',
    updatePath: (username) => `/updateauth/${username}`,
    deletePath: (username) => `/deleteaccount/${username}`,
    idField: 'username',
    authList: true,
    columns: ['username', 'fullname', 'email', 'role'],
    updateFields: [{ name: 'role', label: 'Role', type: 'select', options: ['false', 'true'], required: true }],
  },
];

export default function AdminDashboard() {
  const [activeKey, setActiveKey] = useState(modules[0].key);
  const [items, setItems] = useState<CmsRecord[]>([]);
  const [selected, setSelected] = useState<CmsRecord | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const active = useMemo(() => modules.find((module) => module.key === activeKey) || modules[0], [activeKey]);

  const loadData = useCallback(async (moduleConfig = active) => {
    setLoading(true);
    setMessage('');
    const result = await apiRequest(moduleConfig.listPath, { method: 'GET' }, Boolean(moduleConfig.authList));
    setItems(normalizeList(result.data));
    setLoading(false);
    if (!result.ok) setMessage(result.message);
  }, [active]);

  useEffect(() => {
    setTokenReady(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    setSelected(null);
    loadData(active);
  }, [active, loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>, action: 'create' | 'update') {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const id = selected ? String(selected[active.idField || 'id'] || '') : '';
    const path = action === 'create' ? active.createPath : active.updatePath?.(id);

    if (!path) return;
    setLoading(true);
    setMessage('');

    const fields = action === 'create' ? active.createFields || [] : active.updateFields || [];
    const body = active.multipart ? buildMultipartBody(fields, formData) : JSON.stringify(Object.fromEntries(formData.entries()));
    const result = await apiRequest(path, { method: 'POST', body }, true);

    setLoading(false);
    setMessage(result.message);
    if (result.ok) {
      form.reset();
      setSelected(null);
      await loadData(active);
    }
  }

  async function handleDelete(item: CmsRecord) {
    const id = String(item[active.idField || 'id'] || '');
    const path = active.deletePath?.(id);
    if (!path) return;

    setLoading(true);
    setMessage('');
    const body = active.deleteBodyField ? JSON.stringify({ [active.deleteBodyField]: id }) : undefined;
    const result = await apiRequest(path, { method: 'POST', body }, true);
    setLoading(false);
    setMessage(result.message);
    if (result.ok) await loadData(active);
  }

  function requestEdit(item: CmsRecord) {
    setConfirmAction({ type: 'edit', item });
  }

  function requestDelete(item: CmsRecord) {
    setConfirmAction({ type: 'delete', item });
  }

  async function confirmPendingAction() {
    if (!confirmAction) return;

    const action = confirmAction;
    setConfirmAction(null);

    if (action.type === 'edit') {
      setSelected(action.item);
      return;
    }

    await handleDelete(action.item);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="section-kicker">Dashboard</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">Quản trị Thanh Phúc Coder</h1>
            <p className="mt-3 max-w-3xl text-slate-600">Danh sách, sửa nhanh và xóa nằm tách biệt rõ ràng. Form thêm bài viết đã chuyển sang trang riêng.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/account" className="btn-secondary">Tài khoản</a>
            <button className="btn-secondary" onClick={() => { clearTokens(); setTokenReady(false); }}>Đăng xuất</button>
          </div>
        </div>
      </section>

      {!tokenReady && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            Chưa có access token. Hãy đăng nhập tại <a className="underline" href="/login">/login</a> trước khi tạo, sửa hoặc xóa dữ liệu.
          </div>
        </div>
      )}

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="h-max rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
          {modules.map((module) => (
            <button
              key={module.key}
              className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-bold transition ${module.key === activeKey ? 'bg-sky-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              onClick={() => setActiveKey(module.key)}
            >
              {module.label}
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{active.label}</h2>
                <p className="mt-2 text-slate-600">{active.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {active.createHref && <a className="btn-primary" href={active.createHref}>Thêm bài viết</a>}
                {active.createPath && active.createFields && !active.createHref && (
                  <button className="btn-primary" onClick={() => setSelected({ __mode: 'create' })}>Thêm mới</button>
                )}
                <button className="btn-secondary" onClick={() => loadData(active)} disabled={loading}>{loading ? 'Đang tải...' : 'Tải lại'}</button>
              </div>
            </div>
            {message && <p className="mt-4 rounded-lg bg-sky-50 p-4 text-sm font-semibold text-sky-800">{message}</p>}
          </div>

          <RecordsList config={active} items={items} selected={selected} onSelect={requestEdit} onDelete={requestDelete} loading={loading} />

          {selected?.__mode === 'create' && active.createPath && active.createFields && (
            <EditorForm title={`Thêm ${active.label}`} fields={active.createFields} loading={loading} onSubmit={(event) => handleSubmit(event, 'create')} />
          )}

        </div>
      </section>

      {selected && selected.__mode !== 'create' && active.updatePath && active.updateFields && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex justify-end">
              <button type="button" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-700 shadow-lg ring-1 ring-slate-200 hover:text-sky-600" onClick={() => setSelected(null)}>
                Đóng
              </button>
            </div>
            <EditorForm title={`Cập nhật: ${String(selected[active.idField || 'id'] || '')}`} fields={active.updateFields} record={selected} imageFields={active.imageFields} loading={loading} onSubmit={(event) => handleSubmit(event, 'update')} />
          </div>
        </div>
      )}

      <ConfirmModal
        action={confirmAction}
        config={active}
        loading={loading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmPendingAction}
      />
    </main>
  );
}

function RecordsList({
  config,
  items,
  selected,
  onSelect,
  onDelete,
  loading,
}: {
  config: ModuleConfig;
  items: CmsRecord[];
  selected: CmsRecord | null;
  onSelect: (item: CmsRecord) => void;
  onDelete: (item: CmsRecord) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <p className="font-black text-slate-950">Danh sách ({items.length})</p>
        <p className="text-sm font-semibold text-slate-500">Thao tác luôn nằm bên phải mỗi mục</p>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, index) => (
          <article key={recordKey(item, index)} className={`grid gap-4 p-5 lg:grid-cols-[1fr_180px] ${selected === item ? 'bg-sky-50' : 'bg-white'}`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {config.columns.map((column) => (
                <div key={column} className="min-w-0">
                  <p className="text-xs font-black uppercase text-slate-400">{column}</p>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    <CellValue value={item[column]} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start justify-start gap-3 lg:justify-end">
              {config.updatePath && <button className="rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 hover:bg-sky-100" onClick={() => onSelect(item)}>Sửa</button>}
              {config.deletePath && <button className="rounded-full bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 hover:bg-rose-100" onClick={() => onDelete(item)} disabled={loading}>Xóa</button>}
            </div>
          </article>
        ))}
        {!items.length && (
          <div className="px-5 py-10 text-center text-slate-500">
            {loading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu hoặc API chưa phản hồi.'}
          </div>
        )}
      </div>
    </div>
  );
}

function EditorForm({
  title,
  fields,
  record,
  imageFields,
  loading,
  onSubmit,
}: {
  title: string;
  fields: Field[];
  record?: CmsRecord;
  imageFields?: string[];
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const currentImage = record ? getFirstImageUrl(record, imageFields) : '';

  return (
    <form onSubmit={onSubmit} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      {currentImage && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Ảnh hiện tại</p>
          <a href={currentImage} target="_blank" rel="noreferrer" className="mt-3 block w-max overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
            <img src={currentImage} alt="Ảnh hiện tại" className="h-40 w-64 object-cover" />
          </a>
        </div>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className={field.type === 'textarea' || field.type === 'file' ? 'block lg:col-span-2' : 'block'}>
            <span className="mb-2 block text-sm font-bold text-slate-700">{field.label}</span>
            <FieldInput field={field} value={record?.[field.name]} />
          </label>
        ))}
      </div>
      <button className="btn-primary mt-6 justify-center" disabled={loading}>{loading ? 'Đang xử lý...' : title}</button>
    </form>
  );
}

function FieldInput({ field, value }: { field: Field; value: unknown }) {
  const defaultValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';

  if (field.type === 'textarea') {
    return <textarea className="form-field min-h-36 w-full" name={field.name} defaultValue={defaultValue} required={field.required} />;
  }

  if (field.type === 'file') {
    return <input className="form-field w-full bg-white" name={field.name} type="file" accept="image/*" required={field.required} />;
  }

  if (field.type === 'select') {
    return (
      <select className="form-field w-full" name={field.name} defaultValue={defaultValue || field.options?.[0]} required={field.required}>
        {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return <input className="form-field w-full" name={field.name} type="text" defaultValue={defaultValue} required={field.required} />;
}

function CellValue({ value }: { value: unknown }) {
  if (typeof value === 'boolean') return <span>{value ? 'Admin' : 'Editor'}</span>;
  if (typeof value === 'string' && value.startsWith('http')) {
    if (isImageUrl(value)) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="block w-max overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
          <img src={value} alt="Ảnh quản trị" className="h-24 w-36 object-cover" loading="lazy" />
        </a>
      );
    }

    return <a className="line-clamp-2 text-sky-600" href={value} target="_blank" rel="noreferrer">{value}</a>;
  }
  if (typeof value === 'string') return <span className="line-clamp-3">{value.replace(/<[^>]*>/g, ' ')}</span>;
  if (typeof value === 'number') return <span>{value}</span>;
  return <span className="text-slate-400">-</span>;
}

function ConfirmModal({
  action,
  config,
  loading,
  onCancel,
  onConfirm,
}: {
  action: PendingAction;
  config: ModuleConfig;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const recordName = getRecordDisplayName(action.item, config);
  const isDelete = action.type === 'delete';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <p className={`text-sm font-black uppercase ${isDelete ? 'text-rose-600' : 'text-sky-600'}`}>
          {isDelete ? 'Xác nhận xóa' : 'Xác nhận sửa'}
        </p>
        <h3 className="mt-3 text-2xl font-black text-slate-950">
          {isDelete ? 'Bạn chắc chắn muốn xóa mục này?' : 'Bạn muốn mở form sửa mục này?'}
        </h3>
        <p className="mt-3 leading-7 text-slate-600">
          Mục đang chọn: <span className="font-bold text-slate-900">{recordName}</span>
        </p>
        {isDelete && (
          <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            Thao tác xóa sẽ gọi API backend và có thể không khôi phục được.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            Hủy
          </button>
          <button
            type="button"
            className={`inline-flex items-center rounded-full px-7 py-3.5 text-sm font-extrabold leading-none text-white shadow-xl transition ${isDelete ? 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700' : 'bg-sky-500 shadow-sky-500/25 hover:bg-sky-600'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : isDelete ? 'Xóa mục này' : 'Mở form sửa'}
          </button>
        </div>
      </section>
    </div>
  );
}

function getRecordDisplayName(record: CmsRecord, config: ModuleConfig) {
  const idField = config.idField || 'id';
  const value = record.title || record.name || record.username || record.email || record.slug || record[idField] || record._id || record.id;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : 'Không có tên';
}

function isImageUrl(value: string) {
  return /^https?:\/\//i.test(value) && (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value) || value.includes('res.cloudinary.com'));
}

function getFirstImageUrl(record: CmsRecord, fields: string[] = []) {
  const candidates = [...fields, 'images', 'image', 'avatar', 'thumbnail', 'link_images', 'link_Images', 'url'];

  for (const field of candidates) {
    const value = record[field];
    if (typeof value === 'string' && isImageUrl(value)) return value;
  }

  return '';
}

function buildMultipartBody(fields: Field[], formData: FormData) {
  const file = formData.get('file');
  const values: Record<string, string> = {};

  fields.forEach((field) => {
    if (field.type !== 'file') values[field.name] = String(formData.get(field.name) || '');
  });

  return toFormData(values, file instanceof File && file.size > 0 ? file : null);
}
