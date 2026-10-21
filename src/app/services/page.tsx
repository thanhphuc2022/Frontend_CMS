import Image from 'next/image';
import Link from 'next/link';
import heroImage from '@/webhd/HD-Agency-for-web-da-nen.png';
import { services } from '@/lib/serviceData';

const values = [
  ['Đúng nhu cầu', 'Chọn dịch vụ theo vấn đề thật của website: cần ổn định, cần khách hàng nhanh, hay cần tăng trưởng tìm kiếm dài hạn.'],
  ['Rõ quy trình', 'Mỗi dịch vụ có các bước triển khai cụ thể để bạn dễ theo dõi tiến độ và kết quả.'],
  ['Tối ưu thực tế', 'Ưu tiên hiệu quả đo được qua tốc độ, nội dung, traffic, chuyển đổi và khả năng vận hành.'],
];

export default function ServicesPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-slate-50">
        <div className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div>
            <p className="section-kicker">Dịch vụ</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Dịch vụ giúp website vận hành tốt hơn và tạo khách hàng đều hơn.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Thanh Phúc Coder tập trung vào 3 dịch vụ con quan trọng: chăm sóc website, quảng cáo Google Ads và SEO. Đây là các mảnh ghép cốt lõi để một website không chỉ đẹp, mà còn chạy ổn định, có lượt truy cập và tạo chuyển đổi.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#danh-sach-dich-vu" className="btn-primary">Xem dịch vụ</a>
              <a href="/#lien-he" className="btn-secondary">Liên hệ tư vấn</a>
            </div>
          </div>
          <Image src={heroImage} alt="Dịch vụ digital" className="w-full object-contain drop-shadow-2xl" priority />
        </div>
      </section>

      <section id="danh-sach-dich-vu" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <p className="section-kicker">Dịch vụ con</p>
          <h2 className="section-title">Ba nhóm dịch vụ chính cho website doanh nghiệp.</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <article key={service.slug} className="content-card group">
              <Link href={`/services/${service.slug}`} className="block overflow-hidden">
                <Image src={service.image} alt={service.title} className="h-60 w-full object-cover object-top transition duration-500 group-hover:scale-105" />
              </Link>
              <div className="p-6">
                <p className="section-kicker">{service.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  <Link href={`/services/${service.slug}`} className="transition hover:text-sky-600">
                    {service.title}
                  </Link>
                </h3>
                <p className="mt-4 leading-7 text-slate-600">{service.summary}</p>
                <Link href={`/services/${service.slug}`} className="mt-5 inline-flex font-bold text-sky-600">
                  Xem chi tiết
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="section-kicker">Tổng quan</p>
            <h2 className="section-title">Mỗi dịch vụ xử lý một phần quan trọng trong hành trình tăng trưởng.</h2>
          </div>
          <div className="space-y-10">
            {services.map((service, index) => (
              <article id={service.slug} key={service.slug} className="grid gap-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:grid-cols-2 lg:items-center">
                <div className={index % 2 ? 'lg:order-2' : ''}>
                  <Image src={service.image} alt={service.title} className="h-80 w-full rounded-lg object-cover object-top" />
                </div>
                <div>
                  <p className="section-kicker">{service.title}</p>
                  <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{service.summary}</h3>
                  <p className="mt-5 leading-8 text-slate-600">{service.detail}</p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 font-bold text-slate-800">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/services/${service.slug}`} className="mt-7 inline-flex font-bold text-sky-600">
                    Xem trang chi tiết
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="section-kicker">Cách chọn dịch vụ</p>
            <h2 className="section-title">Bắt đầu từ mục tiêu trước, rồi chọn giải pháp phù hợp.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {values.map(([title, description]) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#08263d] py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="section-kicker text-sky-300">Cần tư vấn dịch vụ phù hợp?</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Cùng chọn giải pháp đúng với website của bạn.</h2>
          </div>
          <Link href="/#lien-he" className="btn-primary w-max">
            Liên hệ ngay
          </Link>
        </div>
      </section>
    </main>
  );
}
