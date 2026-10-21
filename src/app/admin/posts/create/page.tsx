import PostCreateForm from '@/components/admin/posts/PostCreateForm';

export default function CreatePostPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="section-kicker">Bài viết</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Thêm bài viết mới</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Trang soạn riêng giúp nhập tiêu đề, mô tả, nội dung dài, danh mục và ảnh đại diện dễ hơn.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PostCreateForm />
      </section>
    </main>
  );
}
