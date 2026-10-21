import Image from 'next/image';
import logo from '@/webhd/logo.webp';

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image src={logo} alt="Thanh Phúc Coder" className="h-12 w-auto" priority />
      <div className="hidden leading-tight sm:block">
        <p className="text-base font-black text-slate-950">Thanh Phúc Coder</p>
        <p className="text-xs font-semibold text-slate-500">Blog & Website</p>
      </div>
    </div>
  );
}
