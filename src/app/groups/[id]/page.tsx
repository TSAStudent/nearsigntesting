'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Pin, Users, Settings } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SEED_PROFILES } from '@/lib/seedData';

export default function GroupChatPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const {
    currentUser, groups, groupMessages, sendGroupMessage,
    loadFromStorage, highContrastMode
  } = useStore();
  const { isWarmGradient } = useAppTheme();
  const [message, setMessage] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) router.push('/');
  }, [currentUser, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages, groupId]);

  if (!currentUser) return null;

  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return (
      <MobileFrame>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Group not found</p>
        </div>
      </MobileFrame>
    );
  }

  const messages = groupMessages[groupId] || [];

  const getSenderName = (senderId: string) => {
    if (senderId === currentUser.id) return 'You';
    const profile = SEED_PROFILES.find((p) => p.id === senderId);
    return profile?.name || 'Unknown';
  };

  const handleSend = () => {
    if (!message.trim()) return;
    sendGroupMessage(groupId, message.trim());
    setMessage('');
  };

  return (
    <MobileFrame>
      <div
        className={`flex flex-col h-full ${
          highContrastMode
            ? 'bg-black text-yellow-100'
            : isWarmGradient
              ? 'bg-transparent text-[color:var(--foreground)]'
              : 'bg-[color:var(--background)] text-[color:var(--foreground)]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 pt-4 pb-3 shadow-sm ${
            highContrastMode
              ? 'bg-gray-900 border-b border-yellow-400/30'
              : isWarmGradient
                ? 'bg-[color:var(--surface-header)] backdrop-blur-xl border-b border-sky-200/45 shadow-sm'
                : 'bg-[color:var(--background)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/groups')} className="p-1">
              <ArrowLeft size={22} className={highContrastMode ? 'text-yellow-400' : 'text-gray-700'} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                {group.name}
              </h2>
              <span className={`text-xs ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {group.members.length} members
              </span>
            </div>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2">
              <Settings size={18} className={highContrastMode ? 'text-yellow-400' : 'text-gray-500'} />
            </button>
          </div>
        </div>

        {/* Group info panel */}
        {showInfo && (
          <div className={`px-4 py-3 border-b ${
            highContrastMode ? 'bg-gray-900 border-yellow-400/30' : 'bg-purple-50 border-purple-100'
          }`}>
            <p className={`text-xs mb-2 ${highContrastMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {group.description}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {group.tags.map((tag) => (
                <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  highContrastMode ? 'bg-gray-800 text-yellow-300' : 'bg-purple-100 text-purple-600'
                }`}>
                  {tag}
                </span>
              ))}
            </div>
            {group.rules.length > 0 && (
              <div>
                <h4 className={`text-xs font-semibold mb-1 ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                  Rules
                </h4>
                <ul className={`text-xs space-y-0.5 ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {group.rules.map((rule, i) => (
                    <li key={i}>• {rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Pinned posts */}
        {group.pinnedPosts.length > 0 && (
          <div className={`px-4 py-2 border-b ${
            highContrastMode ? 'bg-gray-900/50 border-yellow-400/20' : 'bg-amber-50 border-amber-100'
          }`}>
            {group.pinnedPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-2">
                <Pin size={12} className={highContrastMode ? 'text-yellow-400 mt-0.5' : 'text-amber-500 mt-0.5'} />
                <p className={`text-xs ${highContrastMode ? 'text-yellow-100' : 'text-amber-800'}`}>
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Users size={32} className={`mx-auto mb-3 ${highContrastMode ? 'text-gray-700' : 'text-gray-300'}`} />
              <p className={`text-sm ${highContrastMode ? 'text-gray-600' : 'text-gray-400'}`}>
                No messages yet. Start the conversation!
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const senderName = getSenderName(msg.senderId);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isMe ? '' : ''}`}>
                  {!isMe && (
                    <span className={`text-[10px] font-semibold mb-0.5 block ${
                      highContrastMode ? 'text-yellow-300' : 'text-purple-600'
                    }`}>
                      {senderName}
                    </span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl ${
                    isMe
                      ? highContrastMode
                        ? 'bg-yellow-400 text-black'
                        : 'bg-purple-500 text-white'
                      : highContrastMode
                      ? 'bg-gray-800 text-yellow-100'
                      : isWarmGradient
                        ? 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                        : 'bg-white text-gray-800 shadow-sm'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <span className={`text-[10px] mt-1 block ${
                      isMe
                        ? highContrastMode ? 'text-black/60' : 'text-white/70'
                        : highContrastMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className={`px-4 py-3 pb-8 border-t ${
            highContrastMode
              ? 'bg-gray-900 border-yellow-400/30'
              : isWarmGradient
                ? 'bg-[color:var(--surface-glass)] backdrop-blur-xl border-t border-sky-200/40'
                : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message the group..."
              className={`flex-1 py-3 px-4 rounded-2xl text-sm ${
                highContrastMode
                  ? 'bg-gray-800 text-yellow-100 border border-yellow-400/30 placeholder-gray-600'
                  : 'bg-gray-100 text-gray-800 placeholder-gray-400'
              }`}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className={`p-3 rounded-2xl transition-all ${
                message.trim()
                  ? highContrastMode
                    ? 'bg-yellow-400 text-black'
                    : 'bg-purple-500 text-white'
                  : highContrastMode
                  ? 'bg-gray-800 text-gray-600'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
