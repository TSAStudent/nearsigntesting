'use client';

import React, { useState } from 'react';
import { MapPin, Bookmark, UserPlus, X, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DiscoverProfile } from '@/types';
import {
  COMMUNICATION_ICONS,
  COMMUNICATION_LABELS,
  COMFORT_LABELS,
  AVAILABILITY_LABELS,
  LANGUAGE_LABELS,
  IDENTITY_LABELS,
  WOULD_YOU_RATHER_QUESTIONS,
} from '@/types';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ProfileCardProps {
  profile: DiscoverProfile;
  onConnect: () => void;
  onPass: () => void;
  onSave: () => void;
  isSaved: boolean;
}

export default function ProfileCard({ profile, onConnect, onPass, onSave, isSaved }: ProfileCardProps) {
  const highContrastMode = useStore((s) => s.highContrastMode);
  const { isWarmGradient } = useAppTheme();
  const currentUser = useStore((s) => s.currentUser);
  const cardSurface = highContrastMode
    ? 'bg-gray-900 border-2 border-yellow-400'
    : isWarmGradient
      ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
      : 'bg-[color:var(--background)]';
  const avatarPrimaryGradient = 'from-[color:var(--color-primary-light)] to-[color:var(--color-primary)]';
  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const [showDetails, setShowDetails] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const sharedCommCount = currentUser
    ? currentUser.communicationPreferences.filter((pref) => profile.communicationPreferences.includes(pref)).length
    : 0;
  const compatibilityLabel =
    sharedCommCount >= 2
      ? 'Strong communication match'
      : sharedCommCount === 1
      ? 'Some communication overlap'
      : 'Different communication styles';

  const handleInsightClick = async () => {
    if (!currentUser) return;
    setShowInsightModal(true);
    // If we already have an insight for this card, just show it without refetching
    if (insight) return;

    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await fetch('/api/match-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUser,
          profile,
          matchScore: profile.matchScore,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to load insight');
      }
      const data = await res.json();
      setInsight(data.insight || 'No insight available right now.');
    } catch (e) {
      setInsightError('Could not load insight. Try again.');
    } finally {
      setInsightLoading(false);
    }
  };

  const getWouldYouRatherSummary = () => {
    if (!profile.wouldYouRatherAnswers) return null;
    const answers = profile.wouldYouRatherAnswers;
    const items = WOULD_YOU_RATHER_QUESTIONS.filter((q) => answers[q.id]).map((q) => {
      const choice = answers[q.id];
      return {
        question: q.question,
        answer: choice === 'a' ? q.optionA : q.optionB,
      };
    });
    if (items.length === 0) return null;
    return items;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className={`rounded-3xl overflow-hidden shadow-lg mx-4 ${cardSurface}`}
      >
        {/* Avatar area */}
        <div
          className={`relative h-48 bg-gradient-to-br ${avatarPrimaryGradient} flex items-center justify-center`}
        >
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={handleInsightClick}
              className={`p-1.5 rounded-full border ${
                highContrastMode
                  ? 'bg-black/60 border-yellow-500/70 text-yellow-300 hover:bg-black'
                  : 'bg-white border border-slate-200 text-[color:var(--color-primary)] hover:bg-slate-50'
              }`}
              aria-label="See why this is your match"
            >
              <Info size={16} />
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                highContrastMode ? 'bg-black text-yellow-400' : 'bg-white border border-slate-200 text-gray-700'
              }`}
            >
              {Math.round(profile.matchScore)}% Match
            </span>
          </div>
          <button
            onClick={onSave}
            className={`absolute top-3 left-3 p-2 rounded-full ${
              isSaved ? 'bg-[color:var(--color-primary)] text-white' : 'bg-white border border-slate-200 text-gray-600'
            }`}
            aria-label={isSaved ? 'Unsave profile' : 'Save profile'}
          >
            <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Info */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                {profile.name}
              </h3>
              <span className={`text-sm ${highContrastMode ? 'text-yellow-300' : 'text-[color:var(--color-primary)]'} font-medium`}>
                {IDENTITY_LABELS[profile.identity]}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${
                highContrastMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <MapPin size={14} />
              <span>{profile.distance} mi</span>
            </div>
          </div>
          <div
            className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              highContrastMode
                ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40'
                : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
          >
            {compatibilityLabel}
          </div>

          {/* Communication preferences */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.communicationPreferences.map((pref) => (
              <span
                key={pref}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  highContrastMode
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                        : 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20'
                }`}
              >
                <span>{COMMUNICATION_ICONS[pref]}</span>
                {COMMUNICATION_LABELS[pref]}
              </span>
            ))}
          </div>

          {/* Interests */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {profile.interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  highContrastMode
                    ? 'bg-gray-800 text-gray-300 border border-gray-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {interest}
              </span>
            ))}
            {profile.interests.length > 4 && (
              <span className={`px-2.5 py-1 text-xs ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                +{profile.interests.length - 4} more
              </span>
            )}
          </div>

          {/* Availability */}
          <div className={`text-xs mb-4 ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Available:{' '}
            {profile.availability.length > 0
              ? profile.availability.map((a) => AVAILABILITY_LABELS[a]).join(', ')
              : 'Not specified'}
          </div>

          {/* Bio preview */}
          {profile.bio.perfectHangout && (
            <p className={`text-sm mb-4 italic ${highContrastMode ? 'text-gray-300' : 'text-gray-600'}`}>
              &ldquo;{profile.bio.perfectHangout}&rdquo;
            </p>
          )}

          {/* View full profile button */}
          <button
            onClick={() => setShowDetails(true)}
            className={`mb-4 w-full text-xs font-semibold py-2 rounded-2xl border ${
              highContrastMode
                ? 'border-yellow-400 text-yellow-300 hover:bg-gray-800'
                : 'border-[color:var(--color-primary)]/30 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10'
            }`}
          >
            View full profile & answers
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onPass}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all ${
                highContrastMode
                  ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label="Pass"
            >
              <X size={18} />
              Pass
            </button>
            <button
              onClick={onConnect}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all ${
                highContrastMode
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-[color:var(--color-primary)] text-white hover:opacity-90'
              }`}
              aria-label="Connect"
            >
              <UserPlus size={18} />
              Connect
            </button>
          </div>
        </div>

        {/* Full profile overlay */}
        {showDetails && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className={`relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-5 ${cardSurface}`}
            >
              <button
                onClick={() => setShowDetails(false)}
                className={`absolute right-4 top-4 rounded-full p-1 ${
                  highContrastMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'
                }`}
                aria-label="Close full profile"
              >
                <X size={16} />
              </button>

              <div className="mb-4">
                <h2 className={`text-lg font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                  {profile.name}
                </h2>
                <p className={`text-xs ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {IDENTITY_LABELS[profile.identity]} • {profile.distance} mi away
                </p>
                <p className={`text-xs mt-1 ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {profile.age != null ? `Age ${profile.age}` : 'Age not set'}
                  {profile.ageRange ? ` · ${profile.ageRange}` : ''}
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Communication preferences
                  </h3>
                  {profile.communicationPreferences.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.communicationPreferences.map((pref) => (
                        <span
                          key={pref}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            highContrastMode
                              ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                              : 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20'
                          }`}
                        >
                          <span>{COMMUNICATION_ICONS[pref]}</span>
                          {COMMUNICATION_LABELS[pref]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={highContrastMode ? 'text-gray-400' : 'text-gray-500'}>Not shared</p>
                  )}
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Comfort preferences
                  </h3>
                  <p className={highContrastMode ? 'text-gray-300' : 'text-gray-700'}>
                    {profile.comfortPreferences.length > 0
                      ? profile.comfortPreferences.map((c) => COMFORT_LABELS[c]).join(', ')
                      : 'Not shared'}
                  </p>
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Interests
                  </h3>
                  {profile.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.map((interest) => (
                        <span
                          key={interest}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            highContrastMode
                              ? 'bg-gray-800 text-gray-200 border border-gray-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={highContrastMode ? 'text-gray-400' : 'text-gray-500'}>Not shared</p>
                  )}
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Availability
                  </h3>
                  <p className={highContrastMode ? 'text-gray-300' : 'text-gray-700'}>
                    {profile.availability.length > 0
                      ? profile.availability.map((a) => AVAILABILITY_LABELS[a]).join(', ')
                      : 'Not shared'}
                  </p>
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Location &amp; matching
                  </h3>
                  <div className={`space-y-1 ${highContrastMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      <span className="font-semibold">School: </span>
                      {profile.location.school ?? 'Not shared'}
                    </p>
                    <p>
                      <span className="font-semibold">Preferred Match Radius: </span>
                      {profile.location.radiusMiles} mi
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Language &amp; chat preferences
                  </h3>
                  <div className={`space-y-1 ${highContrastMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p>
                      <span className="font-semibold">In-app language: </span>
                      {profile.languagePreference ? LANGUAGE_LABELS[profile.languagePreference] : 'Not shared'}
                    </p>
                    <p>
                      <span className="font-semibold">Conversation pace: </span>
                      {profile.chatPreferences?.pace
                        ? profile.chatPreferences.pace.charAt(0).toUpperCase() + profile.chatPreferences.pace.slice(1)
                        : 'Not shared'}
                    </p>
                    <p>
                      <span className="font-semibold">Prefers captions / typed follow-up: </span>
                      {profile.chatPreferences?.captionsPreferred === undefined
                        ? 'Not shared'
                        : profile.chatPreferences.captionsPreferred
                        ? 'Yes'
                        : 'No'}
                    </p>
                    {profile.chatPreferences?.notes ? (
                      <p>
                        <span className="font-semibold">Chat notes: </span>
                        {profile.chatPreferences.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Bio
                  </h3>
                  <div className="space-y-1">
                    <p className={highContrastMode ? 'text-gray-300' : 'text-gray-700'}>
                      <span className="font-semibold">Perfect hangout: </span>
                      {profile.bio.perfectHangout ?? 'Not shared'}
                    </p>
                    <p className={highContrastMode ? 'text-gray-300' : 'text-gray-700'}>
                      <span className="font-semibold">Communication style: </span>
                      {profile.bio.communicationStyle ?? 'Not shared'}
                    </p>
                    <p className={highContrastMode ? 'text-gray-300' : 'text-gray-700'}>
                      <span className="font-semibold">Looking for: </span>
                      {profile.bio.lookingForFriend ?? 'Not shared'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className={`mb-1 font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-800'}`}>
                    Would you rather answers
                  </h3>
                  <div className="space-y-2">
                    {getWouldYouRatherSummary() ? (
                      getWouldYouRatherSummary()!.map((item, idx) => (
                        <div key={idx}>
                          <p className={highContrastMode ? 'text-gray-300' : 'text-gray-800'}>
                            <span className="font-semibold">{item.question} </span>
                          </p>
                          <p className={highContrastMode ? 'text-gray-400' : 'text-gray-600'}>
                            Chose: {item.answer}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={highContrastMode ? 'text-gray-400' : 'text-gray-500'}>
                        Not shared
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Insight modal */}
      {showInsightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`relative mx-4 max-w-md w-full rounded-3xl p-6 ${cardSurface}`}
          >
            <button
              onClick={() => setShowInsightModal(false)}
              className={`absolute right-4 top-4 rounded-full p-1 ${
                highContrastMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-600'
              }`}
              aria-label="Close match insight"
            >
              <X size={16} />
            </button>

            <div className="mb-3 flex items-center gap-2">
              <Info
                size={20}
                className={highContrastMode ? 'text-yellow-300' : 'text-[color:var(--color-primary)]'}
              />
              <h2 className={`text-base font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Why this match?
              </h2>
            </div>

            <p className={`mb-4 text-xs ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
              We look at your interests, communication style, comfort and availability to explain why this match score
              looks the way it does.
            </p>

            <div
              className={`rounded-2xl px-3 py-2 text-sm ${
                highContrastMode
                  ? 'bg-gray-800 text-gray-200 border border-yellow-400/40'
                  : 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20'
              }`}
            >
              {insightLoading && 'Thinking about why this is a good (or not-so-good) match...'}
              {insightError && insightError}
              {!insightLoading && !insightError && insight && insight}
              {!insightLoading && !insightError && !insight && 'Loading insight...'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

