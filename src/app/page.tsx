import Image from 'next/image';
import heroImage from '@/webhd/HD-Agency-for-web-da-nen.png';
import missionImage from '@/webhd/hinh-trang-chu-4-1024x1151.png';
import aboutImage from '@/webhd/hinh-trang-gioi-thieu-1024x1151.png';
import webDesignImage from '@/webhd/hinh-trang-chu-2-1024x1151.png';
import marketingImage from '@/webhd/hinh-trang-chu-3-1024x1151.png';
import projectAnna from '@/webhd/2.-nhakhoaanna-1-1024x683.jpg';
import projectDtf from '@/webhd/3.-httpsdtf-1024x683.jpg';
import projectTalent from '@/webhd/4.-talentgate-1024x683.jpg';
import projectCeragem from '@/webhd/5.-ceragem-1024x683.jpg';
import articleSeo from '@/webhd/Cong-Cu-SEO-1-1-768x512.jpg';
import articleCms from '@/webhd/CMS-La-Gi-7-1024x683.jpg';
import footerBg from '@/webhd/footer-2-bg-1920x960.png';
import logoMonNgon from '@/webhd/logo-768x253.webp';
import logoThanhTam from '@/webhd/logo-thanh-tam.webp';
import logoVHolding from '@/webhd/logo-v-holding.webp';
import logoGocons from '@/webhd/logo-gocons.png';
import logoBidrico from '@/webhd/logo-bidridco.webp';
import logoBreaktalk from '@/webhd/logo-breaktalk.webp';
import PublicContactForm from '@/components/PublicContactForm';
import { API_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

type CmsItem = {
  id?: string;
  title: string;
  slug?: string;
  description?: string;
  avatar?: string;
  date?: string;
  views?: number;
  username?: string;
};

type Banner = {
  id?: string;
  title: string;
  content?: string;
  linkservices?: string;
  images?: string;
};

type PaginatedResponse = {
  data?: CmsItem[];
};

async function getApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function plainText(value?: string) {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(value?: string) {
  if (!value) return 'Mới cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

const fallbackServices: CmsItem[] = [
  {
    id: 'thiet-ke-website',
    title: 'Thiết kế Website doanh nghiệp',
    slug: 'thiet-ke-website',
    description: 'Xây dựng website giới thiệu, bán hàng và hệ thống quản trị nội dung dễ vận hành cho doanh nghiệp.',
    avatar: webDesignImage.src,
  },
  {
    id: 'giai-phap-cms',
    title: 'CMS tin tức và nội dung',
    slug: 'giai-phap-cms',
    description: 'Quản trị banner, bài viết, danh mục, hình ảnh và nội dung trang một cách nhanh chóng, rõ ràng.',
    avatar: aboutImage.src,
  },
  {
    id: 'marketing-seo',
    title: 'SEO và nội dung số',
    slug: 'marketing-seo',
    description: 'Tối ưu nền tảng nội dung, tốc độ và cấu trúc bài viết để tăng khả năng xuất hiện trên tìm kiếm.',
    avatar: marketingImage.src,
  },
];

const fallbackNews: CmsItem[] = [
  {
    id: 'cong-cu-seo',
    title: 'Top công cụ SEO hiệu quả cho doanh nghiệp',
    slug: 'cong-cu-seo',
    description: 'Gợi ý bộ công cụ theo dõi thứ hạng, phân tích nội dung và đo lường tăng trưởng website.',
    avatar: articleSeo.src,
    date: '2026-07-20',
  },
  {
    id: 'cms-la-gi',
    title: 'CMS là gì và vì sao website doanh nghiệp cần CMS?',
    slug: 'cms-la-gi',
    description: 'CMS giúp đội ngũ marketing chủ động cập nhật bài viết, banner và trang giới thiệu mà không phụ thuộc kỹ thuật.',
    avatar: articleCms.src,
    date: '2026-07-18',
  },
];

const projects = [
  { title: 'Website Nha Khoa Anna', category: 'Nha khoa', image: projectAnna.src },
  { title: 'Website DTF', category: 'Xây dựng', image: projectDtf.src },
  { title: 'Nền tảng Talent Gate', category: 'Công nghệ', image: projectTalent.src },
  { title: 'Website Ceragem', category: 'Giới thiệu', image: projectCeragem.src },
];

const clients = [logoMonNgon, logoThanhTam, logoVHolding, logoGocons, logoBidrico, logoBreaktalk];

const stats = [
  { value: '7+', label: 'Năm kinh nghiệm' },
  { value: '5000+', label: 'Dự án đã triển khai' },
  { value: '30+', label: 'Thành viên đồng hành' },
  { value: '24/7', label: 'Hỗ trợ vận hành' },
];

export default async function Home() {
  const [bannerResponse, postResponse, newsResponse] = await Promise.all([
    getApi<{ content_banner?: Banner[] }>('/allcontentbanner'),
    getApi<PaginatedResponse>('/AllPost'),
    getApi<PaginatedResponse | CmsItem[]>('/AllNews'),
  ]);

  const banner = bannerResponse?.content_banner?.[0];
  const services = postResponse?.data?.length ? postResponse.data.slice(0, 3) : fallbackServices;
  const rawNews = Array.isArray(newsResponse) ? newsResponse : newsResponse?.data;
  const news = rawNews?.length ? rawNews.slice(0, 6) : fallbackNews;
  const heroTitle = banner?.title || 'Thanh Phúc Coder - Thiết kế Website và giải pháp nội dung số';
  const heroCopy =
    plainText(banner?.content) ||
    'Xây dựng website chuyên nghiệp, quản trị bài viết linh hoạt và tối ưu trải nghiệm để doanh nghiệp phát triển bền vững trên nền tảng số.';
  const heroVisual = banner?.images || heroImage.src;

  return (
    <main className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-[#eef8ff]">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-white" />
        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <div className="relative z-10 space-y-7">
            <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-sky-700 shadow-sm ring-1 ring-sky-100">
              Thanh Phúc Coder
            </p>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">{heroTitle}</h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-650">{heroCopy}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a className="btn-primary" href="#dich-vu">
                Khám phá dịch vụ
              </a>
              <a className="btn-secondary" href="#tin-tuc">
                Xem bài viết
              </a>
            </div>
          </div>
          <div className="relative z-10">
            <img src={heroVisual} alt={heroTitle} className="w-full object-contain drop-shadow-2xl" />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-4xl font-black text-sky-500">{item.value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gioi-thieu" className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <Image src={missionImage} alt="Thanh Phúc Coder triển khai website" className="w-full rounded-lg object-cover" />
        <div className="space-y-6">
          <p className="section-kicker">Về Thanh Phúc Coder</p>
          <h2 className="section-title">Đồng hành cùng doanh nghiệp trong hành trình chuyển đổi số.</h2>
          <p className="text-lg leading-8 text-slate-600">
            Chúng tôi tập trung xây dựng website, nội dung số và giải pháp công nghệ dễ vận hành, giúp thương hiệu hiện diện chuyên nghiệp hơn
            và phục vụ khách hàng hiệu quả hơn mỗi ngày.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Tin tức công nghệ', 'Dịch vụ website', 'Tư vấn giải pháp', 'Hỗ trợ vận hành'].map((item) => (
              <div key={item} className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 font-bold text-slate-800">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dich-vu" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="section-kicker">Dịch vụ cốt lõi</p>
            <h2 className="section-title">Giải pháp thiết thực cho website, nội dung và tăng trưởng số.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.id || service.slug || service.title} className="content-card group">
                <img src={service.avatar || webDesignImage.src} alt={service.title} className="h-64 w-full object-cover object-top transition duration-500 group-hover:scale-105" />
                <div className="p-7">
                  <h3 className="text-xl font-black text-slate-950">{service.title}</h3>
                  <p className="mt-4 line-clamp-3 leading-7 text-slate-600">{service.description}</p>
                  <a href="#lien-he" className="mt-6 inline-flex font-bold text-sky-600">
                    Tư vấn ngay
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="du-an" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Dự án tiêu biểu</p>
            <h2 className="section-title">Bố cục showcase tương đương webhd.vn.</h2>
          </div>
          <a href="#lien-he" className="font-bold text-sky-600">
            Nhận tư vấn dự án
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <article key={project.title} className="content-card group">
              <img src={project.image} alt={project.title} className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-5">
                <p className="text-sm font-bold uppercase text-sky-500">{project.category}</p>
                <h3 className="mt-2 text-lg font-black text-slate-950">{project.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="tin-tuc" className="bg-[#08263d] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="section-kicker text-sky-300">Tin tức mới cập nhật</p>
            <h2 className="section-title text-white">Cập nhật kiến thức công nghệ, website và kinh nghiệm vận hành.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <article key={item.id || item.slug || item.title} className="overflow-hidden rounded-lg bg-white text-slate-900 shadow-sm">
                <img src={item.avatar || articleCms.src} alt={item.title} className="h-52 w-full object-cover" />
                <div className="p-6">
                  <p className="text-sm font-bold text-sky-600">{formatDate(item.date)}</p>
                  <h3 className="mt-3 text-xl font-black leading-snug text-slate-950">{item.title}</h3>
                  <p className="mt-3 line-clamp-3 leading-7 text-slate-600">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <p className="section-kicker">Đối tác và khách hàng</p>
            <h2 className="section-title">Niềm tin được xây dựng qua từng dự án và từng lần đồng hành.</h2>
            <p className="text-lg leading-8 text-slate-600">
              Mỗi website là một nền tảng kinh doanh cần được thiết kế chỉn chu, dễ quản trị và bền vững theo thời gian.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client, index) => (
              <div key={index} className="flex h-28 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <Image src={client} alt="Logo khách hàng" className="max-h-16 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="lien-he" className="relative overflow-hidden py-20 text-white">
        <Image src={footerBg} alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div className="space-y-5">
            <p className="section-kicker text-sky-300">Thanh Phúc Coder sẵn sàng hỗ trợ</p>
            <h2 className="text-3xl font-black leading-tight sm:text-5xl">Trao đổi về website hoặc hệ thống CMS của bạn</h2>
            <p className="max-w-2xl text-lg leading-8 text-slate-200">
              Để lại thông tin, đội ngũ tư vấn sẽ liên hệ và đề xuất hướng triển khai phù hợp với mục tiêu kinh doanh của bạn.
            </p>
          </div>
          <PublicContactForm />
        </div>
      </section>
    </main>
  );
}
