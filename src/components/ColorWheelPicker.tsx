'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = v - c;

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

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex: string) {
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

  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (delta !== 0) {
    s = max === 0 ? 0 : delta / max;
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

  return { h, s, v };
}

type Props = {
  value: string; // hex
  onChange: (hex: string) => void;
  size?: number; // css px
};

export default function ColorWheelPicker({ value, onChange, size = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hsv = useMemo(() => {
    const rgb = hexToRgb(value);
    if (!rgb) return { h: 270, s: 0.6, v: 1 };
    const res = rgbToHsv(rgb.r, rgb.g, rgb.b);
    return { h: res.h, s: res.s, v: 1 };
  }, [value]);

  const marker = useMemo(() => {
    // Saturation maps to radius.
    const angleRad = (hsv.h * Math.PI) / 180;
    const r = clamp01(hsv.s) * 0.5; // 0..0.5 of the full width
    const x = 0.5 + Math.cos(angleRad) * r;
    const y = 0.5 + Math.sin(angleRad) * r;
    return { xPct: x * 100, yPct: y * 100 };
  }, [hsv.h, hsv.s]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const pxSize = Math.floor(size * dpr);
    canvas.width = pxSize;
    canvas.height = pxSize;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const radius = pxSize / 2;
    const center = { x: radius, y: radius };

    const img = ctx.createImageData(pxSize, pxSize);
    const data = img.data;

    for (let y = 0; y < pxSize; y++) {
      for (let x = 0; x < pxSize; x++) {
        const dx = x - center.x;
        const dy = y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const idx = (y * pxSize + x) * 4;
        if (dist > radius) {
          data[idx + 3] = 0;
          continue;
        }

        const angle = Math.atan2(dy, dx); // -PI..PI
        const hue = ((angle < 0 ? angle + Math.PI * 2 : angle) * 180) / Math.PI; // 0..360
        const sat = dist / radius; // 0..1
        const rgb = hsvToRgb(hue, sat, 1);

        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }, [size]);

  const pickFromClientPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const radius = rect.width / 2;
    const center = { x: rect.width / 2, y: rect.height / 2 };

    const dx = x - center.x;
    const dy = y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius) return;

    const angle = Math.atan2(dy, dx);
    const hue = ((angle < 0 ? angle + Math.PI * 2 : angle) * 180) / Math.PI;
    const sat = dist / radius;

    const rgb = hsvToRgb(hue, clamp01(sat), 1);
    const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    onChange(nextHex);
  };

  return (
    <div className="space-y-2">
      <div
        className="relative mx-auto"
        style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={(e) => {
          setIsDragging(true);
          pickFromClientPoint(e.clientX, e.clientY);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!isDragging) return;
          pickFromClientPoint(e.clientX, e.clientY);
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
      >
        <canvas ref={canvasRef} aria-label="Primary color picker color wheel" role="application" />

        {/* Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            left: `${marker.xPct}%`,
            top: `${marker.yPct}%`,
            width: 18,
            height: 18,
            border: '2px solid rgba(255,255,255,0.95)',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.2)',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl border"
            style={{ background: value, borderColor: 'rgba(255,255,255,0.25)' }}
          />
          <div>
            <div className="text-xs font-semibold">Primary</div>
            <div className="text-[11px] text-gray-500 font-medium">{value.toUpperCase()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

