import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import type { ChatAttachment, ChatMessage } from '@/types';
import { ensureFirebaseAnonymousAuth, firestore, isFirebaseConfigured } from '@/lib/firebase';

export interface RemoteDirectChat {
  id: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
}

const DIRECT_CHATS_COLLECTION = 'directChats';

const normalizeParticipant = (value: string): string => value.trim().toLowerCase();

export function getParticipantKey(emailOrId: string, fallbackId: string): string {
  const candidate = emailOrId?.trim().toLowerCase();
  return candidate || fallbackId;
}

export function buildDeterministicDirectChatId(participants: string[]): string {
  const normalized = [...new Set(participants.map(normalizeParticipant))].sort();
  const seed = normalized.join('|');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `chat_${(hash >>> 0).toString(36)}`;
}

export async function ensureDirectChatForParticipants(participants: string[]): Promise<string> {
  if (!isFirebaseConfigured || !firestore) {
    return buildDeterministicDirectChatId(participants);
  }

  const normalized = [...new Set(participants.map(normalizeParticipant))].sort();
  const chatId = buildDeterministicDirectChatId(normalized);
  const now = new Date().toISOString();

  await ensureFirebaseAnonymousAuth();
  await setDoc(
    doc(firestore, DIRECT_CHATS_COLLECTION, chatId),
    {
      participants: normalized,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  return chatId;
}

export function subscribeToDirectChat(
  chatId: string,
  onChat: (chat: RemoteDirectChat | null) => void
): () => void {
  if (!isFirebaseConfigured || !firestore) {
    onChat(null);
    return () => {};
  }

  let unsubscribe = () => {};
  let disposed = false;

  void (async () => {
    await ensureFirebaseAnonymousAuth();
    if (disposed) return;
    unsubscribe = onSnapshot(
      doc(firestore, DIRECT_CHATS_COLLECTION, chatId),
      (snapshot) => {
        if (!snapshot.exists()) {
          onChat(null);
          return;
        }
        const data = snapshot.data() as Partial<RemoteDirectChat>;
        onChat({
          id: snapshot.id,
          participants: Array.isArray(data.participants) ? data.participants.map(normalizeParticipant) : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
          lastMessagePreview: data.lastMessagePreview,
        });
      },
      () => onChat(null)
    );
  })();

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export function subscribeToDirectChatsForParticipant(
  participant: string,
  onChats: (chats: RemoteDirectChat[]) => void
): () => void {
  if (!isFirebaseConfigured || !firestore) {
    onChats([]);
    return () => {};
  }

  const key = normalizeParticipant(participant);
  let unsubscribe = () => {};
  let disposed = false;

  void (async () => {
    await ensureFirebaseAnonymousAuth();
    if (disposed) return;
    const ref = query(collection(firestore, DIRECT_CHATS_COLLECTION), orderBy('updatedAt', 'desc'));
    unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const chats = snapshot.docs
          .map((d) => {
            const data = d.data() as Partial<RemoteDirectChat>;
            return {
              id: d.id,
              participants: Array.isArray(data.participants) ? data.participants.map(normalizeParticipant) : [],
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
              lastMessagePreview: data.lastMessagePreview,
            };
          })
          .filter((chat) => chat.participants.includes(key));
        onChats(chats);
      },
      () => onChats([])
    );
  })();

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export function subscribeToDirectMessages(
  chatId: string,
  onMessages: (messages: ChatMessage[]) => void
): () => void {
  if (!isFirebaseConfigured || !firestore) {
    onMessages([]);
    return () => {};
  }

  let unsubscribe = () => {};
  let disposed = false;

  void (async () => {
    await ensureFirebaseAnonymousAuth();
    if (disposed) return;
    const ref = query(
      collection(firestore, DIRECT_CHATS_COLLECTION, chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const messages = snapshot.docs.map((d) => {
          const data = d.data() as Omit<ChatMessage, 'id'>;
          return {
            ...data,
            id: d.id,
          };
        });
        onMessages(messages);
      },
      () => onMessages([])
    );
  })();

  return () => {
    disposed = true;
    unsubscribe();
  };
}

export async function sendDirectMessage(
  chatId: string,
  senderId: string,
  content: string,
  type: ChatMessage['type'] = 'text',
  attachments: ChatAttachment[] = [],
  participants: string[] = []
): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;

  await ensureFirebaseAnonymousAuth();
  const now = new Date().toISOString();
  const safeContent = content || (attachments.length > 0 ? '[Attachment]' : '');
  const normalizedParticipants = [
    ...new Set([senderId, ...participants].map(normalizeParticipant).filter(Boolean)),
  ].sort();
  const message: Omit<ChatMessage, 'id'> = {
    chatId,
    senderId,
    content: safeContent,
    type,
    createdAt: now,
  };
  if (attachments.length > 0) {
    message.attachments = attachments;
  }

  // Upsert chat metadata first so Firestore rules that validate participants can pass.
  await setDoc(
    doc(firestore, DIRECT_CHATS_COLLECTION, chatId),
    {
      ...(normalizedParticipants.length > 0 ? { participants: normalizedParticipants } : {}),
      createdAt: now,
      updatedAt: now,
      lastMessagePreview: safeContent,
    },
    { merge: true }
  );
  await addDoc(collection(firestore, DIRECT_CHATS_COLLECTION, chatId, 'messages'), message);
}

export async function updateDirectMessageAttachment(
  chatId: string,
  messageId: string,
  attachmentId: string,
  updates: Partial<ChatAttachment>
): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  await ensureFirebaseAnonymousAuth();
  const messageRef = doc(firestore, DIRECT_CHATS_COLLECTION, chatId, 'messages', messageId);
  const snapshot = await getDoc(messageRef);
  if (!snapshot.exists()) return;
  const data = snapshot.data() as ChatMessage;
  const nextAttachments = (data.attachments || []).map((att) =>
    att.id === attachmentId ? { ...att, ...updates } : att
  );
  await updateDoc(messageRef, { attachments: nextAttachments });
}
