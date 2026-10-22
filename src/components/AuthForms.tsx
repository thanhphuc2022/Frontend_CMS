'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest, clearTokens, saveTokens } from '@/lib/api';
import { useSession } from '@/lib/use-session';

type Mode = 'login' | 'register' | 'forgot' | 'account';

export default function AuthForms({ mode }: { mode: Mode }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerChallengeId, setRegisterChallengeId] = useState<string | null>(null);
  const [forgotChallengeId, setForgotChallengeId] = useState<string | null>(null);
  const [accountReview, setAccountReview] = useState(false);
  const session = useSession();

  async function submitJson(path: string, form: HTMLFormElement, useAuth = false, extraValues: Record<string, string> = {}) {
    setLoading(true);
    setMessage('');
    const values = { ...Object.fromEntries(new FormData(form).entries()), ...extraValues };
    const result = await apiRequest<Record<string, string>>(path, {
      method: 'POST',
      body: JSON.stringify(values),
    }, useAuth);
    setLoading(false);
    setMessage(result.message);
    return result;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submitJson('/login', event.currentTarget);
    const accessToken = result.data?.accesstoken;
    const refreshToken = result.data?.refreshtoken;

    if (result.ok && typeof accessToken === 'string' && accessToken) {
      clearTokens();
      saveTokens(accessToken, refreshToken);
      window.location.href = '/admin';
    }
  }

  async function handleRegisterInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterChallengeId(null);
    const result = await submitJson('/register', event.currentTarget);
    const challengeId = result.data?.challengeId;
    if (result.ok && typeof challengeId === 'string' && challengeId.trim()) {
      setRegisterChallengeId(challengeId);
    } else if (result.ok) {
      setMessage('Backend không trả về challengeId. Vui lòng kiểm tra phiên bản backend và thử lại.');
    }
  }

  async function handleRegisterOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registerChallengeId) return;
    const result = await submitJson('/postregister', event.currentTarget, false, { challengeId: registerChallengeId });
    if (result.ok) setRegisterChallengeId(null);
  }

  async function handleForgotInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotChallengeId(null);
    const result = await submitJson('/forgotpass', event.currentTarget);
    const challengeId = result.data?.challengeId;
    if (result.ok && typeof challengeId === 'string' && challengeId.trim()) {
      setForgotChallengeId(challengeId);
    } else if (result.ok) {
      setMessage('Backend không trả về challengeId. Vui lòng kiểm tra phiên bản backend và thử lại.');
    }
  }

  async function handleForgotOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!forgotChallengeId) return;
    const result = await submitJson('/forgotpassword', event.currentTarget, false, { challengeId: forgotChallengeId });
    if (result.ok) setForgotChallengeId(null);
  }

  async function handleAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accountReview || loading) return;
    const form = event.currentTarget;
    const action = new FormData(form).get('action');
    const result = await submitJson(action === 'password' ? '/changePass' : '/putAccount', form, true);
    const expected = action === 'password' ? 'Đổi mật khẩu thành công' : 'Cập nhật thành công';
    if (result.ok && result.data?.message === expected) {
      if (action === 'password') {
        clearTokens();
        setMessage('Đã đổi mật khẩu. Backend thu hồi refresh token; vui lòng đăng nhập lại.');
      }
    } else if (result.status === 0 || result.status >= 500 || result.status === 409 || result.ok) {
      setAccountReview(true);
      setMessage('Kết quả cập nhật chưa xác định. Giữ dữ liệu; đối chiếu tài khoản trước khi thử lại thủ công. Không tự gửi lại.');
    }
  }

  if (mode === 'login') {
    return (
      <AuthShell title="Đăng nhập quản trị" description="Đăng nhập để quản lý bài viết, tin tức, banner và tài khoản.">
        <form method="post" action="/login" onSubmit={handleLogin} className="space-y-4">
          <input className="form-field w-full" name="username" placeholder="Tên đăng nhập" required />
          <input className="form-field w-full" name="password" type="password" placeholder="Mật khẩu" required />
          <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
          <FormMessage message={message} />
          <div className="flex justify-between text-sm font-semibold text-slate-600">
            <a href="/register" className="hover:text-sky-600">Tạo tài khoản</a>
            <a href="/forgot-password" className="hover:text-sky-600">Quên mật khẩu</a>
          </div>
        </form>
      </AuthShell>
    );
  }

  if (mode === 'register') {
    return (
      <AuthShell title="Đăng ký tài khoản" description="Backend sẽ gửi OTP về email, sau đó nhập mã để hoàn tất đăng ký.">
        {!registerChallengeId ? (
          <form method="post" action="/register" onSubmit={handleRegisterInfo} className="space-y-4">
            <input className="form-field w-full" name="username" placeholder="Tên đăng nhập" required />
            <input className="form-field w-full" name="fullname" placeholder="Họ tên" required />
            <input className="form-field w-full" name="email" type="email" placeholder="Email" required />
            <input className="form-field w-full" name="password" type="password" placeholder="Mật khẩu" required />
            <input className="form-field w-full" name="repassword" type="password" placeholder="Nhập lại mật khẩu" required />
            <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang gửi OTP...' : 'Gửi OTP'}</button>
          </form>
        ) : (
          <form method="post" action="/register" onSubmit={handleRegisterOtp} className="space-y-4">
            <button type="button" className="text-sm font-semibold text-slate-600" disabled={loading} onClick={() => { setRegisterChallengeId(null); setMessage(''); }}>Quay lại nhập thông tin</button>
            <input className="form-field w-full" name="otp" placeholder="Mã OTP" required />
            <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang xác nhận...' : 'Hoàn tất đăng ký'}</button>
          </form>
        )}
        <FormMessage message={message} />
      </AuthShell>
    );
  }

  if (mode === 'forgot') {
    return (
      <AuthShell title="Quên mật khẩu" description="Nhập email để nhận OTP, sau đó xác nhận để lấy mật khẩu mới từ backend.">
        {!forgotChallengeId ? (
          <form method="post" action="/forgot-password" onSubmit={handleForgotInfo} className="space-y-4">
            <input className="form-field w-full" name="email" type="email" placeholder="Email đã đăng ký" required />
            <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi OTP'}</button>
          </form>
        ) : (
          <form method="post" action="/forgot-password" onSubmit={handleForgotOtp} className="space-y-4">
            <button type="button" className="text-sm font-semibold text-slate-600" disabled={loading} onClick={() => { setForgotChallengeId(null); setMessage(''); }}>Quay lại nhập thông tin</button>
            <input className="form-field w-full" name="otp" placeholder="Mã OTP" required />
            <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang xác nhận...' : 'Nhận mật khẩu mới'}</button>
          </form>
        )}
        <FormMessage message={message} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Tài khoản cá nhân" description="Cập nhật hồ sơ hoặc đổi mật khẩu cho tài khoản đang đăng nhập.">
      <div className="mb-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        {session.message}
        <button type="button" className="ml-2 underline" onClick={() => void session.check()}>Kiểm tra phiên</button>
      </div>
      <form method="post" action="/account" onSubmit={handleAccount} className="space-y-4">
        <input type="hidden" name="action" value="profile" />
        <input className="form-field w-full" name="fullname" placeholder="Họ tên mới" required />
        <input className="form-field w-full" name="email" type="email" placeholder="Email mới" required />
        <button className="btn-primary w-full justify-center" disabled={loading || accountReview}>Cập nhật hồ sơ</button>
      </form>
      <form method="post" action="/account" onSubmit={handleAccount} className="mt-8 space-y-4 border-t border-slate-200 pt-8">
        <input type="hidden" name="action" value="password" />
        <input className="form-field w-full" name="password" type="password" placeholder="Mật khẩu hiện tại" required />
        <input className="form-field w-full" name="newpassword" type="password" placeholder="Mật khẩu mới" required />
        <input className="form-field w-full" name="renewpassword" type="password" placeholder="Nhập lại mật khẩu mới" required />
        <button className="btn-secondary w-full justify-center" disabled={loading || accountReview}>Đổi mật khẩu</button>
      </form>
      {accountReview && <p className="mt-4 text-sm">Hãy nhờ Admin đối chiếu hồ sơ; nếu đã đổi mật khẩu, thử đăng nhập bằng mật khẩu mới trước khi gửi lại. <button type="button" className="underline" onClick={() => setAccountReview(false)}>Tôi đã đối chiếu và xác nhận thử lại thủ công</button></p>}
      <button className="mt-6 text-sm font-bold text-rose-600" onClick={() => { clearTokens(); window.location.href = '/login'; }}>
        Đăng xuất
      </button>
      <FormMessage message={message} />
    </AuthShell>
  );
}

function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-md rounded-lg bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <p className="section-kicker">Thanh Phúc Coder</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">{title}</h1>
        <p className="mb-8 mt-3 leading-7 text-slate-600">{description}</p>
        <noscript>Cần bật JavaScript để đăng nhập và quản lý tài khoản.</noscript>
        <fieldset disabled={!hydrated} className="min-w-0">{children}</fieldset>
      </section>
    </main>
  );
}

function FormMessage({ message }: { message: string }) {
  if (!message) return null;
  return <p className="mt-4 rounded-lg bg-sky-50 p-4 text-sm font-semibold text-sky-800">{message}</p>;
}
