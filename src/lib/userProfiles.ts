import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { ensureFirebaseAnonymousAuth, firestore, isFirebaseConfigured } from '@/lib/firebase';

const USER_PROFILES_COLLECTION = 'userProfiles';

function sanitizeForFirestore<T>(value: T): T {
  // Firestore rejects undefined values; stringify removes them safely.
  return JSON.parse(JSON.stringify(value)) as T;
}

function getProfileDocId(profile: UserProfile): string {
  const emailId = profile.email?.trim().toLowerCase();
  return emailId || profile.id;
}

export async function upsertPublicUserProfile(profile: UserProfile): Promise<void> {
  if (!isFirebaseConfigured || !firestore) return;
  if (!profile?.id || !profile?.email) return;
  await ensureFirebaseAnonymousAuth();

  const docId = getProfileDocId(profile);
  const payload = sanitizeForFirestore({
    ...profile,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(firestore, USER_PROFILES_COLLECTION, docId), payload, { merge: true });
}

export async function getPublicUserProfileByOwnerId(ownerId: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured || !firestore) return null;
  const normalized = ownerId.trim().toLowerCase();
  if (!normalized) return null;
  await ensureFirebaseAnonymousAuth();

  const snapshot = await getDoc(doc(firestore, USER_PROFILES_COLLECTION, normalized));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<UserProfile>;
  if (!data?.email) return null;
  return {
    ...(data as UserProfile),
    id: data.id || snapshot.id,
  };
}

export function subscribeToPublicUserProfiles(
  onProfiles: (profiles: UserProfile[]) => void
): () => void {
  if (!isFirebaseConfigured || !firestore) {
    onProfiles([]);
    return () => {};
  }

  let unsubscribe = () => {};
  let disposed = false;

  void (async () => {
    await ensureFirebaseAnonymousAuth();
    if (disposed) return;
    const ref = collection(firestore, USER_PROFILES_COLLECTION);
    unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const profiles = snapshot.docs
          .map((d) => {
            const data = d.data() as Partial<UserProfile>;
            if (!data) return null;
            return {
              ...(data as UserProfile),
              id: data.id || d.id,
            };
          })
          .filter((p): p is UserProfile => Boolean(p && p.id && p.email));
        onProfiles(profiles);
      },
      (error) => {
        console.error('Failed subscribing to public user profiles:', error);
        onProfiles([]);
      }
    );
  })();

  return () => {
    disposed = true;
    unsubscribe();
  };
}
