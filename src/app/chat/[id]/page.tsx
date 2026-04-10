'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Send, Sparkles, MoreVertical, Flag, Ban,
  Calendar, X, Link2, Video, Bot, Captions, Maximize2, Users
} from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SEED_PROFILES } from '@/lib/seedData';
import type { ChatAttachment } from '@/types';
import { ICEBREAKERS } from '@/types';
import {
  getParticipantKey,
  sendDirectMessage,
  subscribeToDirectChat,
  subscribeToDirectMessages,
  updateDirectMessageAttachment,
  type RemoteDirectChat,
} from '@/lib/chatSync';
import { subscribeToPublicUserProfiles } from '@/lib/userProfiles';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { ChatMessage, UserProfile } from '@/types';
import { buildGroupInviteAttachment, buildGroupInviteMessage, getMyGroups } from '@/lib/matchActions';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;
  const {
    currentUser, chats, chatMessages, sendMessage, sendMessageAs, updateMessageAttachment,
    submitReport, loadFromStorage, highContrastMode, markChatSeen, joinGroup, groups
  } = useStore();
  const { isWarmGradient } = useAppTheme();
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [showGroupInvites, setShowGroupInvites] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showChatPrefs, setShowChatPrefs] = useState(false);
  const [showReportThanks, setShowReportThanks] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<ChatAttachment[]>([]);
  const [signyLoading, setSignyLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState<Record<string, boolean>>({});
  const [captionEditor, setCaptionEditor] = useState<{
    messageId: string;
    attachmentId: string;
    text: string;
  } | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<{
    messageId: string;
    attachmentId: string;
    url: string;
    label?: string;
    captions?: string;
  } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [publicProfiles, setPublicProfiles] = useState<UserProfile[]>([]);
  const [remoteChat, setRemoteChat] = useState<RemoteDirectChat | null>(null);
  const [remoteMessages, setRemoteMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) router.push('/');
  }, [currentUser, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, remoteMessages, chatId]);

  useEffect(() => {
    if (!fullscreenVideo) return;
    const currentMessage = (chatMessages[chatId] || []).find((m) => m.id === fullscreenVideo.messageId);
    const currentAttachment = currentMessage?.attachments?.find((a) => a.id === fullscreenVideo.attachmentId);
    if (!currentAttachment) return;
    if (
      currentAttachment.captions === fullscreenVideo.captions &&
      currentAttachment.label === fullscreenVideo.label
    ) {
      return;
    }
    setFullscreenVideo((prev) =>
      prev
        ? {
            ...prev,
            captions: currentAttachment.captions,
            label: currentAttachment.label,
          }
        : prev
    );
  }, [chatMessages, chatId, fullscreenVideo]);

  const chat = chats.find((c) => c.id === chatId);
  const participantKey = getParticipantKey(currentUser?.email || '', currentUser?.id || '');
  const isPotentialRemoteDirectChat = !chat || !chat.participants.includes('signy-assistant');
  const shouldUseRemoteDirectChat = isFirebaseConfigured && isPotentialRemoteDirectChat;

  useEffect(() => {
    if (!shouldUseRemoteDirectChat) {
      setRemoteChat(null);
      setRemoteMessages([]);
      return;
    }
    const unsubChat = subscribeToDirectChat(chatId, setRemoteChat);
    const unsubMessages = subscribeToDirectMessages(chatId, setRemoteMessages);
    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId, shouldUseRemoteDirectChat]);

  useEffect(() => {
    if (shouldUseRemoteDirectChat && remoteChat?.updatedAt) {
      markChatSeen(chatId, remoteChat.updatedAt);
      return;
    }
    const localMessages = chatMessages[chatId] || [];
    if (localMessages.length > 0) {
      markChatSeen(chatId, localMessages[localMessages.length - 1].createdAt);
    }
  }, [chatId, shouldUseRemoteDirectChat, remoteChat?.updatedAt, chatMessages, markChatSeen]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setPublicProfiles([]);
      return;
    }
    return subscribeToPublicUserProfiles(setPublicProfiles);
  }, []);

  if (!currentUser) return null;

  const participants = shouldUseRemoteDirectChat
    ? remoteChat?.participants || chat?.participants || []
    : chat?.participants || [];

  const otherId = participants.find((id) => id !== participantKey && id !== currentUser.id);
  const remoteParticipants =
    participants.length > 0
      ? participants
      : [participantKey, ...(otherId ? [otherId] : [])];
  const isSignyChat = otherId === 'signy-assistant';
  const profileLookup = new Map<string, UserProfile>();
  publicProfiles.forEach((profile) => {
    profileLookup.set(profile.id.trim().toLowerCase(), profile);
    profileLookup.set(profile.email.trim().toLowerCase(), profile);
  });
  const otherProfile =
    (otherId ? profileLookup.get(otherId.trim().toLowerCase()) : undefined) ||
    SEED_PROFILES.find((p) => p.id === otherId);
  const otherName = isSignyChat
    ? 'Signy'
    : otherProfile?.name || (otherId?.includes('@') ? otherId.split('@')[0] : 'Unknown');
  const otherInitials = isSignyChat
    ? 'AI'
    : otherName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  const messages = shouldUseRemoteDirectChat ? remoteMessages : (chatMessages[chatId] || []);
  const myGroups = getMyGroups(groups, currentUser);

  const askSigny = async (userText: string) => {
    if (!isSignyChat) return;
    setSignyLoading(true);
    try {
      const history = messages
        .filter((m) => !m.attachments || m.attachments.length === 0)
        .slice(-8)
        .map((m) => ({
          role: m.senderId === currentUser.id ? 'user' as const : 'assistant' as const,
          content: m.content,
        }));

      const res = await fetch('/api/signy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: currentUser.name,
          languagePreference: currentUser.languagePreference ?? 'bilingual',
          message: userText,
          history,
        }),
      });

      const data = await res.json();
      const reply = data.reply || 'I am here whenever you need help.';
      sendMessageAs(chatId, 'signy-assistant', reply, 'assistant');
    } catch (error) {
      sendMessageAs(
        chatId,
        'signy-assistant',
        'Sorry, I ran into an issue while replying. Please try again.',
        'assistant'
      );
    } finally {
      setSignyLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && draftAttachments.length === 0) return;
    const text = message.trim();
    try {
      if (isSignyChat || !shouldUseRemoteDirectChat) {
        sendMessage(chatId, text, 'text', draftAttachments);
      } else {
        await sendDirectMessage(chatId, participantKey, text, 'text', draftAttachments, remoteParticipants);
      }
    } catch (error) {
      // Keep chat usable even if remote write fails (permissions/network/rules mismatch).
      sendMessage(chatId, text, 'text', draftAttachments);
      window.alert('Live sync is temporarily unavailable. Message was saved locally.');
      console.error('Failed to send remote direct message:', error);
    }
    setMessage('');
    setDraftAttachments([]);

    if (isSignyChat && text) {
      await askSigny(text);
    }
  };

  const handleIcebreaker = (text: string) => {
    if (isSignyChat || !shouldUseRemoteDirectChat) {
      sendMessage(chatId, text, 'icebreaker');
    } else {
      void sendDirectMessage(chatId, participantKey, text, 'icebreaker', [], remoteParticipants).catch((error) => {
        sendMessage(chatId, text, 'icebreaker');
        console.error('Failed to send remote icebreaker:', error);
      });
    }
    setShowIcebreakers(false);
  };

  const handleHangout = () => {
    if (isSignyChat || !shouldUseRemoteDirectChat) {
      sendMessage(chatId, "Hey! Want to plan a hangout? What works for you?", 'hangout_request');
    } else {
      void sendDirectMessage(
        chatId,
        participantKey,
        "Hey! Want to plan a hangout? What works for you?",
        'hangout_request',
        [],
        remoteParticipants
      ).catch((error) => {
        sendMessage(chatId, "Hey! Want to plan a hangout? What works for you?", 'hangout_request');
        console.error('Failed to send remote hangout request:', error);
      });
    }
  };

  const handleInviteToGroup = async (groupId: string) => {
    if (isSignyChat) return;
    const selectedGroup = myGroups.find((g) => g.id === groupId);
    if (!selectedGroup) return;
    const inviteText = buildGroupInviteMessage(selectedGroup);
    const inviteAttachment = buildGroupInviteAttachment(selectedGroup);
    if (isSignyChat || !shouldUseRemoteDirectChat) {
      sendMessage(chatId, inviteText, 'text', [inviteAttachment]);
    } else {
      try {
        await sendDirectMessage(
          chatId,
          participantKey,
          inviteText,
          'text',
          [inviteAttachment],
          remoteParticipants
        );
      } catch (error) {
        sendMessage(chatId, inviteText, 'text', [inviteAttachment]);
        console.error('Failed to send remote group invite:', error);
      }
    }
    setShowGroupInvites(false);
  };

  const isValidUrl = (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const addLinkAttachment = () => {
    const url = window.prompt('Paste a link URL (https://...)');
    if (!url) return;
    if (!isValidUrl(url)) {
      window.alert('Please enter a valid URL.');
      return;
    }
    const label = window.prompt('Optional label for this link:') || undefined;
    setDraftAttachments((prev) => [
      ...prev,
      { id: `${Date.now()}-link`, kind: 'link', url, label: label?.trim() || undefined },
    ]);
  };

  const addVideoAttachment = async (file: File) => {
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }
      const transcript =
        typeof data.transcript === 'string' && data.transcript.trim()
          ? data.transcript.trim()
          : undefined;
      const baseName = file.name.replace(/\.[^.]+$/, '') || file.name;
      setDraftAttachments((prev) => [
        ...prev,
        {
          id: `${Date.now()}-video`,
          kind: 'video',
          url: data.url,
          label: baseName,
          captions: transcript,
        },
      ]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeDraftAttachment = (id: string) => {
    setDraftAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const setCaptionJob = (key: string, active: boolean) => {
    setGeneratingCaptions((prev) => {
      if (active) return { ...prev, [key]: true };
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const generateCaptionsForAttachment = async (
    messageId: string,
    attachment: ChatAttachment
  ) => {
    if (attachment.kind !== 'video') return;
    const key = `${messageId}:${attachment.id}`;
    if (generatingCaptions[key]) return;

    setCaptionJob(key, true);
    try {
      const res = await fetch('/api/transcribe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: attachment.url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not generate captions.');
      }

      const transcript =
        typeof data?.transcript === 'string' && data.transcript.trim()
          ? data.transcript.trim()
          : '';

      if (!transcript) {
        const extra =
          typeof data?.transcriptionError === 'string' && data.transcriptionError.trim()
            ? ` (${data.transcriptionError})`
            : typeof data?.transcribeError === 'string' && data.transcribeError.trim()
              ? ` (${data.transcribeError})`
            : '';
        window.alert(
          `Could not auto-generate captions for this clip${extra}. Try another clip, then use the Captions button to edit text manually if needed.`
        );
        return;
      }

      if (shouldUseRemoteDirectChat && !isSignyChat) {
        await updateDirectMessageAttachment(chatId, messageId, attachment.id, {
          captions: transcript,
        });
      } else {
        updateMessageAttachment(chatId, messageId, attachment.id, {
          captions: transcript,
        });
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not generate captions.');
    } finally {
      setCaptionJob(key, false);
    }
  };

  const handleReport = () => {
    if (!otherId || !reportReason) return;

    const details = reportReason === 'Other' ? reportDetails.trim() : '';
    if (reportReason === 'Other' && !details) return;

    submitReport(otherId, reportReason, details);
    setShowReport(false);
    setReportReason('');
    setReportDetails('');
    setShowReportThanks(true);

    setTimeout(() => setShowReportThanks(false), 2600);
  };

  /**
   * Browsers only show built-in CC controls when a <track> exists.
   * We generate a lightweight WebVTT track from transcript text so users
   * can toggle captions directly in the video player.
   */
  const makeCaptionTrackUrl = (captionText?: string) => {
    const text = captionText?.trim();
    if (!text) return undefined;

    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const chunkSize = 8;
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    const toTime = (seconds: number) => {
      const totalMs = Math.max(0, Math.floor(seconds * 1000));
      const ms = totalMs % 1000;
      const totalSec = Math.floor(totalMs / 1000);
      const sec = totalSec % 60;
      const totalMin = Math.floor(totalSec / 60);
      const min = totalMin % 60;
      const hr = Math.floor(totalMin / 60);
      const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
      return `${pad(hr)}:${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
    };

    // Approximate pacing so lines advance while the person speaks.
    const secondsPerChunk = 2.8;
    let vtt = 'WEBVTT\n\n';
    chunks.forEach((chunk, index) => {
      const start = index * secondsPerChunk;
      const end = start + secondsPerChunk;
      vtt += `${toTime(start)} --> ${toTime(end)}\n${chunk}\n\n`;
    });

    return `data:text/vtt;charset=utf-8,${encodeURIComponent(vtt)}`;
  };

  const fullscreenTrackUrl = makeCaptionTrackUrl(fullscreenVideo?.captions);

  return (
    <MobileFrame>
      <div
        className={`flex flex-col min-h-[100dvh] h-[100dvh] ${
          highContrastMode
            ? 'bg-black text-yellow-100'
            : isWarmGradient
              ? 'bg-transparent text-[color:var(--foreground)]'
              : 'bg-[color:var(--background)] text-[color:var(--foreground)]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 pb-3 flex items-center gap-3 shadow-sm ${
            highContrastMode
              ? 'bg-gray-900 border-b border-yellow-400/30'
              : isWarmGradient
                ? 'bg-[color:var(--surface-header)] backdrop-blur-xl border-b border-sky-200/45 shadow-sm'
                : 'bg-[color:var(--background)]'
          }`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <button onClick={() => router.push('/chat')} className="p-1">
            <ArrowLeft size={22} className={highContrastMode ? 'text-yellow-400' : 'text-gray-700'} />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
            {isSignyChat ? (
              <Bot size={16} className="text-white" />
            ) : otherProfile?.avatar ? (
              <img src={otherProfile.avatar} alt={otherName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{otherInitials}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
              {otherName}
            </h2>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                highContrastMode ? 'bg-gray-800 text-yellow-300' : 'bg-blue-50 text-blue-700'
              }`}>
                Visual-first chat
              </span>
              {currentUser.chatPreferences?.pace && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  highContrastMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  Pace: {currentUser.chatPreferences.pace}
                </span>
              )}
            </div>
          </div>
          {!isSignyChat && (
            <button
              onClick={() => setShowChatPrefs(true)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                highContrastMode ? 'bg-gray-800 text-yellow-300' : 'bg-blue-50 text-blue-700'
              }`}
            >
              Prefs
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2">
              <MoreVertical size={18} className={highContrastMode ? 'text-yellow-400' : 'text-gray-500'} />
            </button>
            {showMenu && (
              <div className={`absolute right-0 top-10 w-48 rounded-xl shadow-lg z-20 py-1 ${highContrastMode ? 'bg-gray-800 border border-yellow-400/30' : 'bg-white border border-gray-100'
                }`}>
                <button
                  onClick={() => { setShowReport(true); setShowMenu(false); }}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${highContrastMode ? 'text-yellow-100 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Flag size={14} /> Report User
                </button>
                <button
                  onClick={() => { /* block action not yet assigned */ }}
                  className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 text-red-500 hover:bg-red-50"
                >
                  <Ban size={14} /> Block User
                </button>

              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id || msg.senderId === participantKey;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl ${msg.type === 'icebreaker'
                    ? highContrastMode
                      ? 'bg-yellow-400/20 border border-yellow-400/50 text-yellow-100'
                      : 'bg-purple-50 border border-purple-100 text-purple-800'
                    : msg.type === 'hangout_request'
                      ? highContrastMode
                        ? 'bg-sky-400/20 border border-sky-400/50 text-sky-100'
                        : 'bg-sky-50 border border-sky-100 text-sky-800'
                      : isMe
                        ? highContrastMode
                          ? 'bg-yellow-400 text-black'
                          : 'bg-purple-500 text-white'
                        : highContrastMode
                          ? 'bg-gray-800 text-yellow-100'
                          : 'bg-white text-gray-800 shadow-sm'
                    }`}
                >
                  {msg.type === 'icebreaker' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles size={12} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Icebreaker</span>
                    </div>
                  )}
                  {msg.type === 'hangout_request' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar size={12} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Hangout</span>
                    </div>
                  )}
                  {msg.type === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot size={12} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Signy</span>
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.attachments.map((att) => {
                        const captionTrackUrl = makeCaptionTrackUrl(att.captions);
                        const captionJobKey = `${msg.id}:${att.id}`;
                        const isGeneratingCaption = Boolean(generatingCaptions[captionJobKey]);
                        return (
                        <div key={att.id}>
                          {att.kind === 'link' ? (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-xs underline break-all ${
                                isMe
                                  ? highContrastMode
                                    ? 'text-black/80'
                                    : 'text-white/90'
                                  : highContrastMode
                                  ? 'text-yellow-300'
                                  : 'text-purple-700'
                              }`}
                            >
                              {att.label || att.url}
                            </a>
                          ) : att.kind === 'group_invite' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!att.groupId) return;
                                joinGroup(att.groupId);
                                router.push(`/groups/${att.groupId}`);
                              }}
                              className={`text-xs rounded-lg px-3 py-2 font-semibold ${
                                highContrastMode
                                  ? 'bg-yellow-400 text-black'
                                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                              }`}
                            >
                              {att.label || 'Click to join'}
                            </button>
                          ) : (
                            <div className="space-y-1">
                              <div className="relative group">
                                <video
                                  controls
                                  src={att.url}
                                  className="w-full max-h-56 rounded-lg bg-black"
                                >
                                  {captionTrackUrl && (
                                    <track
                                      kind="captions"
                                      src={captionTrackUrl}
                                      srcLang="en"
                                      label="Auto captions"
                                      default
                                    />
                                  )}
                                </video>
                                {att.captions && (
                                  <div className="pointer-events-none absolute bottom-9 left-2 right-2 rounded bg-black/75 px-2 py-1 text-center text-[11px] text-white">
                                    {att.captions}
                                  </div>
                                )}
                                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => generateCaptionsForAttachment(msg.id, att)}
                                    disabled={isGeneratingCaption}
                                    className="rounded-md bg-black/70 p-1 text-white disabled:opacity-50"
                                    title={isGeneratingCaption ? 'Generating captions...' : 'Generate auto captions'}
                                  >
                                    <Sparkles size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCaptionEditor({
                                        messageId: msg.id,
                                        attachmentId: att.id,
                                        text: att.captions || '',
                                      })
                                    }
                                    className="rounded-md bg-black/70 p-1 text-white"
                                    title="Add/Edit captions"
                                  >
                                    <Captions size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFullscreenVideo({
                                        messageId: msg.id,
                                        attachmentId: att.id,
                                        url: att.url,
                                        label: att.label,
                                        captions: att.captions,
                                      })
                                    }
                                    className="rounded-md bg-black/70 p-1 text-white"
                                    title="Fullscreen"
                                  >
                                    <Maximize2 size={14} />
                                  </button>
                                </div>
                              </div>
                              {att.label && (
                                <p className={`text-[11px] ${
                                  isMe
                                    ? highContrastMode
                                      ? 'text-black/80'
                                      : 'text-white/90'
                                    : highContrastMode
                                    ? 'text-gray-300'
                                    : 'text-gray-600'
                                }`}>
                                  {att.label}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                  <span className={`text-[10px] mt-1 block ${isMe
                    ? highContrastMode ? 'text-black/60' : 'text-white/70'
                    : highContrastMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Icebreaker panel */}
        {showIcebreakers && (
          <div
            className={`px-4 py-3 border-t ${
              highContrastMode
                ? 'bg-gray-900 border-yellow-400/30'
                : isWarmGradient
                  ? 'bg-[color:var(--surface-glass)] backdrop-blur-xl border-t border-sky-200/40'
                  : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Pick an icebreaker
              </span>
              <button onClick={() => setShowIcebreakers(false)}>
                <X size={16} className={highContrastMode ? 'text-gray-500' : 'text-gray-400'} />
              </button>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {ICEBREAKERS.slice(0, 5).map((ib, i) => (
                <button
                  key={i}
                  onClick={() => handleIcebreaker(ib)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${highContrastMode
                    ? 'bg-gray-800 text-yellow-100 hover:bg-gray-700'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                >
                  {ib}
                </button>
              ))}
            </div>
          </div>
        )}

        {showGroupInvites && !isSignyChat && (
          <div
            className={`px-4 py-3 border-t ${
              highContrastMode
                ? 'bg-gray-900 border-yellow-400/30'
                : isWarmGradient
                  ? 'bg-[color:var(--surface-glass)] backdrop-blur-xl border-t border-sky-200/40'
                  : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                Invite to a group
              </span>
              <button onClick={() => setShowGroupInvites(false)}>
                <X size={16} className={highContrastMode ? 'text-gray-500' : 'text-gray-400'} />
              </button>
            </div>
            {myGroups.length === 0 ? (
              <p className={`text-xs ${highContrastMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Join a group first to send invites.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {myGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => void handleInviteToGroup(group.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                      highContrastMode
                        ? 'bg-gray-800 text-yellow-100 hover:bg-gray-700'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div
          className={`px-4 py-3 border-t shrink-0 ${
            highContrastMode
              ? 'bg-gray-900 border-yellow-400/30'
              : isWarmGradient
                ? 'bg-[color:var(--surface-glass)] backdrop-blur-xl border-t border-sky-200/40'
                : 'bg-white border-gray-100'
          }`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          {draftAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {draftAttachments.map((att) => (
                <div
                  key={att.id}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                    highContrastMode ? 'bg-gray-800 text-yellow-200' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {att.kind === 'link' ? <Link2 size={12} /> : <Video size={12} />}
                  <span className="max-w-40 truncate">{att.label || att.url}</span>
                  <button onClick={() => removeDraftAttachment(att.id)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowIcebreakers(!showIcebreakers)}
              className={`p-2 rounded-xl ${highContrastMode ? 'bg-gray-800 text-yellow-400' : 'bg-purple-50 text-purple-500'
                }`}
              title="Icebreaker"
            >
              <Sparkles size={16} />
            </button>
            {!isSignyChat && (
              <button
                onClick={() => {
                  setShowIcebreakers(false);
                  setShowGroupInvites((prev) => !prev);
                }}
                className={`p-2 rounded-xl ${
                  highContrastMode ? 'bg-gray-800 text-yellow-400' : 'bg-emerald-50 text-emerald-600'
                }`}
                title="Invite to group"
              >
                <Users size={16} />
              </button>
            )}
            <button
              onClick={handleHangout}
              className={`p-2 rounded-xl ${highContrastMode ? 'bg-gray-800 text-yellow-400' : 'bg-sky-50 text-sky-600'
                }`}
              title="Suggest hangout"
            >
              <Calendar size={16} />
            </button>
            <button
              onClick={addLinkAttachment}
              className={`p-2 rounded-xl ${
                highContrastMode ? 'bg-gray-800 text-yellow-400' : 'bg-blue-50 text-blue-600'
              }`}
              title="Attach link"
            >
              <Link2 size={16} />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className={`p-2 rounded-xl ${
                highContrastMode ? 'bg-gray-800 text-yellow-400' : 'bg-rose-50 text-rose-600'
              }`}
              title="Upload video"
            >
              <Video size={16} />
            </button>
          </div>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await addVideoAttachment(file);
              e.currentTarget.value = '';
            }}
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className={`flex-1 py-3 px-4 rounded-2xl text-sm ${highContrastMode
                ? 'bg-gray-800 text-yellow-100 border border-yellow-400/30 placeholder-gray-600'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400'
                }`}
            />
            <button
              onClick={handleSend}
              disabled={(!message.trim() && draftAttachments.length === 0) || signyLoading || uploadingVideo}
              className={`p-3 rounded-2xl transition-all ${(message.trim() || draftAttachments.length > 0) && !signyLoading && !uploadingVideo
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
          {isSignyChat && signyLoading && (
            <p className={`text-[11px] mt-2 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Signy is typing...
            </p>
          )}
          {uploadingVideo && (
            <p className={`text-[11px] mt-2 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Uploading video & generating captions…
            </p>
          )}
        </div>

        {/* Report Thanks */}
        {showReportThanks && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
            <div className={`w-full max-w-xs rounded-2xl p-6 ${highContrastMode ? 'bg-gray-900' : 'bg-white'}`}>
              <h3 className={`text-lg font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Thanks for reporting
              </h3>
              <p className={`text-sm mt-2 ${highContrastMode ? 'text-yellow-200' : 'text-gray-600'}`}>
                We’ll review this report and take appropriate action.
              </p>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReport && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowReport(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xs rounded-2xl p-6 ${highContrastMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <h3 className={`text-lg font-bold mb-4 ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Report {otherName}
              </h3>
              <div className="space-y-2 mb-4">
                {[
                  'Harassment',
                  'Inappropriate content',
                  'Mocking signing / Deaf culture',
                  'Accessibility harassment',
                  'Spam',
                  'Fake profile',
                  'Other',
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm text-left transition-all ${reportReason === reason
                      ? highContrastMode
                        ? 'bg-yellow-400 text-black'
                        : 'bg-purple-500 text-white'
                      : highContrastMode
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              {reportReason === 'Other' && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Describe the issue</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                    placeholder="Type a short reason for reporting..."
                    className={`w-full p-3 rounded-xl border ${highContrastMode ? 'bg-gray-800 text-yellow-100 border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReport(false)}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm ${highContrastMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm ${reportReason
                    ? 'bg-red-500 text-white'
                    : highContrastMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400'
                    }`}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Before-chat preferences modal */}
        {showChatPrefs && !isSignyChat && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setShowChatPrefs(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl p-6 ${highContrastMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <h3 className={`text-lg font-bold mb-3 ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Before we chat
              </h3>
              <div className={`space-y-2 text-sm ${highContrastMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>
                  <span className="font-semibold">Their communication:</span>{' '}
                  {otherProfile?.communicationPreferences.join(', ').replaceAll('_', ' ') || 'Not set'}
                </p>
                <p>
                  <span className="font-semibold">Their comfort:</span>{' '}
                  {otherProfile?.comfortPreferences.join(', ').replaceAll('_', ' ') || 'Not set'}
                </p>
                <p>
                  <span className="font-semibold">Your pace preference:</span>{' '}
                  {currentUser.chatPreferences?.pace || 'normal'}
                </p>
                <p>
                  <span className="font-semibold">Captions/typed follow-up:</span>{' '}
                  {currentUser.chatPreferences?.captionsPreferred === false ? 'Optional' : 'Preferred'}
                </p>
              </div>
              <button
                onClick={() => setShowChatPrefs(false)}
                className={`mt-4 w-full py-2.5 rounded-xl font-medium text-sm ${
                  highContrastMode ? 'bg-yellow-400 text-black' : 'bg-[color:var(--color-primary)] text-white'
                }`}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {captionEditor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            onClick={() => setCaptionEditor(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl p-5 ${highContrastMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <h3 className={`text-base font-bold mb-2 ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Video captions
              </h3>
              <p className={`text-xs mb-2 ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Add a caption line that stays visible on this video in chat and fullscreen.
              </p>
              <textarea
                rows={3}
                value={captionEditor.text}
                onChange={(e) =>
                  setCaptionEditor((prev) => (prev ? { ...prev, text: e.target.value } : prev))
                }
                placeholder="Type caption text..."
                className={`w-full rounded-xl border p-3 text-sm ${
                  highContrastMode
                    ? 'bg-gray-800 border-gray-700 text-yellow-100'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCaptionEditor(null)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                    highContrastMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!captionEditor) return;
                    if (shouldUseRemoteDirectChat && !isSignyChat) {
                      void updateDirectMessageAttachment(
                        chatId,
                        captionEditor.messageId,
                        captionEditor.attachmentId,
                        { captions: captionEditor.text.trim() || undefined }
                      );
                    } else {
                      updateMessageAttachment(chatId, captionEditor.messageId, captionEditor.attachmentId, {
                        captions: captionEditor.text.trim() || undefined,
                      });
                    }
                    setCaptionEditor(null);
                  }}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                    highContrastMode ? 'bg-yellow-400 text-black' : 'bg-[color:var(--color-primary)] text-white'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {fullscreenVideo && (
          <div className="fixed inset-0 z-50 bg-black">
            <button
              type="button"
              onClick={() => setFullscreenVideo(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white"
              aria-label="Close fullscreen video"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                setCaptionEditor({
                  messageId: fullscreenVideo.messageId,
                  attachmentId: fullscreenVideo.attachmentId,
                  text: fullscreenVideo.captions || '',
                })
              }
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white"
            >
              <Captions size={14} />
              Captions
            </button>
            <button
              type="button"
              onClick={() =>
                generateCaptionsForAttachment(fullscreenVideo.messageId, {
                  id: fullscreenVideo.attachmentId,
                  kind: 'video',
                  url: fullscreenVideo.url,
                  label: fullscreenVideo.label,
                  captions: fullscreenVideo.captions,
                })
              }
              disabled={Boolean(
                generatingCaptions[`${fullscreenVideo.messageId}:${fullscreenVideo.attachmentId}`]
              )}
              className="absolute left-36 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Sparkles size={14} />
              {generatingCaptions[`${fullscreenVideo.messageId}:${fullscreenVideo.attachmentId}`]
                ? 'Generating...'
                : 'Generate'}
            </button>
            <div className="flex h-full w-full items-center justify-center p-4">
              <div className="relative w-full max-w-5xl">
                <video
                  controls
                  autoPlay
                  src={fullscreenVideo.url}
                  className="max-h-[85vh] w-full rounded-xl bg-black"
                >
                  {fullscreenTrackUrl && (
                    <track
                      kind="captions"
                      src={fullscreenTrackUrl}
                      srcLang="en"
                      label="Auto captions"
                      default
                    />
                  )}
                </video>
                {fullscreenVideo.captions && (
                  <div className="pointer-events-none absolute bottom-14 left-3 right-3 rounded bg-black/80 px-3 py-2 text-center text-sm text-white">
                    {fullscreenVideo.captions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
