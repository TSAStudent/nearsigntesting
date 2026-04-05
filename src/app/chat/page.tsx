'use client';

import React, { useEffect } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Bot } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import BottomNav from '@/components/BottomNav';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getParticipantKey, subscribeToDirectChatsForParticipant, type RemoteDirectChat } from '@/lib/chatSync';
import { subscribeToPublicUserProfiles } from '@/lib/userProfiles';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { UserProfile } from '@/types';

export default function ChatListPage() {
  const router = useRouter();
  const { currentUser, loadFromStorage, highContrastMode, createChat } = useStore();
  const { isWarmGradient } = useAppTheme();
  const [remoteChats, setRemoteChats] = useState<RemoteDirectChat[]>([]);
  const [publicProfiles, setPublicProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) router.push('/');
  }, [currentUser, router]);

  const participantKey = useMemo(
    () => (currentUser ? getParticipantKey(currentUser.email, currentUser.id) : ''),
    [currentUser]
  );

  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      setRemoteChats([]);
      return;
    }
    return subscribeToDirectChatsForParticipant(participantKey, setRemoteChats);
  }, [currentUser, participantKey]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setPublicProfiles([]);
      return;
    }
    return subscribeToPublicUserProfiles(setPublicProfiles);
  }, []);

  if (!currentUser) return null;

  const profileLookup = new Map<string, UserProfile>();
  publicProfiles.forEach((profile) => {
    profileLookup.set(profile.id.trim().toLowerCase(), profile);
    profileLookup.set(profile.email.trim().toLowerCase(), profile);
  });

  const getParticipantName = (otherParticipant: string) => {
    if (otherParticipant === 'signy-assistant') return 'Signy';
    const profile = profileLookup.get(otherParticipant.trim().toLowerCase());
    if (profile?.name) return profile.name;
    if (otherParticipant.includes('@')) return otherParticipant.split('@')[0];
    return 'User';
  };

  const getParticipantInitials = (otherParticipant: string) => {
    const name = getParticipantName(otherParticipant);
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const openSignyChat = () => {
    const signyChatId = createChat([participantKey, 'signy-assistant']);
    router.push(`/chat/${signyChatId}`);
  };

  return (
    <MobileFrame>
      <div
        className={`min-h-full pb-24 ${
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
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className={highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'} />
            <h1 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
              Messages
            </h1>
          </div>
        </div>

        {/* Chat list */}
        <div className="px-4 py-4 space-y-2">
          <button
            onClick={openSignyChat}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all ${
              highContrastMode
                ? 'bg-gray-900 border border-yellow-400/30 hover:bg-gray-800'
                : isWarmGradient
                  ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm hover:shadow-md'
                  : 'bg-white shadow-sm hover:shadow-md'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                  Signy Assistant
                </h3>
              </div>
              <p className={`text-xs truncate ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Ask for help with chatting, safety, and planning hangouts.
              </p>
            </div>
          </button>
          {remoteChats.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles size={48} className={`mx-auto mb-4 ${highContrastMode ? 'text-yellow-400/50' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-bold mb-2 ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                No messages yet
              </h3>
              <p className={`text-sm ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Connect with someone to start chatting!
              </p>
              <button
                onClick={() => router.push('/discover')}
                className={`mt-4 px-6 py-3 rounded-2xl font-semibold ${
                  highContrastMode
                    ? 'bg-yellow-400 text-black'
                    : 'bg-purple-500 text-white'
                }`}
              >
                Discover People
              </button>
            </div>
          ) : (
            remoteChats.map((chat, index) => {
              const otherParticipant =
                chat.participants.find((id) => id !== participantKey) || 'unknown';
              return (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => router.push(`/chat/${chat.id}`)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all ${
                    highContrastMode
                      ? 'bg-gray-900 border border-yellow-400/30 hover:bg-gray-800'
                      : isWarmGradient
                        ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm hover:shadow-md'
                        : 'bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-white">
                      {getParticipantInitials(otherParticipant)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                        {getParticipantName(otherParticipant)}
                      </h3>
                      {chat.updatedAt && (
                        <span className={`text-[10px] ${highContrastMode ? 'text-gray-600' : 'text-gray-400'}`}>
                          {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {chat.lastMessagePreview || 'Start a conversation!'}
                    </p>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        <BottomNav />
      </div>
    </MobileFrame>
  );
}
