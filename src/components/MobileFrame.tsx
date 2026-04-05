'use client';

import React from 'react';
import useStore from '@/store/useStore';

interface MobileFrameProps {
  children: React.ReactNode;
}

export default function MobileFrame({ children }: MobileFrameProps) {
  const highContrastMode = useStore((s) => s.highContrastMode);
  const themePreference = useStore((s) => s.currentUser?.themePreference ?? 'white');
  const brandLight = !highContrastMode && themePreference === 'white';

  return (
    <div
      className={`min-h-[100dvh] w-full overflow-x-hidden ${
        highContrastMode
          ? 'bg-black text-yellow-100'
          : brandLight
            ? 'bg-app-theme text-slate-900'
            : 'bg-[color:var(--background)] text-[color:var(--foreground)]'
      }`}
    >
      {children}
    </div>
  );
}
