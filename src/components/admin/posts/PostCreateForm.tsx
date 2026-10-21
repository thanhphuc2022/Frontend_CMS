'use client';

import { FormEvent, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiRequest, toFormData } from '@/lib/api';

const TinyMceEditor = dynamic(() => import('./TinyMceEditor'), {
  ssr: false,
  loading: () => <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Đang tải TinyMCE...</div>,
});

export default function PostCreateForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [content, setContent] = useState('');
  const [resetSignal, setResetSignal] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file');

    if (!content.trim()) {
      setMessage('Vui lòng nhập nội dung bài viết');
      return;
    }

    const body = toFormData(
      {
        title: String(formData.get('title') || ''),
        description: String(formData.get('description') || ''),
        category: String(formData.get('category') || ''),
        content,
      },
      file instanceof File && file.size > 0 ? file : null,
    );

    setLoading(true);
    setMessage('');
    const result = await apiRequest('/createPost', { method: 'POST', body }, true);
    setLoading(false);
    setMessage(result.message);
    if (result.ok) {
      form.reset();
      setContent('');
      setResetSignal((value) => value + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-slate-950">Nội dung bài viết</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Tiêu đề</span>
              <input className="form-field w-full" name="title" placeholder="Nhập tiêu đề bài viết" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Mô tả ngắn</span>
              <textarea className="form-field min-h-28 w-full" name="description" placeholder="Tóm tắt hiển thị ngoài danh sách" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Nội dung</span>
              <TinyMceEditor value={content} onChange={setContent} resetSignal={resetSignal} />
              <input type="hidden" name="content" value={content} required />
            </label>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-slate-950">Thiết lập</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Tên danh mục</span>
              <input className="form-field w-full" name="category" placeholder="Ví dụ: Dich-vu" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Ảnh đại diện</span>
              <input className="form-field w-full bg-white" name="file" type="file" accept="image/*" required />
            </label>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo bài viết'}
          </button>
          <a className="btn-secondary mt-3 w-full justify-center" href="/admin">
            Quay lại Dashboard
          </a>
          {message && <p className="mt-4 rounded-lg bg-sky-50 p-4 text-sm font-semibold text-sky-800">{message}</p>}
        </section>
      </aside>
    </form>
  );
}
