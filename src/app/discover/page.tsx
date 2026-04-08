'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, List, LayoutGrid, Sparkles, Search } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import BottomNav from '@/components/BottomNav';
import ProfileCard from '@/components/ProfileCard';
import MatchModal from '@/components/MatchModal';
import FilterSheet from '@/components/FilterSheet';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SEED_PROFILES } from '@/lib/seedData';
import { withComputedMatchScores } from '@/lib/matchScore';
import { calculateDistanceMiles } from '@/lib/geo';
import type { DiscoverProfile, CommunicationPreference, UserProfile } from '@/types';
import { COMMUNICATION_ICONS, COMMUNICATION_LABELS, IDENTITY_LABELS } from '@/types';
import { isFirebaseConfigured } from '@/lib/firebase';
import { subscribeToPublicUserProfiles } from '@/lib/userProfiles';
import { buildGroupInviteMessage, findMatchChatId, pickProfileAwareIcebreaker } from '@/lib/matchActions';

interface FilterState {
  distanceMax: number;
  ageRange: string;
  communicationMustHave: CommunicationPreference[];
  interestsMustHave: string[];
  showASLLearners: boolean;
}

export default function DiscoverPage() {
  const router = useRouter();
  const {
    currentUser,
    loadFromStorage,
    savedProfiles,
    saveProfile,
    unsaveProfile,
    passedProfiles,
    passProfile,
    sendFriendRequest,
    highContrastMode,
    discoverProfiles,
    setDiscoverProfiles,
    groups,
  } = useStore();
  const { isWarmGradient } = useAppTheme();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchProfile, setMatchProfile] = useState<DiscoverProfile | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showFilters, setShowFilters] = useState(false);
  const [publicProfiles, setPublicProfiles] = useState<UserProfile[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    distanceMax: 25,
    ageRange: 'All',
    communicationMustHave: [],
    interestsMustHave: [],
    showASLLearners: true,
  });

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) return;
    if (!isFirebaseConfigured) {
      setPublicProfiles([]);
      return;
    }

    const unsub = subscribeToPublicUserProfiles((profiles) => {
      const mineEmail = currentUser.email.trim().toLowerCase();
      const mineId = currentUser.id;
      const visible = profiles.filter(
        (p) =>
          p.onboardingComplete &&
          p.id !== mineId &&
          p.email.trim().toLowerCase() !== mineEmail
      );
      setPublicProfiles(visible);
    });

    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (!currentUser.onboardingComplete) {
      router.push('/onboarding');
      return;
    }

    const baseLat = currentUser.location.lat;
    const baseLng = currentUser.location.lng;

    const sourceProfiles: Array<UserProfile | DiscoverProfile> =
      isFirebaseConfigured ? publicProfiles : SEED_PROFILES;

    const profilesWithDistance: DiscoverProfile[] = sourceProfiles.map((profile) => {
      if (baseLat == null || baseLng == null || profile.location.lat == null || profile.location.lng == null) {
        return {
          ...(profile as UserProfile),
          distance: (profile as DiscoverProfile).distance ?? 0,
          matchScore: (profile as DiscoverProfile).matchScore ?? 0,
        };
      }
      const newDistance = Math.round(calculateDistanceMiles(baseLat, baseLng, profile.location.lat, profile.location.lng) * 10) / 10;
      return {
        ...(profile as UserProfile),
        distance: newDistance,
        matchScore: (profile as DiscoverProfile).matchScore ?? 0,
      };
    });

    const withScores = withComputedMatchScores(currentUser, profilesWithDistance);
    withScores.sort((a, b) => b.matchScore - a.matchScore);
    setDiscoverProfiles(withScores);
  }, [currentUser, router, setDiscoverProfiles, publicProfiles]);

  const filteredProfiles = discoverProfiles.filter((p) => {
    if (passedProfiles.includes(p.id)) return false;
    if (p.distance > filters.distanceMax) return false;
    if (filters.communicationMustHave.length > 0) {
      const hasMatch = filters.communicationMustHave.some((c) =>
        p.communicationPreferences.includes(c)
      );
      if (!hasMatch) return false;
    }
    if (filters.interestsMustHave.length > 0) {
      const hasMatch = filters.interestsMustHave.some((i) => p.interests.includes(i));
      if (!hasMatch) return false;
    }
    if (!filters.showASLLearners && p.communicationPreferences.includes('learning_asl')) {
      return false;
    }
    return true;
  });

  const handleConnect = useCallback((profile: DiscoverProfile) => {
    sendFriendRequest(profile.id, profile.email);
    setMatchProfile(profile);
  }, [sendFriendRequest]);

  const handlePass = useCallback((profileId: string) => {
    passProfile(profileId);
    setCurrentIndex((i) => Math.min(i + 1, filteredProfiles.length - 1));
  }, [passProfile, filteredProfiles.length]);

  const handleSayHi = () => {
    if (matchProfile) {
      const chats = useStore.getState().chats;
      const chatId = findMatchChatId(chats, matchProfile);
      if (chatId) {
        useStore.getState().sendMessage(chatId, 'hi');
        setMatchProfile(null);
        router.push(`/chat/${chatId}`);
      }
    }
  };

  const handleIcebreaker = () => {
    if (!currentUser) return;
    if (matchProfile) {
      const chats = useStore.getState().chats;
      const chatId = findMatchChatId(chats, matchProfile);
      if (chatId) {
        const icebreaker = pickProfileAwareIcebreaker(currentUser, matchProfile);
        useStore.getState().sendMessage(chatId, icebreaker, 'icebreaker');
        setMatchProfile(null);
        router.push(`/chat/${chatId}`);
      }
    }
  };

  const handleInviteToGroup = () => {
    if (!currentUser) return;
    if (matchProfile) {
      const chats = useStore.getState().chats;
      const chatId = findMatchChatId(chats, matchProfile);
      if (chatId) {
        const inviteText = buildGroupInviteMessage(groups, currentUser);
        useStore.getState().sendMessage(chatId, inviteText);
        setMatchProfile(null);
        router.push(`/chat/${chatId}`);
      }
    }
  };

  if (!currentUser) return null;

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
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className={highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'} />
              <h1 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Discover
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/search')}
                className={`p-2 rounded-xl ${
                  highContrastMode
                    ? 'bg-gray-800 text-yellow-400'
                    : isWarmGradient
                      ? 'bg-slate-100 text-slate-700 border border-slate-200/90 shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                }`}
                aria-label="Search people"
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
                className={`p-2 rounded-xl ${
                  highContrastMode
                    ? 'bg-gray-800 text-yellow-400'
                    : isWarmGradient
                      ? 'bg-slate-100 text-slate-700 border border-slate-200/90 shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {viewMode === 'cards' ? <List size={18} /> : <LayoutGrid size={18} />}
              </button>
              <button
                onClick={() => setShowFilters(true)}
                className={`p-2 rounded-xl ${
                  highContrastMode
                    ? 'bg-gray-800 text-yellow-400'
                    : isWarmGradient
                      ? 'bg-slate-100 text-slate-700 border border-slate-200/90 shadow-sm'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>
          <p className={`text-xs ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {filteredProfiles.length} people nearby
          </p>
        </div>

        {/* Content */}
        <div className="py-4">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-20 px-6">
              <Sparkles size={48} className={`mx-auto mb-4 ${highContrastMode ? 'text-yellow-400/50' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-bold mb-2 ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                No one nearby yet
              </h3>
              <p className={`text-sm ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Try expanding your filters or check back later!
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            <AnimatePresence mode="wait">
              {filteredProfiles[currentIndex] && (
                <ProfileCard
                  key={filteredProfiles[currentIndex].id}
                  profile={filteredProfiles[currentIndex]}
                  onConnect={() => handleConnect(filteredProfiles[currentIndex])}
                  onPass={() => handlePass(filteredProfiles[currentIndex].id)}
                  onSave={() => {
                    const id = filteredProfiles[currentIndex].id;
                    savedProfiles.includes(id) ? unsaveProfile(id) : saveProfile(id);
                  }}
                  isSaved={savedProfiles.includes(filteredProfiles[currentIndex].id)}
                />
              )}
            </AnimatePresence>
          ) : (
            <div className="px-4 space-y-3">
              {filteredProfiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl flex items-center gap-4 ${
                    highContrastMode
                      ? 'bg-gray-900 border border-yellow-400/30'
                      : isWarmGradient
                        ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
                        : 'bg-[color:var(--background)] shadow-sm'
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0"
                    style={{
                      backgroundImage: 'linear-gradient(to bottom right, var(--color-primary-light), var(--color-primary))',
                    }}
                  >
                    <span className="text-sm font-bold text-white">
                      {profile.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const sharedComm = currentUser.communicationPreferences.filter((p) =>
                        profile.communicationPreferences.includes(p)
                      ).length;
                      return (
                        <div
                          className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            highContrastMode
                              ? 'bg-yellow-400/20 text-yellow-300'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {sharedComm >= 2
                            ? 'Strong communication match'
                            : sharedComm === 1
                            ? 'Some overlap'
                            : 'Different communication styles'}
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between">
                      <h3 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                        {profile.name}
                      </h3>
                      <span className={`text-xs ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {profile.distance} mi
                      </span>
                    </div>
                    <div className={`text-xs mb-1 ${highContrastMode ? 'text-yellow-300' : 'text-[color:var(--color-primary)]'}`}>
                      {IDENTITY_LABELS[profile.identity]}
                    </div>
                    <div className={`text-[11px] mb-1 truncate ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {profile.email}
                    </div>
                    <div className="flex gap-1">
                      {profile.communicationPreferences.map((p) => (
                        <span key={p} className="text-xs" title={COMMUNICATION_LABELS[p]}>
                          {COMMUNICATION_ICONS[p]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnect(profile)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold ${highContrastMode
                        ? 'bg-yellow-400 text-black'
                        : 'bg-[color:var(--color-primary)] text-white'
                      }`}
                  >
                    Connect
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Match Modal */}
        {matchProfile && (
          <MatchModal
            profile={matchProfile}
            onClose={() => setMatchProfile(null)}
            onSayHi={handleSayHi}
            onIcebreaker={handleIcebreaker}
            onInviteToGroup={handleInviteToGroup}
          />
        )}

        {/* Filter Sheet */}
        <FilterSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApply={setFilters}
        />

        <BottomNav />
      </div>
    </MobileFrame>
  );
}
