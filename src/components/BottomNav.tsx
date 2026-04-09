'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, Users, Calendar, MessageCircle, User } from 'lucide-react';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getParticipantKey, subscribeToDirectChatsForParticipant, type RemoteDirectChat } from '@/lib/chatSync';
import { isFirebaseConfigured } from '@/lib/firebase';

const NAV_ITEMS = [
  { label: 'Discover', icon: Compass, path: '/discover' },
  { label: 'Groups', icon: Users, path: '/groups' },
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Messages', icon: MessageCircle, path: '/chat' },
  { label: 'Profile', icon: User, path: '/profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const highContrastMode = useStore((s) => s.highContrastMode);
  const currentUser = useStore((s) => s.currentUser);
  const seenChatTimestamps = useStore((s) => s.seenChatTimestamps);
  const { isWarmGradient } = useAppTheme();
  const [remoteChats, setRemoteChats] = React.useState<RemoteDirectChat[]>([]);

  const participantKey = React.useMemo(
    () => (currentUser ? getParticipantKey(currentUser.email, currentUser.id) : ''),
    [currentUser]
  );

  React.useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      setRemoteChats([]);
      return;
    }
    return subscribeToDirectChatsForParticipant(participantKey, setRemoteChats);
  }, [currentUser, participantKey]);

  const unseenMessageCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return remoteChats.filter((chat) => {
      const seenAt = seenChatTimestamps[chat.id];
      if (!seenAt) return true;
      return new Date(chat.updatedAt).getTime() > new Date(seenAt).getTime();
    }).length;
  }, [currentUser, remoteChats, seenChatTimestamps]);

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm z-40 ${
        highContrastMode
          ? 'bg-gray-900 border-t-2 border-yellow-400'
          : isWarmGradient
            ? 'bg-[color:var(--surface-glass)] backdrop-blur-xl border-t border-sky-200/40 shadow-[0_-1px_0_0_rgba(3,105,161,0.10)]'
            : 'bg-[color:var(--background)]/95 backdrop-blur-lg border-t border-gray-200/30'
      }`}
      style={{ borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}
    >
      <div className="flex items-center justify-around px-2 py-2 pb-6">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname.startsWith(item.path) ||
            (item.path === '/discover' &&
              (pathname.startsWith('/search') || pathname.startsWith('/user')));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[3.5rem] ${
                isActive
                  ? highContrastMode
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-sky-900 bg-sky-100/90'
                  : highContrastMode
                  ? 'text-gray-400 hover:text-yellow-300'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {item.path === '/chat' && unseenMessageCount > 0 && (
                  <span
                    className={`absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      highContrastMode ? 'bg-yellow-400 text-black' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {unseenMessageCount > 99 ? '99+' : unseenMessageCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
