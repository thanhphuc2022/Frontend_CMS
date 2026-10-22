'use client';

import { FormEvent, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function PublicContactForm() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const sending = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || needsReview) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = {
      contact: String(values.name || ''),
      subject: `Liên hệ: ${values.services || 'Website/CMS'}`,
      info: `${values.name || ''} | Email: ${values.email || ''} | Điện thoại: ${values.phone || ''}`,
      text: String(values.content || `Khách hàng quan tâm: ${values.services || 'Website/CMS'}`),
    };
    if (payload.contact.length > 200 || payload.subject.length > 200 || /[\r\n]/.test(payload.subject) || payload.info.length > 500 || payload.text.length > 10000) {
      setMessage('Thông tin liên hệ vượt giới hạn backend. Vui lòng rút gọn; dữ liệu đã nhập được giữ nguyên.'); return;
    }
    sending.current = true;
    setLoading(true);
    setMessage('');
    const result = await apiRequest<{ mess?: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);

    setLoading(false);
    sending.current = false;
    if (result.ok && result.data?.mess === 'da gui thanh cong') {
      setMessage('Đã gửi thông tin liên hệ.');
      form.reset();
    } else if (result.status === 0 || result.status >= 500 || result.ok) {
      setNeedsReview(true);
      setMessage('Chưa xác định email đã được gửi hay chưa. Dữ liệu được giữ nguyên. Vui lòng đối chiếu trước khi gửi lại để tránh gửi trùng.');
    } else setMessage(result.message);
  }

  return (
    <form method="post" action="/" onSubmit={handleSubmit} className="rounded-lg bg-white p-6 text-slate-900 shadow-2xl">
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
        <button className="btn-primary justify-center" disabled={loading || needsReview}>
          {loading ? 'Đang gửi...' : 'Gửi thông tin'}
        </button>
        {message && <p className="rounded-lg bg-sky-50 p-3 text-sm font-semibold text-sky-800">{message}</p>}
        {needsReview && <button type="button" className="text-sm underline" onClick={() => setNeedsReview(false)}>Tôi đã đối chiếu và xác nhận gửi lại thủ công</button>}
      </div>
    </form>
  );
}
