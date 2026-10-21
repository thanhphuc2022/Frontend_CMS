'use client';

import { FormEvent, useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function PublicContactForm() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const result = await apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone,
        services: values.services,
        content: values.content || `Khách hàng quan tâm: ${values.services || 'Website/CMS'}`,
      }),
    }, false);

    setLoading(false);
    setMessage(result.message);
    if (result.ok) form.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 text-slate-900 shadow-2xl">
      <div className="grid gap-4">
        <input className="form-field" name="name" placeholder="Họ tên" required />
        <input className="form-field" name="email" type="email" placeholder="Email" required />
        <input className="form-field" name="phone" placeholder="Số điện thoại" required />
        <select className="form-field" name="services" defaultValue="">
          <option value="" disabled>
            Dịch vụ quan tâm
          </option>
          <option>Thiết kế Website</option>
          <option>CMS tin tức</option>
          <option>SEO và nội dung</option>
        </select>
        <textarea className="form-field min-h-28" name="content" placeholder="Nhu cầu của bạn" />
        <button className="btn-primary justify-center" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi thông tin'}
        </button>
        {message && <p className="rounded-lg bg-sky-50 p-3 text-sm font-semibold text-sky-800">{message}</p>}
      </div>
    </form>
  );
}
