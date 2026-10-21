import { notFound } from 'next/navigation';
import RelatedArticles from '@/components/RelatedArticles';
import { serverGet, serverList, stripHtml } from '@/lib/server-api';
import type { CmsRecord } from '@/lib/api';

export default async function PostDetailPage({ params }: { params: { slug: string } }) {
  const [post, allPosts] = await Promise.all([
    serverGet<CmsRecord>(`/bv/${params.slug}`),
    serverList('/AllPost'),
  ]);
  if (!post) notFound();
  const related = allPosts.filter((item) => item.slug !== params.slug && item.id !== params.slug).slice(0, 5);

  return (
    <main className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <article>
          <p className="section-kicker">Post</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950">{String(post.title || '')}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{stripHtml(post.description)}</p>
          {post.avatar && <img src={String(post.avatar)} alt={String(post.title || '')} className="mt-8 w-full rounded-lg object-cover" />}
          <div className="prose prose-slate mt-10 max-w-none" dangerouslySetInnerHTML={{ __html: String(post.content || '') }} />
        </article>
        <RelatedArticles title="Bài viết khác" items={related} basePath="/posts" />
      </div>
    </main>
  );
}
