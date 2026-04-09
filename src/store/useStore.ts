'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import type {
  UserProfile,
  DiscoverProfile,
  Chat,
  ChatMessage,
  ChatAttachment,
  Group,
  GroupMessage,
  GroupPost,
  Event,
  Report,
  BlockedUser,
  FriendRequest,
  Match,
  OnboardingDraft,
} from '@/types';
import { ensureFirebaseAnonymousAuth, firestore, isFirebaseConfigured } from '@/lib/firebase';
import { getPublicUserProfileByOwnerId, upsertPublicUserProfile } from '@/lib/userProfiles';
import { buildDeterministicDirectChatId, ensureDirectChatForParticipants, getParticipantKey } from '@/lib/chatSync';

interface PersistedState {
  currentUser: UserProfile | null;
  onboardingDraft: OnboardingDraft | null;
  discoverProfiles: DiscoverProfile[];
  savedProfiles: string[];
  passedProfiles: string[];
  friendRequests: FriendRequest[];
  matches: Match[];
  chats: Chat[];
  chatMessages: Record<string, ChatMessage[]>;
  seenChatTimestamps: Record<string, string>;
  groups: Group[];
  groupMessages: Record<string, GroupMessage[]>;
  events: Event[];
  blockedUsers: BlockedUser[];
  reports: Report[];
  highContrastMode: boolean;
}

const DEFAULT_PERSISTED_STATE: PersistedState = {
  currentUser: null,
  onboardingDraft: null,
  discoverProfiles: [],
  savedProfiles: [],
  passedProfiles: [],
  friendRequests: [],
  matches: [],
  chats: [],
  chatMessages: {},
  seenChatTimestamps: {},
  groups: [],
  groupMessages: {},
  events: [],
  blockedUsers: [],
  reports: [],
  highContrastMode: false,
};

let activeSyncOwnerId: string | null = null;
let unsubscribeFromRemoteState: (() => void) | null = null;

const getOwnerId = (state: AppState, ownerId?: string | null): string | null => {
  const candidate = ownerId ?? state.storageOwnerId ?? state.currentUser?.email ?? null;
  if (!candidate) return null;
  return candidate.trim().toLowerCase();
};

const getPersistedState = (state: AppState): PersistedState => ({
  currentUser: state.currentUser,
  onboardingDraft: state.onboardingDraft,
  discoverProfiles: state.discoverProfiles,
  savedProfiles: state.savedProfiles,
  passedProfiles: state.passedProfiles,
  friendRequests: state.friendRequests,
  matches: state.matches,
  chats: state.chats,
  chatMessages: state.chatMessages,
  seenChatTimestamps: state.seenChatTimestamps,
  groups: state.groups,
  groupMessages: state.groupMessages,
  events: state.events,
  blockedUsers: state.blockedUsers,
  reports: state.reports,
  highContrastMode: state.highContrastMode,
});

/**
 * Firestore does not allow undefined field values anywhere in document payloads.
 * This removes undefined recursively while preserving JSON-safe data.
 */
