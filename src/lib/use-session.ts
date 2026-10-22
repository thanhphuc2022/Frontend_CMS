'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SessionState, verifySession } from './api';

export const sessionMessages: Record<SessionState | 'checking', string> = {
  checking: 'Đang xác minh phiên...',
  absent: 'Chưa đăng nhập. Vui lòng đăng nhập để thực hiện thao tác ghi.',
  verified: 'Phiên đã được backend xác minh. Quyền từng thao tác do backend kiểm tra.',
  unavailable: 'Chưa xác minh được phiên do backend/kết nối. Token được giữ nguyên; hãy kiểm tra lại sau.',
  reauthenticate: 'Không xác minh được phiên. Hãy kiểm tra lại hoặc đăng nhập lại. Dữ liệu đã nhập và token chưa bị xóa.',
};

export function useSession() {
  const [state, setState] = useState<SessionState | 'checking'>('checking');
  const version = useRef(0);
  const invalidate = useCallback(() => { version.current++; }, []);
  const check = useCallback(async () => {
    const current = ++version.current;
    setState('checking');
    const next = await verifySession();
    if (current === version.current) setState(next);
  }, []);
  useEffect(() => {
    void check();
    const sync = () => { void check(); };
    window.addEventListener('storage', sync);
    window.addEventListener('thny-auth-change', sync);
    window.addEventListener('focus', sync);
    return () => {
      invalidate();
      window.removeEventListener('storage', sync);
      window.removeEventListener('thny-auth-change', sync);
      window.removeEventListener('focus', sync);
    };
  }, [check, invalidate]);
  return { state, check, message: sessionMessages[state] };
}
