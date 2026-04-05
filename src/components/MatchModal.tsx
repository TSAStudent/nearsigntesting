'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, Users } from 'lucide-react';
import type { DiscoverProfile } from '@/types';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';

interface MatchModalProps {
  profile: DiscoverProfile | null;
  onClose: () => void;
  onSayHi: () => void;
  onIcebreaker: () => void;
}

function Confetti() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; color: string; size: number }>>([]);

  useEffect(() => {
    const colors = ['#FD5068', '#FF655B', '#FF8E53', '#FF6B6B', '#FFA07A', '#F472B6'];
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: 720 }}
          transition={{ duration: 2.5, delay: p.delay, ease: 'easeIn' }}
          className="absolute"
          style={{ left: `${p.x}%` }}
        >
          <div
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function MatchModal({ profile, onClose, onSayHi, onIcebreaker }: MatchModalProps) {
  const highContrastMode = useStore((s) => s.highContrastMode);
  const { isWarmGradient } = useAppTheme();

  if (!profile) return null;

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <Confetti />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative mx-6 p-8 rounded-3xl shadow-2xl text-center max-w-xs w-full ${
            highContrastMode
              ? 'bg-gray-900 border-2 border-yellow-400'
              : isWarmGradient
                ? 'bg-white border border-slate-200 shadow-xl'
                : 'bg-[color:var(--background)]'
          }`}
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Sparkles
              className={`mx-auto mb-4 ${highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'}`}
              size={48}
            />
          </motion.div>

          <h2 className={`text-2xl font-extrabold mb-2 ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
            It&apos;s a Match!
          </h2>
          <p className={`text-sm mb-6 ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
            You and {profile.name} want to connect!
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <div
              className="w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center"
              style={{
                backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-light), var(--color-primary))',
              }}
            >
              <span className="text-lg font-bold text-white">You</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`text-2xl ${highContrastMode ? 'text-yellow-400' : 'text-pink-500'}`}
            >
              💜
            </motion.div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onSayHi}
              className={`w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                highContrastMode
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-[color:var(--color-primary)] text-white hover:opacity-90'
              }`}
            >
              <MessageCircle size={18} />
              Say Hi!
            </button>
            <button
              onClick={onIcebreaker}
              className={`w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                highContrastMode
                  ? 'bg-gray-800 text-yellow-300 border border-yellow-400/50 hover:bg-gray-700'
                  : 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/20'
              }`}
            >
              <Sparkles size={18} />
              Pick an Icebreaker
            </button>
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                highContrastMode
                  ? 'text-gray-500 hover:text-gray-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Users size={18} />
              Invite to a Group
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
