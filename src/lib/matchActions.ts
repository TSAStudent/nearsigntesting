import { ICEBREAKERS } from '@/types';
import type { Chat, DiscoverProfile, Group, UserProfile } from '@/types';

function randomFallbackIcebreaker() {
  return ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
}

export function findMatchChatId(chats: Chat[], profile: DiscoverProfile): string | null {
  const profileEmail = profile.email.trim().toLowerCase();
  const chat = chats.find(
    (c) => c.participants.includes(profile.id) || c.participants.includes(profileEmail)
  );
  return chat?.id ?? null;
}

export function pickProfileAwareIcebreaker(me: UserProfile, other: DiscoverProfile): string {
  const candidates: Array<{ text: string; score: number }> = [];
  const sharedInterests = me.interests.filter((interest) => other.interests.includes(interest));
  const sharedComm = me.communicationPreferences.filter((pref) =>
    other.communicationPreferences.includes(pref)
  );
  const sharedAvailability = me.availability.filter((slot) => other.availability.includes(slot));
  const sameAgeRange = Boolean(me.ageRange && other.ageRange && me.ageRange === other.ageRange);
  const sameCity =
    me.location.city.trim().toLowerCase() === other.location.city.trim().toLowerCase();

  if (sharedInterests.length > 0) {
    candidates.push({
      text: `Hey ${other.name.split(' ')[0]}! I noticed we both like ${sharedInterests[0]}. Want to talk about it?`,
      score: 10,
    });
  }

  if (sharedInterests.length > 1) {
    candidates.push({
      text: `We have a lot in common: ${sharedInterests.slice(0, 2).join(' and ')}. Which one are you most into right now?`,
      score: 11,
    });
  }

  if (sharedComm.length > 0) {
    candidates.push({
      text: `Looks like we both use ${sharedComm[0].replaceAll('_', ' ')}. What kind of conversations do you enjoy most?`,
      score: 8,
    });
  }

  if (sharedAvailability.length > 0) {
    candidates.push({
      text: `I saw we're both usually free ${sharedAvailability[0].replaceAll('_', ' ')}. Want to plan a chat sometime then?`,
      score: 7,
    });
  }

  if (sameAgeRange) {
    candidates.push({
      text: `Nice to meet you! Since we're in a similar age range, what are you into lately at school or outside of it?`,
      score: 6,
    });
  }

  if (sameCity) {
    candidates.push({
      text: `Cool that we're both in ${other.location.city}. What's your favorite local spot to hang out?`,
      score: 6,
    });
  }

  if (other.bio?.perfectHangout) {
    candidates.push({
      text: `Your perfect hangout sounds great: "${other.bio.perfectHangout}". What makes that your favorite vibe?`,
      score: 7,
    });
  }

  if (other.interests.length > 0) {
    candidates.push({
      text: `If you had to pick one favorite interest right now, would it be ${other.interests[0]} or something else?`,
      score: 5,
    });
  }

  if (candidates.length === 0) {
    return randomFallbackIcebreaker();
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].text;
}

export function buildGroupInviteMessage(groups: Group[], me: UserProfile): string {
  const myGroups = groups.filter((group) => group.members.includes(me.id));
  if (myGroups.length === 0) {
    return 'I want to invite you to one of my groups once I join one!';
  }

  const chosen = [...myGroups].sort((a, b) => b.members.length - a.members.length)[0];
  const groupLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/groups/${chosen.id}`
      : `/groups/${chosen.id}`;

  return `Join my group "${chosen.name}" (${chosen.members.length} members): ${groupLink}`;
}
