'use client';
import { useState } from 'react';
import { apiRequest, CmsRecord } from '@/lib/api';
import { ArticleKind, articleConfig, fetchArticlePage, WriteOutcome } from '@/lib/articles';

export default function WriteReview({ kind, outcome, page = 1, onReviewed }: { kind: ArticleKind; outcome: WriteOutcome; page?: number; onReviewed: () => void }) {
  const [checking, setChecking] = useState(false), [checked, setChecked] = useState(false), [comparison, setComparison] = useState('');
  async function check() {
    setChecking(true); setChecked(false);
    try {
      const list = await fetchArticlePage(kind, page);
      const summary = { total: list.total, page: list.page, items: list.data.map(({ id, title, slug }) => ({ id, title, slug })) };
      if (outcome.id) {
        const result = await apiRequest<CmsRecord>(articleConfig[kind].detail + encodeURIComponent(outcome.id), { cache: 'no-store' }, false);
        if (result.ok && result.data?.id === outcome.id && typeof result.data.content === 'string') setComparison(JSON.stringify({ list: summary, detail: result.data }, null, 2));
        else if ([404, 505].includes(result.status) && ['Resource not found', 'Bài viết không tồn tại'].includes(result.message)) setComparison('Backend hiện báo không tìm thấy bản ghi. Hãy đối chiếu thêm danh sách trước khi thử lại.');
        else throw new Error(result.message || 'Không đọc được chi tiết');
      } else setComparison(JSON.stringify(summary, null, 2));
      setChecked(true);
    } catch (error) { setComparison(error instanceof Error ? error.message : 'Không đối chiếu được'); }
    finally { setChecking(false); }
  }
  return <div className="mt-4 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4" role="alert">
    <p>{outcome.message}</p>{outcome.id && <p>Mã cần đối chiếu: {outcome.id}</p>}
    <p>Đối chiếu bản trên server với bản nháp. Chỉ thử lại nếu thao tác chưa được áp dụng; không tự gửi lại request ghi.</p>
    <a className="block text-sky-700 underline" href={`/admin?contentModule=${kind}&${kind}Page=${page}`} target="_blank" rel="noreferrer">Mở danh sách trong tab khác để đối chiếu, giữ bản nháp ở đây</a>
    <button type="button" className="btn-secondary" disabled={checking} onClick={check}>{checking ? 'Đang đối chiếu...' : 'Đọc lại để đối chiếu'}</button>
    {comparison && <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">{comparison}</pre>}
    {checked && <button type="button" className="btn-secondary" onClick={onReviewed}>Tôi đã đối chiếu, cho phép thao tác thủ công tiếp</button>}
  </div>;
}
