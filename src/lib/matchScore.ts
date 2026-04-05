import type { UserProfile, DiscoverProfile } from '@/types';

/**
 * Computes match score (0–100) between current user and another profile using
 * interests, communication preferences, distance, and would-you-rather answers.
 */
export function computeMatchScore(
  currentUser: UserProfile | null,
  profile: UserProfile & { distance?: number },
  distance: number
): number {
  // Fallback neutral score if we do not know the current user yet
  if (!currentUser) return 50;

  // Start from a neutral baseline and layer in all major profile dimensions
  let score = 50;

  // Shared interests (up to ~15 points)
  const sharedInterests = currentUser.interests.filter((i) => profile.interests.includes(i));
  if (currentUser.interests.length > 0 || profile.interests.length > 0) {
    const interestRatio =
      sharedInterests.length / Math.max(currentUser.interests.length || 1, profile.interests.length || 1);
    score += interestRatio * 15;
  }

  // Shared communication preferences (up to ~15 points)
  const sharedComm = currentUser.communicationPreferences.filter((c) =>
    profile.communicationPreferences.includes(c)
  );
  if (currentUser.communicationPreferences.length > 0 || profile.communicationPreferences.length > 0) {
    const commRatio =
      sharedComm.length /
      Math.max(currentUser.communicationPreferences.length || 1, profile.communicationPreferences.length || 1);
    score += commRatio * 15;
  }

  // Comfort preferences overlap (up to ~10 points)
  const sharedComfort = currentUser.comfortPreferences.filter((c) =>
    profile.comfortPreferences.includes(c)
  );
  if (currentUser.comfortPreferences.length > 0 || profile.comfortPreferences.length > 0) {
    const comfortRatio =
      sharedComfort.length /
      Math.max(currentUser.comfortPreferences.length || 1, profile.comfortPreferences.length || 1);
    score += comfortRatio * 10;
  }

  // Availability overlap (up to ~10 points)
  const sharedAvailability = currentUser.availability.filter((a) =>
    profile.availability.includes(a)
  );
  if (currentUser.availability.length > 0 || profile.availability.length > 0) {
    const availabilityRatio =
      sharedAvailability.length /
      Math.max(currentUser.availability.length || 1, profile.availability.length || 1);
    score += availabilityRatio * 10;
  }

  // Identity & safety alignment (up to ~10 points)
  if (currentUser.identity === profile.identity) {
    score += 6;
  } else if (
    (currentUser.identity === 'deaf' || currentUser.identity === 'hoh') &&
    profile.identity === 'hearing_ally' &&
    profile.safetySettings.showToHearingAllies
  ) {
    score += 4;
  } else if (
    (profile.identity === 'deaf' || profile.identity === 'hoh') &&
    currentUser.identity === 'hearing_ally' &&
    currentUser.safetySettings.showToHearingAllies
  ) {
    score += 4;
  }

  // Distance: closer = better (up to 10 points, subtract for far)
  if (distance <= 5) score += 10;
  else if (distance <= 10) score += 6;
  else if (distance <= 20) score += 2;
  else if (distance > 35) score -= 5;

  // Would-you-rather alignment (up to 10 points)
  const myWyr = currentUser.wouldYouRatherAnswers ?? {};
  const theirWyr = profile.wouldYouRatherAnswers ?? {};
  const wyrIds = Object.keys(myWyr).filter((id) => theirWyr[id] !== undefined);
  if (wyrIds.length > 0) {
    const matching = wyrIds.filter((id) => myWyr[id] === theirWyr[id]).length;
    score += (matching / wyrIds.length) * 10;
  }

  // Location radius compatibility (small influence up to ~5 points)
  const myRadius = currentUser.location.radiusMiles;
  const theirRadius = profile.location.radiusMiles;
  if (myRadius && theirRadius) {
    const radiusDiff = Math.abs(myRadius - theirRadius);
    if (radiusDiff <= 5) score += 5;
    else if (radiusDiff <= 10) score += 3;
    else if (radiusDiff <= 20) score += 1;
  }

  // Slight bonus if both have written something in their bios
  const hasBios =
    !!currentUser.bio.perfectHangout ||
    !!currentUser.bio.communicationStyle ||
    !!profile.bio.perfectHangout ||
    !!profile.bio.communicationStyle;
  if (hasBios) {
    score += 2;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Takes profiles (with distance) and current user, returns DiscoverProfile[] with recomputed matchScore.
 */
export function withComputedMatchScores(
  currentUser: UserProfile | null,
  profiles: DiscoverProfile[]
): DiscoverProfile[] {
  return profiles.map((p) => ({
    ...p,
    matchScore: computeMatchScore(currentUser, p, p.distance),
  }));
}
