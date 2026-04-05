'use client';

import { useEffect } from 'react';
import useStore from '@/store/useStore';
import type { ThemePreference } from '@/types';

/** Sky primary (matches light blue brand) */
const DEFAULT_PRIMARY = '#0284c7';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace('#', '');
  if (![3, 6].includes(cleaned.length)) return null;

  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;

  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      case bn:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (0 <= hp && hp < 1) {
    r1 = c;
    g1 = x;
  } else if (1 <= hp && hp < 2) {
    r1 = x;
    g1 = c;
  } else if (2 <= hp && hp < 3) {
    g1 = c;
    b1 = x;
  } else if (3 <= hp && hp < 4) {
    g1 = x;
    b1 = c;
  } else if (4 <= hp && hp < 5) {
    r1 = x;
    b1 = c;
  } else if (5 <= hp && hp < 6) {
    r1 = c;
    b1 = x;
  }

  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function derivePrimaryVariants(primaryHex: string) {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return null;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const light = clamp01(l + 0.2);
  const dark = clamp01(l - 0.2);

  const rgbLight = hslToRgb(h, s, light);
  const rgbDark = hslToRgb(h, s, dark);

  return {
    primaryLight: rgbToHex(rgbLight.r, rgbLight.g, rgbLight.b),
    primaryDark: rgbToHex(rgbDark.r, rgbDark.g, rgbDark.b),
    primaryRgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  };
}

function applyThemeVars(theme: ThemePreference, primaryColor: string) {
  const el = document.documentElement;
  const themeVars =
    theme === 'black'
      ? { background: '#0B0B0F', foreground: '#F9FAFB' }
      : theme === 'grey'
        ? { background: '#D1D5DB', foreground: '#111827' }
        : {
            background: '#fafafa',
            foreground: '#1e293b',
          };

  el.style.setProperty('--background', themeVars.background);
  el.style.setProperty('--foreground', themeVars.foreground);

  const safePrimary = primaryColor || DEFAULT_PRIMARY;
  el.style.setProperty('--color-primary', safePrimary);

  const variants = derivePrimaryVariants(safePrimary);
  if (variants) {
    el.style.setProperty('--color-primary-light', variants.primaryLight);
    el.style.setProperty('--color-primary-dark', variants.primaryDark);
    el.style.setProperty('--color-primary-rgb', variants.primaryRgb);
  }
}

export default function ThemeApplier() {
  const { currentUser, highContrastMode, loadFromStorage } = useStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    const themePreference = currentUser?.themePreference ?? 'white';
    const primaryColor = currentUser?.primaryColor ?? DEFAULT_PRIMARY;
    const fontScale = currentUser?.fontScale === 'large' ? '1.08' : '1';

    applyThemeVars(themePreference, primaryColor);
    document.documentElement.style.setProperty('--font-scale', fontScale);

    // High-contrast mode should still override background/foreground to match intent.
    if (highContrastMode) {
      document.documentElement.style.setProperty('--background', '#000000');
      document.documentElement.style.setProperty('--foreground', '#FFFFFF');
    }
  }, [currentUser?.themePreference, currentUser?.primaryColor, highContrastMode]);

  return null;
}

