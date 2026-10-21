import Image from 'next/image';
import aboutImage from '@/webhd/hinh-trang-gioi-thieu-1024x1151.png';

const values = ['Lắng nghe đúng nhu cầu', 'Thiết kế dễ quản trị', 'Tối ưu tốc độ và SEO', 'Đồng hành sau bàn giao'];

export default function AboutPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <Image src={aboutImage} alt="Giới thiệu Thanh Phúc Coder" className="w-full rounded-lg object-cover" priority />
        <div className="space-y-6">
          <p className="section-kicker">Giới thiệu</p>
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">Thanh Phúc Coder xây dựng website và nền tảng nội dung cho doanh nghiệp.</h1>
          <p className="text-lg leading-8 text-slate-600">
            Thanh Phúc Coder tập trung vào website, blog công nghệ và các giải pháp nội dung số rõ ràng, hiện đại, dễ mở rộng.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {values.map((value) => (
              <div key={value} className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 font-bold text-slate-800">
                {value}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
