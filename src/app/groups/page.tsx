'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Lock, Globe, X } from 'lucide-react';
import MobileFrame from '@/components/MobileFrame';
import BottomNav from '@/components/BottomNav';
import useStore from '@/store/useStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SEED_GROUPS } from '@/lib/seedData';
import { INTEREST_OPTIONS } from '@/types';

export default function GroupsPage() {
  const router = useRouter();
  const {
    currentUser, groups, joinGroup, createGroup,
    loadFromStorage, highContrastMode
  } = useStore();
  const { isWarmGradient } = useAppTheme();
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'mine'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    city: '',
    tags: [] as string[],
    rules: ['Be respectful', 'No bullying'],
    type: 'public' as 'public' | 'request_to_join',
  });

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    // Seed groups if empty
    if (groups.length === 0) {
      const store = useStore.getState();
      SEED_GROUPS.forEach((g) => {
        store.createGroup({
          name: g.name,
          description: g.description,
          city: g.city,
          tags: g.tags,
          rules: g.rules,
          type: g.type,
          avatar: g.avatar,
        });
      });
    }
  }, [currentUser, router, groups.length]);

  if (!currentUser) return null;

  const searchFiltered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredGroups =
    listFilter === 'mine'
      ? searchFiltered.filter((g) => g.members.includes(currentUser.id))
      : searchFiltered;

  const handleCreateGroup = () => {
    if (!newGroup.name || !newGroup.description) return;
    createGroup(newGroup);
    setShowCreate(false);
    setNewGroup({
      name: '',
      description: '',
      city: '',
      tags: [],
      rules: ['Be respectful', 'No bullying'],
      type: 'public',
    });
  };

  const toggleTag = (tag: string) => {
    setNewGroup((g) => ({
      ...g,
      tags: g.tags.includes(tag) ? g.tags.filter((t) => t !== tag) : [...g.tags, tag],
    }));
  };

  return (
    <MobileFrame>
      <div
        className={`min-h-full pb-24 ${
          highContrastMode
            ? 'bg-black text-yellow-100'
            : isWarmGradient
              ? 'bg-transparent text-[color:var(--foreground)]'
              : 'bg-[color:var(--background)] text-[color:var(--foreground)]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 pt-4 pb-4 shadow-sm ${
            highContrastMode
              ? 'bg-gray-900'
              : isWarmGradient
                ? 'bg-[color:var(--surface-header)] backdrop-blur-xl border-b border-sky-200/45 shadow-sm'
                : 'bg-[color:var(--background)]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={20} className={highContrastMode ? 'text-yellow-400' : 'text-[color:var(--color-primary)]'} />
              <h1 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                Groups
              </h1>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className={`p-2 rounded-xl ${highContrastMode ? 'bg-yellow-400 text-black' : 'bg-[color:var(--color-primary)] text-white'}`}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              highContrastMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className={`w-full py-2.5 pl-9 pr-4 rounded-xl text-sm ${
                highContrastMode
                  ? 'bg-gray-800 text-yellow-100 border border-yellow-400/30 placeholder-gray-600'
                  : 'bg-gray-100 text-gray-800 placeholder-gray-400'
              }`}
            />
          </div>
          <div className="flex gap-2 mt-3">
            {(['all', 'mine'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setListFilter(key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  listFilter === key
                    ? highContrastMode
                      ? 'bg-yellow-400 text-black'
                      : 'bg-[color:var(--color-primary)] text-white'
                    : highContrastMode
                      ? 'bg-gray-800 text-gray-400 border border-gray-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {key === 'all' ? 'All groups' : 'My groups'}
              </button>
            ))}
          </div>
        </div>

        {/* Groups list */}
        <div className="px-4 py-4 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-16">
              <Users size={48} className={`mx-auto mb-4 ${highContrastMode ? 'text-yellow-400/50' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-bold mb-2 ${highContrastMode ? 'text-yellow-100' : 'text-gray-700'}`}>
                No groups found
              </h3>
              <p className={`text-sm mb-4 ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {listFilter === 'mine'
                  ? "You haven't joined any groups yet. Try All groups or search."
                  : 'Create one or adjust your search'}
              </p>
            </div>
          ) : (
            filteredGroups.map((group, index) => {
              const isMember = group.members.includes(currentUser.id);
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-2xl ${
                    highContrastMode
                      ? 'bg-gray-900 border border-yellow-400/30'
                      : isWarmGradient
                        ? 'bg-[color:var(--surface-glass)] border border-sky-200/45 shadow-sm'
                        : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                      <Users size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className={`font-bold text-sm ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                          {group.name}
                        </h3>
                        {group.type === 'request_to_join' ? (
                          <Lock size={12} className={highContrastMode ? 'text-yellow-400' : 'text-gray-400'} />
                        ) : (
                          <Globe size={12} className={highContrastMode ? 'text-yellow-400' : 'text-gray-400'} />
                        )}
                      </div>
                      <p className={`text-xs mb-2 line-clamp-2 ${highContrastMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {group.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {group.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              highContrastMode
                                ? 'bg-gray-800 text-gray-400'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${highContrastMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {group.members.length} members
                        </span>
                        {isMember ? (
                          <button
                            onClick={() => router.push(`/groups/${group.id}`)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${
                              highContrastMode
                                ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                                : 'bg-purple-50 text-purple-600'
                            }`}
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            onClick={() => joinGroup(group.id)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold ${
                              highContrastMode
                                ? 'bg-yellow-400 text-black'
                                : 'bg-purple-500 text-white'
                            }`}
                          >
                            {group.type === 'request_to_join' ? 'Request' : 'Join'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Create Group Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto ${
                  highContrastMode
                    ? 'bg-gray-900'
                    : isWarmGradient
                      ? 'bg-white border-t border-slate-200 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.08)]'
                      : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${highContrastMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                    Create Group
                  </h2>
                  <button onClick={() => setShowCreate(false)} className="p-1">
                    <X size={20} className={highContrastMode ? 'text-gray-500' : 'text-gray-400'} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-semibold mb-1 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      placeholder="e.g., Deaf Teens DFW"
                      className={`w-full p-3 rounded-xl text-sm ${
                        highContrastMode
                          ? 'bg-gray-800 text-yellow-100 border border-yellow-400/30'
                          : 'bg-gray-50 border border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold mb-1 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                      Description
                    </label>
                    <textarea
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      rows={3}
                      placeholder="What is this group about?"
                      className={`w-full p-3 rounded-xl text-sm resize-none ${
                        highContrastMode
                          ? 'bg-gray-800 text-yellow-100 border border-yellow-400/30'
                          : 'bg-gray-50 border border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold mb-1 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                      City
                    </label>
                    <input
                      type="text"
                      value={newGroup.city}
                      onChange={(e) => setNewGroup({ ...newGroup, city: e.target.value })}
                      placeholder="e.g., Dallas, TX"
                      className={`w-full p-3 rounded-xl text-sm ${
                        highContrastMode
                          ? 'bg-gray-800 text-yellow-100 border border-yellow-400/30'
                          : 'bg-gray-50 border border-gray-200 text-gray-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold mb-2 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set([
                          'Deaf Community',
                          'ASL',
                          'STEM',
                          'Social',
                          'Sports',
                          'Arts',
                          ...INTEREST_OPTIONS.slice(0, 6),
                        ])
                      ).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            newGroup.tags.includes(tag)
                              ? highContrastMode
                                ? 'bg-yellow-400 text-black'
                                : 'bg-purple-500 text-white'
                              : highContrastMode
                              ? 'bg-gray-800 text-gray-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-sm font-semibold mb-2 block ${highContrastMode ? 'text-yellow-200' : 'text-gray-700'}`}>
                      Group Type
                    </label>
                    <div className="flex gap-2">
                      {(['public', 'request_to_join'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewGroup({ ...newGroup, type })}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                            newGroup.type === type
                              ? highContrastMode
                                ? 'bg-yellow-400 text-black'
                                : 'bg-purple-500 text-white'
                              : highContrastMode
                              ? 'bg-gray-800 text-gray-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {type === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                          {type === 'public' ? 'Public' : 'Request to Join'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroup.name || !newGroup.description}
                    className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all ${
                      newGroup.name && newGroup.description
                        ? highContrastMode
                          ? 'bg-yellow-400 text-black'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : highContrastMode
                        ? 'bg-gray-800 text-gray-600'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    Create Group
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    </MobileFrame>
  );
}
