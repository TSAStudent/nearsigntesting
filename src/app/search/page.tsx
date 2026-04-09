'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Search as SearchIcon, X, UserPlus } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import BottomNav from '@/components/BottomNav';
import MatchModal from '@/components/MatchModal';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SEED_PROFILES } from '@/lib/seedData';
import { withComputedMatchScores } from '@/lib/matchScore';
import { calculateDistanceMiles } from '@/lib/geo';
import type { DiscoverProfile } from '@/types';
import {
  COMMUNICATION_ICONS,
  COMMUNICATION_LABELS,
  IDENTITY_LABELS,
} from '@/types';
import {
  buildGroupInviteAttachment,
  buildGroupInviteMessage,
  findMatchChatId,
  getMyGroups,
  pickProfileAwareIcebreaker,
} from '@/lib/matchActions';
import { isFirebaseConfigured } from '@/lib/firebase';
import { getParticipantKey, sendDirectMessage } from '@/lib/chatSync';

function profileMatchesQuery(profile: DiscoverProfile, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    profile.name,
    profile.location.city,
    profile.location.school ?? '',
    profile.location.address ?? '',
    ...profile.interests,
    IDENTITY_LABELS[profile.identity],
    profile.bio.perfectHangout ?? '',
    profile.bio.communicationStyle ?? '',
    profile.bio.lookingForFriend ?? '',
  ]
    .join(' ')
    .toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

