'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CommunicationPreference } from '@/types';
import { COMMUNICATION_LABELS, INTEREST_OPTIONS } from '@/types';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';

interface FilterState {
  distanceMax: number;
  ageRange: string;
  communicationMustHave: CommunicationPreference[];
  interestsMustHave: string[];
  showASLLearners: boolean;
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

export default function FilterSheet({ isOpen, onClose, filters, onApply }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const highContrastMode = useStore((s) => s.highContrastMode);
  const { isWarmGradient } = useAppTheme();

  const toggleComm = (pref: CommunicationPreference) => {
    setLocalFilters((f) => ({
      ...f,
      communicationMustHave: f.communicationMustHave.includes(pref)
        ? f.communicationMustHave.filter((p) => p !== pref)
        : [...f.communicationMustHave, pref],
    }));
  };

  const toggleInterest = (interest: string) => {
    setLocalFilters((f) => ({
      ...f,
      interestsMustHave: f.interestsMustHave.includes(interest)
        ? f.interestsMustHave.filter((i) => i !== interest)
        : [...f.interestsMustHave, interest],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto ${
              highContrastMode
                ? 'bg-gray-900 border-t-2 border-yellow-400'
                : isWarmGradient
                  ? 'bg-white border-t border-slate-200 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.08)]'
                  : 'bg-[color:var(--background)]'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={20} className={highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'} />
                <h2 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                  Filters
                </h2>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full ${highContrastMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X size={20} className={highContrastMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>

            {/* Distance */}
            <div className="mb-6">
              <label className={`text-sm font-semibold mb-2 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Distance: {localFilters.distanceMax} miles
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={localFilters.distanceMax}
                onChange={(e) => setLocalFilters((f) => ({ ...f, distanceMax: Number(e.target.value) }))}
                className="w-full accent-[color:var(--color-primary)]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 mi</span>
                <span>50 mi</span>
              </div>
            </div>

            {/* Age/Grade range */}
            <div className="mb-6">
              <label className={`text-sm font-semibold mb-2 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Age / Grade Range
              </label>
              <div className="flex flex-wrap gap-2">
                {['13-15', '16-18', '18+', 'All'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setLocalFilters((f) => ({ ...f, ageRange: range }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      localFilters.ageRange === range
                        ? highContrastMode
                          ? 'bg-yellow-400 text-black'
                          : 'bg-[color:var(--color-primary)] text-white'
                        : highContrastMode
                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Communication Match */}
            <div className="mb-6">
              <label className={`text-sm font-semibold mb-2 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Communication (must-have)
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COMMUNICATION_LABELS) as CommunicationPreference[]).map((pref) => (
                  <button
                    key={pref}
                    onClick={() => toggleComm(pref)}
                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                      localFilters.communicationMustHave.includes(pref)
                        ? highContrastMode
                          ? 'bg-yellow-400 text-black'
                          : 'bg-[color:var(--color-primary)] text-white'
                        : highContrastMode
                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {COMMUNICATION_LABELS[pref]}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="mb-6">
              <label className={`text-sm font-semibold mb-2 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Interests (must-have)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.slice(0, 15).map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      localFilters.interestsMustHave.includes(interest)
                        ? highContrastMode
                          ? 'bg-yellow-400 text-black'
                          : 'bg-[color:var(--color-primary)] text-white'
                        : highContrastMode
                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Show ASL learners toggle */}
            <div className="mb-6 flex items-center justify-between">
              <span className={`text-sm font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Show ASL Learners
              </span>
              <button
                onClick={() => setLocalFilters((f) => ({ ...f, showASLLearners: !f.showASLLearners }))}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  localFilters.showASLLearners
                    ? highContrastMode
                      ? 'bg-yellow-400'
                      : 'bg-[color:var(--color-primary)]'
                    : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    localFilters.showASLLearners ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Apply button */}
            <button
              onClick={() => {
                onApply(localFilters);
                onClose();
              }}
              className={`w-full py-3 rounded-2xl font-bold text-lg transition-all ${
                highContrastMode
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-[color:var(--color-primary)] text-white hover:opacity-90'
              }`}
            >
              Apply Filters
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