const sanitizeForFirestore = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const parsePersistedState = (value: unknown): PersistedState => {
  const data = (value as Partial<PersistedState>) || {};
  return {
    currentUser: data.currentUser ?? DEFAULT_PERSISTED_STATE.currentUser,
    onboardingDraft: data.onboardingDraft ?? DEFAULT_PERSISTED_STATE.onboardingDraft,
    discoverProfiles: data.discoverProfiles ?? DEFAULT_PERSISTED_STATE.discoverProfiles,
    savedProfiles: data.savedProfiles ?? DEFAULT_PERSISTED_STATE.savedProfiles,
    passedProfiles: data.passedProfiles ?? DEFAULT_PERSISTED_STATE.passedProfiles,
    friendRequests: data.friendRequests ?? DEFAULT_PERSISTED_STATE.friendRequests,
    matches: data.matches ?? DEFAULT_PERSISTED_STATE.matches,
    chats: data.chats ?? DEFAULT_PERSISTED_STATE.chats,
    chatMessages: data.chatMessages ?? DEFAULT_PERSISTED_STATE.chatMessages,
    seenChatTimestamps: data.seenChatTimestamps ?? DEFAULT_PERSISTED_STATE.seenChatTimestamps,
    groups: data.groups ?? DEFAULT_PERSISTED_STATE.groups,
    groupMessages: data.groupMessages ?? DEFAULT_PERSISTED_STATE.groupMessages,
    events: data.events ?? DEFAULT_PERSISTED_STATE.events,
    blockedUsers: data.blockedUsers ?? DEFAULT_PERSISTED_STATE.blockedUsers,
    reports: data.reports ?? DEFAULT_PERSISTED_STATE.reports,
    highContrastMode: data.highContrastMode ?? DEFAULT_PERSISTED_STATE.highContrastMode,
  };
};

interface AppState {
  // Current user
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;

  onboardingDraft: OnboardingDraft | null;
  setOnboardingDraft: (draft: OnboardingDraft | null) => void;
  clearOnboardingDraft: () => void;

  // Discovery
  discoverProfiles: DiscoverProfile[];
  setDiscoverProfiles: (profiles: DiscoverProfile[]) => void;
  savedProfiles: string[];
  saveProfile: (userId: string) => void;
  unsaveProfile: (userId: string) => void;
  passedProfiles: string[];
  passProfile: (userId: string) => void;

  // Friend Requests & Matches
  friendRequests: FriendRequest[];
  sendFriendRequest: (toUserId: string, toUserEmail?: string) => string | undefined;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  matches: Match[];

  // Chats
  chats: Chat[];
  chatMessages: Record<string, ChatMessage[]>;
  seenChatTimestamps: Record<string, string>;
  sendMessage: (
    chatId: string,
    content: string,
    type?: ChatMessage['type'],
    attachments?: ChatAttachment[]
  ) => void;
  sendMessageAs: (
    chatId: string,
    senderId: string,
    content: string,
    type?: ChatMessage['type'],
    attachments?: ChatAttachment[]
  ) => void;
  updateMessageAttachment: (
    chatId: string,
    messageId: string,
    attachmentId: string,
    updates: Partial<ChatAttachment>
  ) => void;
  createChat: (participantIds: string[]) => string;
  markChatSeen: (chatId: string, seenAt?: string) => void;

  // Groups
  groups: Group[];
  groupMessages: Record<string, GroupMessage[]>;
  createGroup: (group: Omit<Group, 'id' | 'createdAt' | 'members' | 'admins' | 'pinnedPosts'>) => string;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  sendGroupMessage: (groupId: string, content: string) => void;
  addGroupPost: (groupId: string, content: string, isPinned?: boolean) => void;

  // Events
  events: Event[];
  createEvent: (event: Omit<Event, 'id' | 'createdAt' | 'rsvps' | 'organizerId'>) => string;
  rsvpEvent: (eventId: string) => void;
  unrsvpEvent: (eventId: string) => void;

  // Safety
  blockedUsers: BlockedUser[];
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  reports: Report[];
  submitReport: (reportedUserId: string, reason: string, details: string) => void;

  // UI State
  highContrastMode: boolean;
  toggleHighContrast: () => void;

  // Persistence
  storageOwnerId: string | null;
  setStorageOwner: (ownerId: string | null) => void;
  loadFromStorage: (ownerId?: string | null) => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
  // Current user
  currentUser: null,
  onboardingDraft: null,
  setCurrentUser: (user) => {
    set({ currentUser: user });
    get().saveToStorage();
    if (user?.onboardingComplete) {
      void upsertPublicUserProfile(user).catch((error) => {
        console.error('Failed to sync public profile:', error);
      });
    }
  },
  updateCurrentUser: (updates) => {
    const current = get().currentUser;
    if (current) {
      const nextUser = { ...current, ...updates };
      set({ currentUser: nextUser });
      get().saveToStorage();
      if (nextUser.onboardingComplete) {
        void upsertPublicUserProfile(nextUser).catch((error) => {
          console.error('Failed to sync public profile:', error);
        });
      }
    }
  },
  setOnboardingDraft: (draft) => {
    set({ onboardingDraft: draft });
    get().saveToStorage();
  },
  clearOnboardingDraft: () => {
    set({ onboardingDraft: null });
    get().saveToStorage();
  },

