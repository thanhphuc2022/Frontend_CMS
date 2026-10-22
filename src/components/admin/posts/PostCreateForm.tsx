'use client';
import { useEffect, useState } from 'react';
import ArticleEditor from '../articles/ArticleEditor';
export default function PostCreateForm() {
  const [returnPage, setReturnPage] = useState(1);
  useEffect(() => {
    const page = Number(new URL(window.location.href).searchParams.get('postsPage') || 1);
    if (Number.isSafeInteger(page) && page > 0) setReturnPage(page);
  }, []);
  return <div className="space-y-4"><ArticleEditor kind="posts" page={returnPage} /><a className="btn-secondary" href={`/admin?postsPage=${returnPage}`}>Quay lại Dashboard</a></div>;
}
