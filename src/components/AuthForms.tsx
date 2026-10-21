'use client';

import { FormEvent, useState } from 'react';
import { apiRequest, clearTokens, getAccessToken, saveTokens } from '@/lib/api';

type Mode = 'login' | 'register' | 'forgot' | 'account';

export default function AuthForms({ mode }: { mode: Mode }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerReady, setRegisterReady] = useState(false);
  const [forgotReady, setForgotReady] = useState(false);

  async function submitJson(path: string, form: HTMLFormElement, useAuth = false) {
    setLoading(true);
    setMessage('');
    const values = Object.fromEntries(new FormData(form).entries());
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

    if (accessToken) {
      saveTokens(accessToken, refreshToken);
      window.location.href = '/admin';
    }
  }

  async function handleRegisterInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submitJson('/register', event.currentTarget);
    if (result.ok) setRegisterReady(true);
  }

  async function handleRegisterOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson('/postregister', event.currentTarget);
  }

  async function handleForgotInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submitJson('/forgotpass', event.currentTarget);
    if (result.ok) setForgotReady(true);
  }

  async function handleForgotOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson('/forgotpassword', event.currentTarget);
  }

  async function handleAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const action = new FormData(form).get('action');
    await submitJson(action === 'password' ? '/changePass' : '/putAccount', form, true);
  }

  if (mode === 'login') {
    return (
      <AuthShell title="Đăng nhập quản trị" description="Đăng nhập để quản lý bài viết, tin tức, banner và tài khoản.">
        <form onSubmit={handleLogin} className="space-y-4">
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
        {!registerReady ? (
          <form onSubmit={handleRegisterInfo} className="space-y-4">
            <input className="form-field w-full" name="username" placeholder="Tên đăng nhập" required />
            <input className="form-field w-full" name="fullname" placeholder="Họ tên" required />
            <input className="form-field w-full" name="email" type="email" placeholder="Email" required />
            <input className="form-field w-full" name="password" type="password" placeholder="Mật khẩu" required />
            <input className="form-field w-full" name="repassword" type="password" placeholder="Nhập lại mật khẩu" required />
            <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang gửi OTP...' : 'Gửi OTP'}</button>
          </form>
        ) : (
          <form onSubmit={handleRegisterOtp} className="space-y-4">
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
        {!forgotReady ? (
          <form onSubmit={handleForgotInfo} className="space-y-4">
            <input className="form-field w-full" name="email" type="email" placeholder="Email đã đăng ký" required />
            <button className="btn-primary w-full justify-center" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi OTP'}</button>
          </form>
        ) : (
          <form onSubmit={handleForgotOtp} className="space-y-4">
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
        Trạng thái token: {getAccessToken() ? 'Đã đăng nhập' : 'Chưa có token'}
      </div>
      <form onSubmit={handleAccount} className="space-y-4">
        <input type="hidden" name="action" value="profile" />
        <input className="form-field w-full" name="fullname" placeholder="Họ tên mới" required />
        <input className="form-field w-full" name="email" type="email" placeholder="Email mới" required />
        <button className="btn-primary w-full justify-center" disabled={loading}>Cập nhật hồ sơ</button>
      </form>
      <form onSubmit={handleAccount} className="mt-8 space-y-4 border-t border-slate-200 pt-8">
        <input type="hidden" name="action" value="password" />
        <input className="form-field w-full" name="password" type="password" placeholder="Mật khẩu hiện tại" required />
        <input className="form-field w-full" name="newpassword" type="password" placeholder="Mật khẩu mới" required />
        <input className="form-field w-full" name="renewpassword" type="password" placeholder="Nhập lại mật khẩu mới" required />
        <button className="btn-secondary w-full justify-center" disabled={loading}>Đổi mật khẩu</button>
      </form>
      <button className="mt-6 text-sm font-bold text-rose-600" onClick={() => { clearTokens(); window.location.href = '/login'; }}>
        Đăng xuất
      </button>
      <FormMessage message={message} />
    </AuthShell>
  );
}

function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-md rounded-lg bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <p className="section-kicker">Thanh Phúc Coder</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">{title}</h1>
        <p className="mb-8 mt-3 leading-7 text-slate-600">{description}</p>
        {children}
      </section>
    </main>
  );
}

function FormMessage({ message }: { message: string }) {
  if (!message) return null;
  return <p className="mt-4 rounded-lg bg-sky-50 p-4 text-sm font-semibold text-sky-800">{message}</p>;
}
