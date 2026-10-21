import Link from 'next/link';
import type { CmsRecord } from '@/lib/api';
import { stripHtml } from '@/lib/server-api';

export default function RelatedArticles({
  title,
  items,
  basePath,
}: {
  title: string;
  items: CmsRecord[];
  basePath: '/posts' | '/news';
}) {
  if (!items.length) return null;

  return (
    <section className="mt-14 border-t border-slate-200 pt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="section-kicker">{title}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Có thể bạn muốn đọc tiếp</h2>
        </div>
        <Link href={basePath} className="hidden text-sm font-extrabold text-sky-600 hover:text-sky-700 sm:inline-flex">
          Xem tất cả
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((item, index) => {
          const href = `${basePath}/${item.slug || item.id}`;

          return (
            <article key={String(item.id || index)} className="content-card group">
              {item.avatar && (
                <Link href={href} className="block overflow-hidden">
                  <img src={String(item.avatar)} alt={String(item.title || '')} className="h-44 w-full object-cover transition duration-500 group-hover:scale-105" />
                </Link>
              )}
              <div className="p-5">
                <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-slate-950">
                  <Link href={href} className="transition hover:text-sky-600">
                    {String(item.title || 'Bài viết liên quan')}
                  </Link>
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{stripHtml(item.description)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
