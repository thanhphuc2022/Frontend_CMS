import { notFound } from 'next/navigation';
import RelatedArticles from '@/components/RelatedArticles';
import { serverGet, serverList, stripHtml } from '@/lib/server-api';
import type { CmsRecord } from '@/lib/api';

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const [item, allNews] = await Promise.all([
    serverGet<CmsRecord>(`/News/${params.slug}`),
    serverList('/AllNews'),
  ]);
  if (!item) notFound();
  const related = allNews.filter((news) => news.slug !== params.slug && news.id !== params.slug).slice(0, 5);

  return (
    <main className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <article>
          <p className="section-kicker">News</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950">{String(item.title || '')}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{stripHtml(item.description)}</p>
          {item.avatar && <img src={String(item.avatar)} alt={String(item.title || '')} className="mt-8 w-full rounded-lg object-cover" />}
          <div className="prose prose-slate mt-10 max-w-none" dangerouslySetInnerHTML={{ __html: String(item.content || '') }} />
        </article>
        <RelatedArticles title="Tin liên quan" items={related} basePath="/news" />
      </div>
    </main>
  );
}
