'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Ban, Flag, Lock, Phone, UserX,
  Eye, EyeOff, ChevronRight, ExternalLink
} from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SEED_PROFILES } from '@/lib/seedData';

export default function SafetyPage() {
  const router = useRouter();
  const {
    currentUser, blockedUsers, unblockUser, reports,
    updateCurrentUser, loadFromStorage, highContrastMode
  } = useStore();
  const { isWarmGradient } = useAppTheme();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) router.push('/');
  }, [currentUser, router]);

  if (!currentUser) return null;

  const getBlockedName = (userId: string) => {
    const profile = SEED_PROFILES.find((p) => p.id === userId);
    return profile?.name || 'Unknown User';
  };

  return (
    <MobileFrame>
      <div
        className={`min-h-full pb-8 ${
          highContrastMode
            ? 'bg-black text-yellow-100'
            : isWarmGradient
              ? 'bg-transparent text-[color:var(--foreground)]'
              : 'bg-[color:var(--background)] text-[color:var(--foreground)]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 pt-4 pb-4 shadow-sm ${
            highContrastMode
              ? 'bg-gray-900'
              : isWarmGradient
                ? 'bg-[color:var(--surface-header)] backdrop-blur-xl border-b border-sky-200/45 shadow-sm'
                : 'bg-[color:var(--background)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/profile')} className="p-1">
              <ArrowLeft size={22} className={highContrastMode ? 'text-yellow-400' : 'text-gray-700'} />
            </button>
            <Shield size={20} className={highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'} />
            <h1 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
              Safety Center
            </h1>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Privacy Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl ${
              highContrastMode
                ? 'bg-gray-900 border border-yellow-400/30'
                : isWarmGradient
                  ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
                  : 'bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Lock size={16} className={highContrastMode ? 'text-yellow-400' : 'text-purple-500'} />
              <h2 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Privacy Controls
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: Eye,
                  label: 'Show me to Hearing Allies',
                  value: currentUser.safetySettings.showToHearingAllies,
                  key: 'showToHearingAllies' as const,
                },
                {
                  icon: UserX,
                  label: 'Allow group invites',
                  value: currentUser.safetySettings.allowGroupInvites,
                  key: 'allowGroupInvites' as const,
                },
                {
                  icon: EyeOff,
                  label: 'Show ASL Learners',
                  value: currentUser.safetySettings.showASLLearners,
                  key: 'showASLLearners' as const,
                },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <setting.icon size={16} className={highContrastMode ? 'text-gray-400' : 'text-gray-500'} />
                    <span className={`text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                      {setting.label}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      updateCurrentUser({
                        safetySettings: {
                          ...currentUser.safetySettings,
                          [setting.key]: !setting.value,
                        },
                      });
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      setting.value
                        ? highContrastMode ? 'bg-yellow-400' : 'bg-purple-500'
                        : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      setting.value ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Blocked Users */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-2xl ${
              highContrastMode
                ? 'bg-gray-900 border border-yellow-400/30'
                : isWarmGradient
                  ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
                  : 'bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Ban size={16} className="text-red-500" />
              <h2 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Blocked Users ({blockedUsers.length})
              </h2>
            </div>

            {blockedUsers.length === 0 ? (
              <p className={`text-xs ${highContrastMode ? 'text-gray-600' : 'text-gray-400'}`}>
                No blocked users
              </p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((blocked) => (
                  <div key={blocked.userId} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Ban size={14} className="text-gray-400" />
                      </div>
                      <div>
                        <span className={`text-sm font-medium ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                          {getBlockedName(blocked.userId)}
                        </span>
                        <p className={`text-[10px] ${highContrastMode ? 'text-gray-600' : 'text-gray-400'}`}>
                          Blocked {new Date(blocked.blockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => unblockUser(blocked.userId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        highContrastMode
                          ? 'bg-gray-800 text-yellow-300 border border-yellow-400/30'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Report History */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-2xl ${
              highContrastMode
                ? 'bg-gray-900 border border-yellow-400/30'
                : isWarmGradient
                  ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
                  : 'bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Flag size={16} className={highContrastMode ? 'text-yellow-400' : 'text-orange-500'} />
              <h2 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Report History ({reports.length})
              </h2>
            </div>

            {reports.length === 0 ? (
              <p className={`text-xs ${highContrastMode ? 'text-gray-600' : 'text-gray-400'}`}>
                No reports submitted
              </p>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className={`p-3 rounded-xl ${
                    highContrastMode ? 'bg-gray-800' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                        {report.reason}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        report.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : report.status === 'reviewed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <p className={`text-[10px] mt-1 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Emergency Resources */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-4 rounded-2xl ${
              highContrastMode
                ? 'bg-red-900/30 border border-red-400/30'
                : 'bg-red-50 border border-red-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Phone size={16} className="text-red-500" />
              <h2 className={`font-bold text-sm ${highContrastMode ? 'text-red-300' : 'text-red-700'}`}>
                Emergency Resources
              </h2>
            </div>
            <div className="space-y-2">
              <a
                href="tel:911"
                className={`flex items-center justify-between p-3 rounded-xl ${
                  highContrastMode
                  ? 'bg-gray-900 hover:bg-gray-800'
                  : isWarmGradient
                    ? 'bg-white border border-slate-200 hover:bg-slate-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-medium ${highContrastMode ? 'text-yellow-100' : 'text-gray-800'}`}>
                  Emergency: 911
                </span>
                <ExternalLink size={14} className={highContrastMode ? 'text-gray-500' : 'text-gray-400'} />
              </a>
              <a
                href="https://www.nad.org"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between p-3 rounded-xl ${
                  highContrastMode
                  ? 'bg-gray-900 hover:bg-gray-800'
                  : isWarmGradient
                    ? 'bg-white border border-slate-200 hover:bg-slate-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-medium ${highContrastMode ? 'text-yellow-100' : 'text-gray-800'}`}>
                  National Association of the Deaf
                </span>
                <ExternalLink size={14} className={highContrastMode ? 'text-gray-500' : 'text-gray-400'} />
              </a>
              <a
                href="https://www.crisistextline.org"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between p-3 rounded-xl ${
                  highContrastMode
                  ? 'bg-gray-900 hover:bg-gray-800'
                  : isWarmGradient
                    ? 'bg-white border border-slate-200 hover:bg-slate-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-medium ${highContrastMode ? 'text-yellow-100' : 'text-gray-800'}`}>
                  Crisis Text Line: Text HOME to 741741
                </span>
                <ExternalLink size={14} className={highContrastMode ? 'text-gray-500' : 'text-gray-400'} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </MobileFrame>
  );
}
