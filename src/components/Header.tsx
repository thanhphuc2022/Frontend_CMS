'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { getAccessToken } from '@/lib/api';
import { services } from '@/lib/serviceData';

const navItems = [
  { label: 'Dự án', href: '/#du-an' },
  { label: 'Bài viết', href: '/posts' },
  { label: 'Tin tức', href: '/news' },
  { label: 'Liên hệ', href: '/#lien-he' },
];

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuthState = () => setIsLoggedIn(Boolean(getAccessToken()));

    syncAuthState();
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('thny-auth-change', syncAuthState);
    window.addEventListener('focus', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('thny-auth-change', syncAuthState);
      window.removeEventListener('focus', syncAuthState);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Trang chủ Thanh Phúc Coder">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 lg:flex">
          <a href="/#gioi-thieu" className="transition hover:text-sky-600">
            Giới thiệu
          </a>
          <div className="group relative py-3">
            <a href="/services" className="inline-flex items-center gap-1 transition hover:text-sky-600">
              Dịch vụ
              <span className="text-base leading-none">⌄</span>
            </a>
            <div className="invisible absolute left-1/2 top-full z-50 w-[360px] -translate-x-1/2 rounded-lg bg-white p-5 opacity-0 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200 transition duration-200 group-hover:visible group-hover:opacity-100">
              <div className="grid gap-4">
                {services.map((service) => (
                  <Link key={service.slug} href={`/services/${service.slug}`} className="rounded-md px-3 py-2 text-base font-semibold text-slate-800 transition hover:bg-sky-50 hover:text-sky-600">
                    {service.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-sky-600">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <a href="/admin" className="hidden rounded-full px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:text-sky-600 sm:inline-flex">
              Quản trị
            </a>
          )}
          <a href="/#lien-he" className="inline-flex items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600">
            Nhận tư vấn
          </a>
        </div>
      </div>
    </header>
  );
}