  // Discovery
  discoverProfiles: [],
  setDiscoverProfiles: (profiles) => set({ discoverProfiles: profiles }),
  savedProfiles: [],
  saveProfile: (userId) => {
    set((state) => ({ savedProfiles: [...state.savedProfiles, userId] }));
    get().saveToStorage();
  },
  unsaveProfile: (userId) => {
    set((state) => ({ savedProfiles: state.savedProfiles.filter((id) => id !== userId) }));
    get().saveToStorage();
  },
  passedProfiles: [],
  passProfile: (userId) => {
    set((state) => ({ passedProfiles: [...state.passedProfiles, userId] }));
    get().saveToStorage();
  },

  // Friend Requests & Matches
  friendRequests: [],
  sendFriendRequest: (toUserId, toUserEmail) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    const currentParticipantKey = getParticipantKey(currentUser.email, currentUser.id);
    const otherParticipantKey = getParticipantKey(toUserEmail || '', toUserId);
    const request: FriendRequest = {
      id: uuidv4(),
      fromUserId: currentUser.id,
      toUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    // Auto-accept for demo
    const match: Match = {
      id: uuidv4(),
      users: [currentUser.id, toUserId],
      createdAt: new Date().toISOString(),
    };
    const chatId = get().createChat([currentParticipantKey, otherParticipantKey]);
    if (isFirebaseConfigured) {
      void ensureDirectChatForParticipants([currentParticipantKey, otherParticipantKey]).catch((error) => {
        console.error('Failed to create direct chat:', error);
      });
    }
    set((state) => ({
      friendRequests: [...state.friendRequests, { ...request, status: 'accepted' }],
      matches: [...state.matches, match],
    }));
    get().saveToStorage();
    return chatId;
  },
  acceptFriendRequest: (requestId) => {
    set((state) => ({
      friendRequests: state.friendRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'accepted' as const } : r
      ),
    }));
    get().saveToStorage();
  },
  rejectFriendRequest: (requestId) => {
    set((state) => ({
      friendRequests: state.friendRequests.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected' as const } : r
      ),
    }));
    get().saveToStorage();
  },
  matches: [],

  // Chats
  chats: [],
  chatMessages: {},
  seenChatTimestamps: {},
  sendMessageAs: (chatId, senderId, content, type = 'text', attachments = []) => {
    const message: ChatMessage = {
      id: uuidv4(),
      chatId,
      senderId,
      content,
      type,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [chatId]: [...(state.chatMessages[chatId] || []), message],
      },
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: message } : c
      ),
    }));
    get().saveToStorage();
  },
  sendMessage: (chatId, content, type = 'text', attachments = []) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    get().sendMessageAs(chatId, currentUser.id, content, type, attachments);
  },
  updateMessageAttachment: (chatId, messageId, attachmentId, updates) => {
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [chatId]: (state.chatMessages[chatId] || []).map((msg) => {
          if (msg.id !== messageId || !msg.attachments) return msg;
          return {
            ...msg,
            attachments: msg.attachments.map((att) =>
              att.id === attachmentId ? { ...att, ...updates } : att
            ),
          };
        }),
      },
      chats: state.chats.map((c) => {
        if (c.id !== chatId || !c.lastMessage || c.lastMessage.id !== messageId) return c;
        const last = c.lastMessage;
        if (!last.attachments) return c;
        return {
          ...c,
          lastMessage: {
            ...last,
            attachments: last.attachments.map((att) =>
              att.id === attachmentId ? { ...att, ...updates } : att
            ),
          },
        };
      }),
    }));
    get().saveToStorage();
  },
  createChat: (participantIds) => {
    const normalizedParticipants = [...new Set(participantIds.map((id) => id.trim().toLowerCase()))];
    const existing = get().chats.find(
      (c) =>
        c.participants.length === normalizedParticipants.length &&
        normalizedParticipants.every((id) => c.participants.includes(id))
    );
    if (existing) return existing.id;
    const chatId = buildDeterministicDirectChatId(normalizedParticipants);
    const chat: Chat = {
      id: chatId,
      participants: normalizedParticipants,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      chats: [...state.chats, chat],
      chatMessages: { ...state.chatMessages, [chatId]: [] },
    }));
    get().saveToStorage();
    return chatId;
  },
  markChatSeen: (chatId, seenAt) => {
    set((state) => ({
      seenChatTimestamps: {
        ...state.seenChatTimestamps,
        [chatId]: seenAt || new Date().toISOString(),
      },
    }));
    get().saveToStorage();
  },

  // Groups
  groups: [],
  groupMessages: {},
  createGroup: (groupData) => {
    const currentUser = get().currentUser;
    if (!currentUser) return '';
    const groupId = uuidv4();
    const group: Group = {
      ...groupData,
      id: groupId,
      members: [currentUser.id],
      admins: [currentUser.id],
      pinnedPosts: [],
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      groups: [...state.groups, group],
      groupMessages: { ...state.groupMessages, [groupId]: [] },
    }));
    get().saveToStorage();
    return groupId;
  },
  joinGroup: (groupId) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members.includes(currentUser.id) ? g.members : [...g.members, currentUser.id],
            }
          : g
      ),
    }));
    get().saveToStorage();
  },
  leaveGroup: (groupId) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((id) => id !== currentUser.id) }
          : g
      ),
    }));
    get().saveToStorage();
  },
  sendGroupMessage: (groupId, content) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    const group = get().groups.find((g) => g.id === groupId);
    if (!group || !group.members.includes(currentUser.id)) return;
    const message: GroupMessage = {
      id: uuidv4(),
      groupId,
      senderId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: [...(state.groupMessages[groupId] || []), message],
      },
    }));
    get().saveToStorage();
  },
  addGroupPost: (groupId, content, isPinned = false) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    const post: GroupPost = {
      id: uuidv4(),
      groupId,
      authorId: currentUser.id,
      content,
      isPinned,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, pinnedPosts: isPinned ? [...g.pinnedPosts, post] : g.pinnedPosts }
          : g
      ),
    }));
    get().saveToStorage();
  },

  // Events
  events: [],
  createEvent: (eventData) => {
    const currentUser = get().currentUser;
    if (!currentUser) return '';
    const eventId = uuidv4();
    const event: Event = {
      ...eventData,
      id: eventId,
      organizerId: currentUser.id,
      rsvps: [currentUser.id],
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ events: [...state.events, event] }));
    get().saveToStorage();
    return eventId;
  },
  rsvpEvent: (eventId) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, rsvps: [...e.rsvps, currentUser.id] } : e
      ),
    }));
    get().saveToStorage();
  },
  unrsvpEvent: (eventId) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? { ...e, rsvps: e.rsvps.filter((id) => id !== currentUser.id) }
          : e
      ),
    }));
    get().saveToStorage();
  },

  // Safety
  blockedUsers: [],
  blockUser: (userId) => {
    set((state) => ({
      blockedUsers: [...state.blockedUsers, { userId, blockedAt: new Date().toISOString() }],
    }));
    get().saveToStorage();
  },
  unblockUser: (userId) => {
    set((state) => ({
      blockedUsers: state.blockedUsers.filter((b) => b.userId !== userId),
    }));
    get().saveToStorage();
  },
  reports: [],
  submitReport: (reportedUserId, reason, details) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    const report: Report = {
      id: uuidv4(),
      reporterId: currentUser.id,
      reportedUserId,
      reason,
      details,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ reports: [...state.reports, report] }));
    get().saveToStorage();
  },

  // UI State
  highContrastMode: false,
  toggleHighContrast: () => {
    set((state) => ({ highContrastMode: !state.highContrastMode }));
    get().saveToStorage();
  },

  // Persistence
  storageOwnerId: null,
  setStorageOwner: (ownerId) => {
    const normalizedOwnerId = ownerId?.trim().toLowerCase() || null;
    set({ storageOwnerId: normalizedOwnerId });

    if (!normalizedOwnerId && unsubscribeFromRemoteState) {
      unsubscribeFromRemoteState();
      unsubscribeFromRemoteState = null;
      activeSyncOwnerId = null;
    }
  },
  loadFromStorage: async (ownerId) => {
    if (typeof window === 'undefined') return;

    const state = get();
    const resolvedOwnerId = getOwnerId(state, ownerId);
    if (!resolvedOwnerId) return;

    if (!isFirebaseConfigured || !firestore) {
      console.warn('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* env vars to enable sync.');
      return;
    }

    // Attempt anonymous auth so Firestore rules with request.auth can pass.
    await ensureFirebaseAnonymousAuth();

    try {
      const stateRef = doc(firestore, 'userAppState', resolvedOwnerId);
      const snapshot = await getDoc(stateRef);
      if (snapshot.exists()) {
        const persisted = parsePersistedState(snapshot.data());
        if (persisted.currentUser?.onboardingComplete) {
          void upsertPublicUserProfile(persisted.currentUser).catch((error) => {
            console.error('Failed to sync public profile after load:', error);
          });
        }
        set({ ...persisted, storageOwnerId: resolvedOwnerId });
      } else {
        // Fallback: if app-state doc is missing but public profile exists, restore that profile
        // so returning users do not have to repeat onboarding.
        const publicProfile = await getPublicUserProfileByOwnerId(resolvedOwnerId);
        if (publicProfile?.onboardingComplete) {
          set({
            ...DEFAULT_PERSISTED_STATE,
            currentUser: publicProfile,
            onboardingDraft: null,
            storageOwnerId: resolvedOwnerId,
          });
          void get().saveToStorage();
        } else {
          localStorage.removeItem('nearsign_data');
          set({ storageOwnerId: resolvedOwnerId });
        }
      }

      if (activeSyncOwnerId !== resolvedOwnerId) {
        if (unsubscribeFromRemoteState) {
          unsubscribeFromRemoteState();
          unsubscribeFromRemoteState = null;
        }

        activeSyncOwnerId = resolvedOwnerId;
        unsubscribeFromRemoteState = onSnapshot(stateRef, (docSnapshot) => {
          if (!docSnapshot.exists()) return;
          const persisted = parsePersistedState(docSnapshot.data());
          if (persisted.currentUser?.onboardingComplete) {
            void upsertPublicUserProfile(persisted.currentUser).catch((error) => {
              console.error('Failed to sync public profile on snapshot:', error);
            });
          }
          set({ ...persisted, storageOwnerId: resolvedOwnerId });
        });
      }
    } catch (e) {
      console.error('Failed to load from Firebase:', e);
    }
  },
  saveToStorage: async () => {
    if (typeof window === 'undefined') return;

    const state = get();
    const ownerId = getOwnerId(state);
    if (!ownerId) return;
    if (!isFirebaseConfigured || !firestore) return;

    try {
      await ensureFirebaseAnonymousAuth();
      const stateRef = doc(firestore, 'userAppState', ownerId);
      const payload = sanitizeForFirestore(getPersistedState(state));
      await setDoc(stateRef, payload, { merge: true });
    } catch (e) {
      console.error('Failed to save to Firebase:', e);
    }
  },
}));

export default useStore;
