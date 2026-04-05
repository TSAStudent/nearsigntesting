import type { UserProfile, DiscoverProfile } from '@/types';
import { SEED_PROFILES } from '@/lib/seedData';
import { withComputedMatchScores } from '@/lib/matchScore';
import { calculateDistanceMiles } from '@/lib/geo';

/** Resolves a seed profile into a scored DiscoverProfile for the signed-in viewer. */
export function getDiscoverProfileForViewer(
  currentUser: UserProfile,
  profileId: string,
  blockedIds: Set<string>
): DiscoverProfile | null {
  if (profileId === currentUser.id || blockedIds.has(profileId)) return null;
  const raw = SEED_PROFILES.find((p) => p.id === profileId);
  if (!raw) return null;

  const baseLat = currentUser.location.lat;
  const baseLng = currentUser.location.lng;
  let withDistance: DiscoverProfile;
  if (
    baseLat == null ||
    baseLng == null ||
    raw.location.lat == null ||
    raw.location.lng == null
  ) {
    withDistance = { ...raw };
  } else {
    const newDistance =
      Math.round(calculateDistanceMiles(baseLat, baseLng, raw.location.lat, raw.location.lng) * 10) / 10;
    withDistance = { ...raw, distance: newDistance };
  }

  const [scored] = withComputedMatchScores(currentUser, [withDistance]);
  return scored ?? null;
}
