'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiRequest, CmsRecord, normalizeList } from '@/lib/api';
import { ArticleKind, articleConfig, articleTags, buildArticleBody, classifyArticleWrite, WriteOutcome } from '@/lib/articles';
import WriteReview from './WriteReview';
const TinyMceEditor = dynamic(() => import('../posts/TinyMceEditor'), { ssr: false, loading: () => <p>Đang tải TinyMCE...</p> });

export default function ArticleEditor({ kind, record, page = 1, onSaved }: { kind: ArticleKind; record?: CmsRecord; page?: number; onSaved?: (message: string) => void }) {
  const config = articleConfig[kind];
  const [content, setContent] = useState(String(record?.content || ''));
  const [lookups, setLookups] = useState<{ relations: CmsRecord[]; tags: string[] } | null>(null);
  const [lookupError, setLookupError] = useState(''), [lookupVersion, setLookupVersion] = useState(0);
  const [loading, setLoading] = useState(false), [message, setMessage] = useState('');
  const [blocked, setBlocked] = useState<WriteOutcome | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLookupError('');
    Promise.all([apiRequest(config.lookup, { signal: controller.signal, cache: 'no-store' }, false), kind === 'news' ? apiRequest('/alltag', { signal: controller.signal, cache: 'no-store' }, false) : Promise.resolve(null)]).then(([relations, tags]) => {
      if (controller.signal.aborted) return;
      if (!relations.ok || (tags && !tags.ok)) { setLookupError(relations.ok ? tags?.message || 'Không tải được tag' : relations.message); return; }
      setLookups({ relations: normalizeList(relations.data), tags: [...new Set([...normalizeList(tags?.data).map((t) => String(t.name || '')).filter(Boolean), ...articleTags(record?.tag)])] });
    });
    return () => controller.abort();
  }, [config.lookup, kind, record, lookupVersion]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current || blocked || !lookups) return;
    const form = event.currentTarget; let body: FormData | string;
    try { body = buildArticleBody(kind, new FormData(form), content, record); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Dữ liệu không hợp lệ'); return; }
    submitting.current = true; setLoading(true); setMessage('');
    const id = record ? String(record.id) : undefined;
    const result = await apiRequest(record ? config.update + encodeURIComponent(id!) : config.create, { method: 'POST', body }, true);
    const outcome = classifyArticleWrite(kind, record ? 'update' : 'create', result, id); setMessage(outcome.message);
    if (outcome.state === 'unknown' || outcome.state === 'conflict') setBlocked(outcome);
    if (outcome.state === 'success') { if (!record) { form.reset(); setContent(''); } onSaved?.(outcome.message); }
    setLoading(false); submitting.current = false;
  }
  if (!lookups) return <div className="rounded-lg bg-white p-6">{lookupError || 'Đang tải danh mục...'}{lookupError && <button type="button" className="btn-secondary ml-3" onClick={() => setLookupVersion((v) => v + 1)}>Thử tải lại</button>}</div>;
  const relation = lookups.relations.find((r) => r.id === record?.[config.relationId]);
  return <form onSubmit={submit} className="space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
    <h3 className="text-xl font-black">{record ? 'Cập nhật' : 'Thêm'} {config.label}{record ? `: ${record.id}` : ''}</h3>
    <label className="block">Tiêu đề<input className="form-field w-full" name="title" maxLength={200} defaultValue={String(record?.title || '')} required /></label>
    {record && <label className="block">Slug<input className="form-field w-full" name="slug" maxLength={250} defaultValue={String(record.slug || '')} required /></label>}
    <label className="block">Mô tả<textarea className="form-field min-h-28 w-full" name="description" maxLength={5000} defaultValue={String(record?.description || '')} required /></label>
    <label className="block">{kind === 'posts' ? 'Danh mục' : 'Loại tin'}<select className="form-field w-full" name={config.relation} defaultValue={relation ? String(relation.name) : ''} required><option value="">{record && !relation ? 'Danh mục hiện tại không còn tồn tại — hãy chọn lại' : 'Chọn danh mục'}</option>{lookups.relations.map((r) => <option key={String(r.id)} value={String(r.name)}>{String(r.name)}</option>)}</select></label>
    {kind === 'news' && <label className="block">Tag (giữ Ctrl/Cmd để chọn nhiều hoặc bỏ chọn)<select className="form-field min-h-24 w-full" name="tag" multiple defaultValue={articleTags(record?.tag)}>{lookups.tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>}
    <div>Nội dung<TinyMceEditor value={content} onChange={setContent} uploadPath={config.upload} /></div>
    {record?.avatar && <p><a className="text-sky-700 underline" href={String(record.avatar)} target="_blank" rel="noreferrer">Xem ảnh đại diện hiện tại</a></p>}
    <label className="block">{record ? 'Ảnh đại diện mới (bỏ trống để giữ ảnh)' : 'Ảnh đại diện'} — tối đa 5 MB<input className="form-field w-full" name="file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" required={!record} /></label>
    <button className="btn-primary" disabled={loading || !!blocked}>{loading ? 'Đang lưu...' : record ? 'Lưu thay đổi' : 'Tạo mới'}</button>
    {message && <p role="status" className="rounded-lg bg-sky-50 p-4">{message}</p>}
    {blocked && <WriteReview key={`${blocked.state}-${blocked.id || ''}`} kind={kind} outcome={blocked} page={page} onReviewed={() => { setBlocked(null); setMessage('Bản nháp vẫn được giữ. Bạn có thể chỉnh sửa rồi gửi thủ công nếu cần.'); }} />}
  </form>;
}
