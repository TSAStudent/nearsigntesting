'use client';

import Link from 'next/link';
import { HandMetal } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-gradient px-6">
      <div className="text-center text-slate-900 drop-shadow-sm">
        <div className="w-16 h-16 bg-white/70 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/80 mx-auto mb-6 text-sky-800 shadow-md">
          <HandMetal size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-slate-800/90 mb-8 max-w-xs">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <Link
          href="/"
          className="inline-block py-3.5 px-6 bg-white/90 text-sky-800 font-semibold rounded-2xl hover:bg-white border border-sky-200/80 transition-colors shadow-sm"
        >
          Go to NearSign
        </Link>
      </div>
    </div>
  );
}
