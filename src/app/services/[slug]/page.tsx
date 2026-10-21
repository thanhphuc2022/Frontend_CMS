import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceBySlug, services } from '@/lib/serviceData';

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const service = getServiceBySlug(params.slug);

  if (!service) {
    return {};
  }

  return {
    title: `${service.title} - Thanh Phúc Coder`,
    description: service.summary,
  };
}

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = getServiceBySlug(params.slug);

  if (!service) {
    notFound();
  }

  const related = services.filter((item) => item.slug !== service.slug);

  return (
    <main className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <Image src={service.image} alt="" fill priority className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div>
            <Link href="/services" className="section-kicker text-sky-300">
              Dịch vụ / {service.title}
            </Link>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{service.summary}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">{service.detail}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#quy-trinh" className="btn-primary">Xem quy trình</a>
              <a href="/#lien-he" className="btn-secondary">Liên hệ tư vấn</a>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur">
            <p className="text-sm font-extrabold uppercase text-sky-200">Hạng mục triển khai</p>
            <div className="mt-5 grid gap-3">
              {service.bullets.map((item) => (
                <div key={item} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="quy-trinh" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="section-kicker">Quy trình triển khai</p>
          <h2 className="section-title">Các bước làm việc rõ ràng để dịch vụ đi vào thực tế.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {service.process.map((step, index) => (
            <article key={step} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black text-sky-500">Bước {String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 text-xl font-black text-slate-950">{step}</h3>
              <p className="mt-4 leading-7 text-slate-600">
                Mỗi bước được thống nhất trước khi triển khai để bạn nắm rõ tình trạng, việc cần làm và kết quả cần đạt.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <Image src={service.image} alt={service.title} className="h-[420px] w-full rounded-lg object-cover object-top" />
            <div>
              <p className="section-kicker">Vì sao nên triển khai</p>
              <h2 className="section-title">{service.title} giúp website có nền tảng tốt hơn.</h2>
              <div className="mt-8 grid gap-4">
                {service.reasons.map((reason) => (
                  <div key={reason} className="rounded-lg border border-sky-100 bg-white px-5 py-4 font-bold text-slate-800">
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="section-kicker">Dịch vụ liên quan</p>
          <h2 className="section-title">Có thể kết hợp thêm các dịch vụ khác.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {related.map((item) => (
            <Link key={item.slug} href={`/services/${item.slug}`} className="content-card grid gap-5 p-5 sm:grid-cols-[160px_1fr]">
              <Image src={item.image} alt={item.title} className="h-36 w-full rounded-lg object-cover object-top" />
              <div>
                <p className="section-kicker">{item.eyebrow}</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{item.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#08263d] py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="section-kicker text-sky-300">Cần tư vấn {service.title.toLowerCase()}?</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Thanh Phúc Coder sẵn sàng hỗ trợ bạn triển khai đúng hướng.</h2>
          </div>
          <Link href="/#lien-he" className="btn-primary w-max">
            Liên hệ ngay
          </Link>
        </div>
      </section>
    </main>
  );
}
