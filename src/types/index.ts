export type IdentityType = 'deaf' | 'hoh' | 'hearing_ally';
export type ThemePreference = 'grey' | 'black' | 'white';
export type LanguagePreference = 'asl_first' | 'english' | 'bilingual';
export type FontScale = 'normal' | 'large';

export type CommunicationPreference =
  | 'asl'
  | 'see'
  | 'text_only'
  | 'lip_reading'
  | 'written_notes'
  | 'learning_asl';

export type ComfortPreference =
  | 'one_on_one'
  | 'small_group'
  | 'big_group'
  | 'quiet_spaces';

export type AvailabilityVibe = 'weekends' | 'after_school' | 'evenings' | 'anytime';

export interface OnboardingDraft {
  step: number;
  identity?: IdentityType | null;
  communicationPreferences?: CommunicationPreference[];
  comfortPreferences?: ComfortPreference[];
  interests?: string[];
  address?: string;
  addressLat?: number | null;
  addressLng?: number | null;
  school?: string;
  radius?: number;
  showToAllies?: boolean;
  allowGroupInvites?: boolean;
  showASLLearners?: boolean;
  availability?: AvailabilityVibe[];
  preferredName?: string;
  ageRange?: string;
  perfectHangout?: string;
  communicationStyle?: string;
  lookingForFriend?: string;
  languagePreference?: LanguagePreference;
  fontScale?: FontScale;
  chatPace?: 'slow' | 'normal' | 'fast';
  captionsPreferred?: boolean;
  wouldYouRather?: Record<string, 'a' | 'b'>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  photos: string[];
  identity: IdentityType;
  communicationPreferences: CommunicationPreference[];
  comfortPreferences: ComfortPreference[];
  interests: string[];
  themePreference?: ThemePreference;
  languagePreference?: LanguagePreference;
  fontScale?: FontScale;
  chatPreferences?: {
    pace?: 'slow' | 'normal' | 'fast';
    captionsPreferred?: boolean;
    notes?: string;
  };
  /** Hex color (e.g. #0284c7) used for the app's primary accent */
  primaryColor?: string;
  bio: {
    perfectHangout?: string;
    communicationStyle?: string;
    lookingForFriend?: string;
  };
  /** Would you rather: questionId -> 'a' | 'b' */
  wouldYouRatherAnswers?: Record<string, 'a' | 'b'>;
  location: {
    city: string;
    address?: string;
    school?: string;
    lat?: number;
    lng?: number;
    radiusMiles: number;
  };
  availability: AvailabilityVibe[];
  ageRange?: string;
  /** Concrete age in years (optional; complements ageRange from onboarding). */
  age?: number;
  safetySettings: {
    showToHearingAllies: boolean;
    allowGroupInvites: boolean;
    showASLLearners: boolean;
  };
  onboardingComplete: boolean;
  createdAt: string;
}

export interface DiscoverProfile extends UserProfile {
  distance: number;
  matchScore: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Match {
  id: string;
  users: [string, string];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'icebreaker' | 'hangout_request' | 'gif' | 'assistant';
  attachments?: ChatAttachment[];
  createdAt: string;
}

export interface ChatAttachment {
  id: string;
  kind: 'video' | 'link';
  url: string;
  label?: string;
  captions?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  city: string;
  tags: string[];
  rules: string[];
  type: 'public' | 'request_to_join';
  members: string[];
  admins: string[];
  pinnedPosts: GroupPost[];
  avatar?: string;
  createdAt: string;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  tags: string[];
  communicationSupport?: string;
  organizerId: string;
  rsvps: string[];
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface BlockedUser {
  userId: string;
  blockedAt: string;
}

export const INTEREST_OPTIONS = [
  // Grouped to make the Interests picker easier to scan.
  // - Sports together (only `Sports` remains as a sports option)
  // - Reading + Writing together
  // - Volunteering + Hiking together
  'Sports',
  'Gaming', 'Robotics', 'Coding', 'Science', 'Astronomy',
  'Music', 'Art', 'Dance', 'Photography', 'Cooking', 'Movies',
  'Anime', 'Fashion', 'Theater', 'Travel', 'Pets',
  'Reading', 'Writing', 'Chess',
  'Hiking', 'Gardening', 'Volunteering',
  'Yoga', 'Exercising', 'Martial Arts', 'Nature', 'Crafts', 'Board Games'
];

export const COMMUNICATION_LABELS: Record<CommunicationPreference, string> = {
  asl: 'ASL',
  see: 'SEE',
  text_only: 'Text Only',
  lip_reading: 'Lip Reading',
  written_notes: 'Written Notes',
  learning_asl: 'Learning ASL',
};

export const COMMUNICATION_ICONS: Record<CommunicationPreference, string> = {
  asl: '🤟',
  see: '👐',
  text_only: '💬',
  lip_reading: '👄',
  written_notes: '📝',
  learning_asl: '📚',
};

export const IDENTITY_LABELS: Record<IdentityType, string> = {
  deaf: 'Deaf',
  hoh: 'Hard of Hearing',
  hearing_ally: 'Hearing Ally',
};

export const COMFORT_LABELS: Record<ComfortPreference, string> = {
  one_on_one: 'One on One',
  small_group: 'Small Group',
  big_group: 'Big Group Events',
  quiet_spaces: 'Quiet Spaces Preferred',
};

export const AVAILABILITY_LABELS: Record<AvailabilityVibe, string> = {
  weekends: 'Weekends',
  after_school: 'After school',
  evenings: 'Evenings',
  anytime: 'Anytime',
};

export const LANGUAGE_LABELS: Record<LanguagePreference, string> = {
  asl_first: 'ASL first',
  english: 'English',
  bilingual: 'Bilingual (ASL & English)',
};

/** Shown on onboarding communication step (e.g. "Text" instead of "Text Only"). */
export const COMMUNICATION_LABELS_ONBOARDING: Record<CommunicationPreference, string> = {
  ...COMMUNICATION_LABELS,
  text_only: 'Text',
};

export const ICEBREAKERS = [
  "What's your favorite way to spend a weekend?",
  "If you could learn any skill instantly, what would it be?",
  "What show are you binge-watching right now?",
  "Describe your perfect hangout spot!",
  "What's your go-to comfort food?",
  "If you could travel anywhere, where would you go?",
  "What's something that always makes you smile?",
  "Do you prefer morning or night adventures?",
  "What's a hobby you've always wanted to try?",
  "What's the best event you've ever been to?",
];

export interface WouldYouRatherQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
}

export const WOULD_YOU_RATHER_QUESTIONS: WouldYouRatherQuestion[] = [
  { id: 'wyr1', question: 'Would you rather...', optionA: 'Go to a quiet coffee shop', optionB: 'Go to a loud concert' },
  { id: 'wyr2', question: 'Would you rather...', optionA: 'Chat 1:1 with a new friend', optionB: 'Hang out with a big group' },
  { id: 'wyr3', question: 'Would you rather...', optionA: 'Plan hangouts in advance', optionB: 'Spontaneously meet up' },
  { id: 'wyr4', question: 'Would you rather...', optionA: 'Video call with captions', optionB: 'Text back and forth' },
  { id: 'wyr5', question: 'Would you rather...', optionA: 'Explore somewhere new', optionB: 'Revisit a favorite spot' },
];