export default function SearchPeoplePage() {
  const router = useRouter();
  const {
    currentUser,
    loadFromStorage,
    sendFriendRequest,
    passProfile,
    highContrastMode,
    blockedUsers,
    groups,
  } = useStore();
  const { isWarmGradient } = useAppTheme();

  const [query, setQuery] = useState('');
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

  const searchableProfiles = useMemo(() => {
    if (!currentUser) return [];
    const baseLat = currentUser.location.lat;
    const baseLng = currentUser.location.lng;
    const blockedIds = new Set(blockedUsers.map((b) => b.userId));

    const withDistance = SEED_PROFILES.filter((p) => p.id !== currentUser.id && !blockedIds.has(p.id)).map(
      (profile) => {
        if (
          baseLat == null ||
          baseLng == null ||
          profile.location.lat == null ||
          profile.location.lng == null
        ) {
          return profile;
        }
        const newDistance =
          Math.round(calculateDistanceMiles(baseLat, baseLng, profile.location.lat, profile.location.lng) * 10) /
          10;
        return { ...profile, distance: newDistance };
      }
    );

    const withScores = withComputedMatchScores(currentUser, withDistance);
    withScores.sort((a, b) => b.matchScore - a.matchScore);
    return withScores;
  }, [currentUser, blockedUsers]);

  const filteredProfiles = useMemo(() => {
    const q = query.trim();
    if (!q) return searchableProfiles.slice(0, 10);
    return searchableProfiles.filter((p) => profileMatchesQuery(p, q));
  }, [searchableProfiles, query]);

  const handleConnect = useCallback(
    (profile: DiscoverProfile) => {
      sendFriendRequest(profile.id, profile.email);
      setMatchProfile(profile);
    },
    [sendFriendRequest]
  );

  const handlePass = useCallback(
    (profileId: string) => {
      passProfile(profileId);
    },
    [passProfile]
  );

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

  const handleInviteToGroup = (groupId: string) => {
    if (!currentUser) return;
    if (!matchProfile) return;
    void (async () => {
      const state = useStore.getState();
      const chatId = findMatchChatId(state.chats, matchProfile);
      if (!chatId) return;
      const chat = state.chats.find((c) => c.id === chatId);
      const selectedGroup = groups.find((g) => g.id === groupId && g.members.includes(currentUser.id));
      if (!selectedGroup) return;
      const inviteText = buildGroupInviteMessage(selectedGroup);
      const inviteAttachment = buildGroupInviteAttachment(selectedGroup);
      if (isFirebaseConfigured) {
        try {
          await sendDirectMessage(
            chatId,
            getParticipantKey(currentUser.email, currentUser.id),
            inviteText,
            'text',
            [inviteAttachment],
            chat?.participants || []
          );
        } catch {
          state.sendMessage(chatId, inviteText, 'text', [inviteAttachment]);
        }
      } else {
        state.sendMessage(chatId, inviteText, 'text', [inviteAttachment]);
      }
      setMatchProfile(null);
      router.push(`/chat/${chatId}`);
    })();
  };

  if (!currentUser) return null;

  const isSuggested = !query.trim();

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
          className={`px-4 pt-4 pb-3 shadow-sm ${
            highContrastMode
              ? 'bg-gray-900'
              : isWarmGradient
                ? 'bg-[color:var(--surface-header)] backdrop-blur-xl border-b border-sky-200/45 shadow-sm'
                : 'bg-[color:var(--background)]'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => router.push('/discover')}
              className={`p-2 rounded-xl ${
                highContrastMode
                  ? 'bg-gray-800 text-yellow-400'
                  : isWarmGradient
                    ? 'bg-slate-100 text-slate-700 border border-slate-200/90 shadow-sm'
                    : 'bg-gray-100 text-gray-600'
              }`}
              aria-label="Back to Discover"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className={`text-xl font-bold flex-1 ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
              Search people
            </h1>
          </div>

          <label className="sr-only" htmlFor="people-search">
            Search by name, city, or interests
          </label>
          <div className="relative">
            <SearchIcon
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}
              size={18}
              aria-hidden
            />
            <input
              id="people-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, city, interests…"
              autoComplete="off"
              className={`w-full rounded-2xl py-3 pl-10 pr-10 text-sm outline-none ring-2 ring-transparent focus:ring-[color:var(--color-primary)]/40 ${
                highContrastMode
                  ? 'bg-gray-800 text-yellow-100 placeholder:text-gray-500 border border-yellow-400/30'
                  : 'bg-gray-100 text-gray-900 placeholder:text-gray-400 border border-transparent'
              }`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${
                  highContrastMode ? 'text-gray-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
          <p
            className={`text-xs mt-2 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}
            aria-live="polite"
          >
            {isSuggested
              ? 'Suggested people — type to narrow results'
              : `${filteredProfiles.length} ${filteredProfiles.length === 1 ? 'person' : 'people'} found`}
          </p>
        </div>

        <div className="px-4 py-4 space-y-3">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-16 px-4">
              <SearchIcon
                size={40}
                className={`mx-auto mb-3 ${highContrastMode ? 'text-yellow-400/40' : 'text-gray-300'}`}
              />
              <p className={`font-semibold ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                No matches
              </p>
              <p className={`text-sm mt-1 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Try a different name, city, or interest.
              </p>
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl flex items-stretch gap-2 ${
                  highContrastMode
                    ? 'bg-gray-900 border border-yellow-400/30'
                    : isWarmGradient
                      ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
                      : 'bg-[color:var(--background)] shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/user/${profile.id}`)}
                  className={`flex flex-1 min-w-0 gap-3 items-center text-left rounded-xl p-1 -m-1 transition-colors ${
                    highContrastMode ? 'hover:bg-gray-800/80' : 'hover:bg-gray-50'
                  }`}
                  aria-label={`View ${profile.name}'s profile`}
                >
                  <div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-light), var(--color-primary))',
                    }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {profile.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className={`font-bold text-sm truncate ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                        {profile.name}
                      </h2>
                      <span className={`text-xs shrink-0 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {profile.distance} mi · {profile.matchScore}%
                      </span>
                    </div>
                    <div className={`text-xs ${highContrastMode ? 'text-yellow-300' : 'text-[color:var(--color-primary)]'}`}>
                      {IDENTITY_LABELS[profile.identity]} · {profile.location.city}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.interests.slice(0, 3).map((i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            highContrastMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {i}
                        </span>
                      ))}
                      {profile.interests.length > 3 ? (
                        <span className={`text-[10px] ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          +{profile.interests.length - 3}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {profile.communicationPreferences.map((p) => (
                        <span key={p} className="text-xs" title={COMMUNICATION_LABELS[p]}>
                          {COMMUNICATION_ICONS[p]}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
                <div className="flex flex-col gap-1.5 justify-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePass(profile.id);
                    }}
                    className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold ${
                      highContrastMode
                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    aria-label={`Pass ${profile.name}`}
                  >
                    <X size={14} />
                    Pass
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(profile);
                    }}
                    className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold ${
                      highContrastMode ? 'bg-yellow-400 text-black' : 'bg-[color:var(--color-primary)] text-white'
                    }`}
                    aria-label={`Connect with ${profile.name}`}
                  >
                    <UserPlus size={14} />
                    Connect
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {matchProfile && (
          <MatchModal
            profile={matchProfile}
            onClose={() => setMatchProfile(null)}
            onSayHi={handleSayHi}
            onIcebreaker={handleIcebreaker}
            inviteGroups={getMyGroups(groups, currentUser)}
            onInviteToGroup={handleInviteToGroup}
          />
        )}

        <BottomNav />
      </div>
    </MobileFrame>
  );
}
