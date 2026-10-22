'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, CmsRecord } from '@/lib/api';
import { ArticleKind, ArticlePage, articleConfig, classifyArticleWrite, fetchArticleDetail, fetchArticlePage, WriteOutcome } from '@/lib/articles';
import ArticleEditor from './ArticleEditor';
import WriteReview from './WriteReview';

export default function ArticleManager({ kind }: { kind: ArticleKind }) {
  const config = articleConfig[kind];
  const [data, setData] = useState<ArticlePage | null>(null), [loading, setLoading] = useState(false), [message, setMessage] = useState('');
  const [draft, setDraft] = useState<CmsRecord | 'create' | null>(null), [deleteItem, setDeleteItem] = useState<CmsRecord | null>(null), [blockedDelete, setBlockedDelete] = useState<WriteOutcome | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const page = useRef(1), loadVersion = useRef(0), detailVersion = useRef(0), writing = useRef(false);
  const load = useCallback(async (requested: number) => {
    const version = ++loadVersion.current; setLoading(true);
    try {
      const result = await fetchArticlePage(kind, requested); if (version !== loadVersion.current) return;
      page.current = result.page; setData(result);
      const url = new URL(window.location.href); url.searchParams.set(`${kind}Page`, String(result.page)); window.history.replaceState(null, '', url);
    } catch (error) { if (version === loadVersion.current) setMessage(error instanceof Error ? error.message : 'Không tải được danh sách'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, [kind]);
  useEffect(() => {
    const pendingLoads = loadVersion, pendingDetails = detailVersion;
    const raw = Number(new URL(window.location.href).searchParams.get(`${kind}Page`) || 1); void load(Number.isSafeInteger(raw) && raw > 0 ? raw : 1);
    return () => { pendingLoads.current++; pendingDetails.current++; };
  }, [kind, load]);
  async function edit(id: string) {
    if (draft && !window.confirm('Bỏ bản nháp đang mở để tải bài khác?')) return;
    const version = ++detailVersion.current; setLoading(true); setMessage('');
    try { const detail = await fetchArticleDetail(kind, id); if (version === detailVersion.current) { setDraft(detail); setEditorVersion((v) => v + 1); } }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không tải được chi tiết'); }
    finally { if (version === detailVersion.current) setLoading(false); }
  }
  async function remove() {
    if (!deleteItem || blockedDelete || writing.current) return;
    writing.current = true; setLoading(true); setMessage(''); const id = String(deleteItem.id);
    const result = await apiRequest(config.delete + encodeURIComponent(id), { method: 'POST' }, true);
    const outcome = classifyArticleWrite(kind, 'delete', result, id); setMessage(outcome.message);
    if (outcome.state === 'conflict' || outcome.state === 'unknown') setBlockedDelete(outcome);
    if (outcome.state === 'success') { setDeleteItem(null); if (draft && draft !== 'create' && draft.id === id) setDraft(null); await load(page.current); }
    setLoading(false); writing.current = false;
  }
  return <div className="space-y-5">
    <div className="rounded-lg bg-white p-6"><h2 className="text-2xl font-black">{kind === 'posts' ? 'Bài viết' : 'Tin tức'}</h2><div className="mt-4 flex gap-3">
      {kind === 'posts' ? <a className="btn-primary" href={`/admin/posts/create?postsPage=${data?.page || 1}`}>Thêm bài viết</a> : <button className="btn-primary" disabled={loading} onClick={() => { if (!draft || window.confirm('Bỏ bản nháp đang mở?')) { setDraft('create'); setEditorVersion((v) => v + 1); } }}>Thêm tin tức</button>}
      <button className="btn-secondary" disabled={loading} onClick={() => void load(page.current)}>Tải lại danh sách</button></div>{message && <p role="status" className="mt-4 rounded-lg bg-sky-50 p-4">{message}</p>}</div>
    {blockedDelete && <WriteReview kind={kind} outcome={blockedDelete} page={page.current} onReviewed={() => { setBlockedDelete(null); setDeleteItem(null); setMessage('Đã đối chiếu. Chọn lại thao tác xóa thủ công nếu vẫn cần.'); }} />}
    <div className="divide-y rounded-lg bg-white">{data?.data.map((item) => <article key={String(item.id)} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">{String(item.title)}</p><p className="text-sm">{String(item.id)} · {String(item.date || '')}</p></div><div className="flex gap-3"><button className="btn-secondary" disabled={loading} onClick={() => void edit(String(item.id))}>Sửa</button><button className="btn-secondary" disabled={loading || !!blockedDelete} onClick={() => setDeleteItem(item)}>Xóa</button></div></article>)}{data && data.data.length === 0 && <p className="p-5">Chưa có bản ghi.</p>}{loading && <p role="status" className="p-5">Đang tải...</p>}</div>
    {data && <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-3"><button className="btn-secondary" disabled={loading || data.page <= 1} onClick={() => void load(data.page - 1)}>Trang trước</button><span>Trang {data.page}/{Math.max(1, data.pages)} · {data.total} bản ghi · {data.limit}/trang</span><button className="btn-secondary" disabled={loading || data.page >= data.pages} onClick={() => void load(data.page + 1)}>Trang sau</button></nav>}
    {draft && <section className="space-y-3" aria-label="Soạn nội dung"><button type="button" className="btn-secondary" disabled={loading} onClick={() => { if (window.confirm('Đóng và bỏ bản nháp?')) setDraft(null); }}>Đóng form</button><ArticleEditor key={editorVersion} kind={kind} record={draft === 'create' ? undefined : draft} page={data?.page} onSaved={(text) => { setDraft(null); setMessage(text); void load(page.current); }} /></section>}
    {deleteItem && !blockedDelete && <div role="dialog" aria-modal="true" aria-label="Xác nhận xóa" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4"><div className="space-y-4 rounded-lg bg-white p-6"><p>Xóa {String(deleteItem.title)}?</p>{message && <p role="status">{message}</p>}<button className="btn-secondary" disabled={loading} onClick={() => setDeleteItem(null)}>Hủy</button><button className="btn-primary ml-3" disabled={loading} onClick={() => void remove()}>Xác nhận xóa</button></div></div>}
  </div>;
}
