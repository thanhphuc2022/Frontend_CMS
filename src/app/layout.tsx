import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Thanh Phúc Coder - Blog công nghệ và thiết kế website',
  description: 'Website blog công nghệ, thiết kế website và chia sẻ kinh nghiệm lập trình.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
