import Link from 'next/link';
import { serverList, stripHtml } from '@/lib/server-api';

export default async function NewsPage() {
  const news = await serverList('/AllNews');

  return (
    <main className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <p className="section-kicker">News</p>
        <h1 className="section-title">Tin tức công nghệ</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item, index) => {
            const href = `/news/${item.slug || item.id}`;

            return (
              <article key={String(item.id || index)} className="content-card">
                {item.avatar && (
                  <Link href={href} className="block overflow-hidden">
                    <img src={String(item.avatar)} alt={String(item.title || '')} className="h-52 w-full object-cover transition duration-500 hover:scale-105" />
                  </Link>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-black text-slate-950">
                    <Link href={href} className="transition hover:text-sky-600">
                      {String(item.title || 'Chưa có tiêu đề')}
                    </Link>
                  </h2>
                  <p className="mt-3 line-clamp-3 text-slate-600">{stripHtml(item.description)}</p>
                  <Link className="mt-5 inline-flex font-bold text-sky-600" href={href}>
                    Đọc tiếp
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
