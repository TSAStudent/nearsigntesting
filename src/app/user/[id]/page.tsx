'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import BottomNav from '@/components/BottomNav';
import ProfileCard from '@/components/ProfileCard';
import MatchModal from '@/components/MatchModal';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getDiscoverProfileForViewer } from '@/lib/discoverProfiles';
import type { DiscoverProfile } from '@/types';
import { buildGroupInviteMessage, findMatchChatId, pickProfileAwareIcebreaker } from '@/lib/matchActions';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getParticipantKey, sendDirectMessage } from '@/lib/chatSync';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? '';

  const {
    currentUser,
    loadFromStorage,
    sendFriendRequest,
    passProfile,
    savedProfiles,
    saveProfile,
    unsaveProfile,
    highContrastMode,
    blockedUsers,
    groups,
  } = useStore();
  const { isWarmGradient } = useAppTheme();

  const [matchProfile, setMatchProfile] = useState<DiscoverProfile | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (!currentUser.onboardingComplete) {
      router.push('/onboarding');
    }
  }, [currentUser, router]);

  const blockedIds = useMemo(() => new Set(blockedUsers.map((b) => b.userId)), [blockedUsers]);

  const profile = useMemo(() => {
    if (!currentUser || !id) return null;
    return getDiscoverProfileForViewer(currentUser, id, blockedIds);
  }, [currentUser, id, blockedIds]);

  const handleConnect = useCallback(
    (p: DiscoverProfile) => {
      sendFriendRequest(p.id, p.email);
      setMatchProfile(p);
    },
    [sendFriendRequest]
  );

  const handlePass = useCallback(() => {
    if (!profile) return;
    passProfile(profile.id);
    router.back();
  }, [profile, passProfile, router]);

  const handleSayHi = () => {
    if (!matchProfile) return;
    void (async () => {
      const state = useStore.getState();
      const chatId = findMatchChatId(state.chats, matchProfile);
      if (!chatId) return;
      const chat = state.chats.find((c) => c.id === chatId);
      if (isFirebaseConfigured && currentUser) {
        try {
          await sendDirectMessage(
            chatId,
            getParticipantKey(currentUser.email, currentUser.id),
            'hi',
            'text',
            [],
            chat?.participants || []
          );
        } catch {
          state.sendMessage(chatId, 'hi');
        }
      } else {
        state.sendMessage(chatId, 'hi');
      }
      setMatchProfile(null);
      router.push(`/chat/${chatId}`);
    })();
  };

  const handleIcebreaker = () => {
    if (!currentUser) return;
    if (!matchProfile) return;
    void (async () => {
      const state = useStore.getState();
      const chatId = findMatchChatId(state.chats, matchProfile);
      if (!chatId) return;
      const chat = state.chats.find((c) => c.id === chatId);
      const icebreaker = pickProfileAwareIcebreaker(currentUser, matchProfile);
      if (isFirebaseConfigured) {
        try {
          await sendDirectMessage(
            chatId,
            getParticipantKey(currentUser.email, currentUser.id),
            icebreaker,
            'icebreaker',
            [],
            chat?.participants || []
          );
        } catch {
          state.sendMessage(chatId, icebreaker, 'icebreaker');
        }
      } else {
        state.sendMessage(chatId, icebreaker, 'icebreaker');
      }
      setMatchProfile(null);
      router.push(`/chat/${chatId}`);
    })();
  };

  const handleInviteToGroup = () => {
    if (!currentUser) return;
    if (!matchProfile) return;
    void (async () => {
      const state = useStore.getState();
      const chatId = findMatchChatId(state.chats, matchProfile);
      if (!chatId) return;
      const chat = state.chats.find((c) => c.id === chatId);
      const inviteText = buildGroupInviteMessage(groups, currentUser);
      if (isFirebaseConfigured) {
        try {
          await sendDirectMessage(
            chatId,
            getParticipantKey(currentUser.email, currentUser.id),
            inviteText,
            'text',
            [],
            chat?.participants || []
          );
        } catch {
          state.sendMessage(chatId, inviteText);
        }
      } else {
        state.sendMessage(chatId, inviteText);
      }
      setMatchProfile(null);
      router.push(`/chat/${chatId}`);
    })();
  };

  if (!currentUser) return null;

  if (!id || !profile) {
    return (
      <MobileFrame>
        <div
          className={`min-h-full pb-24 px-6 pt-6 ${
            highContrastMode
              ? 'bg-black text-yellow-100'
              : isWarmGradient
                ? 'bg-transparent text-[color:var(--foreground)]'
                : 'bg-[color:var(--background)] text-[color:var(--foreground)]'
          }`}
        >
          <button
            type="button"
            onClick={() => router.push('/search')}
            className={`mb-6 flex items-center gap-2 text-sm font-semibold ${
              highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'
            }`}
          >
            <ArrowLeft size={18} />
            Back to search
          </button>
          <h1 className={`text-lg font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
            Profile not found
          </h1>
          <p className={`mt-2 text-sm ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
            This person isn&apos;t available or may have been removed.
          </p>
          <BottomNav />
        </div>
      </MobileFrame>
    );
  }

  const isSaved = savedProfiles.includes(profile.id);

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
        <div
          className={`px-4 pt-4 pb-2 ${
            highContrastMode
              ? 'bg-gray-900'
              : isWarmGradient
                ? 'bg-[color:var(--surface-header)] backdrop-blur-xl border-b border-sky-200/45 shadow-sm'
                : 'bg-[color:var(--background)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className={`p-2 rounded-xl ${
                highContrastMode
                  ? 'bg-gray-800 text-yellow-400'
                  : isWarmGradient
                    ? 'bg-slate-100 text-slate-700 border border-slate-200/90 shadow-sm'
                    : 'bg-gray-100 text-gray-600'
              }`}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className={`text-lg font-bold truncate ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                {profile.name}
              </h1>
              <p className={`text-xs truncate ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Profile
              </p>
            </div>
          </div>
        </div>

        <div className="py-2">
          <ProfileCard
            profile={profile}
            onConnect={() => handleConnect(profile)}
            onPass={handlePass}
            onSave={() => (isSaved ? unsaveProfile(profile.id) : saveProfile(profile.id))}
            isSaved={isSaved}
          />
        </div>

        {matchProfile && (
          <MatchModal
            profile={matchProfile}
            onClose={() => setMatchProfile(null)}
            onSayHi={handleSayHi}
            onIcebreaker={handleIcebreaker}
            onInviteToGroup={handleInviteToGroup}
          />
        )}

        <BottomNav />
      </div>
    </MobileFrame>
  );
}
