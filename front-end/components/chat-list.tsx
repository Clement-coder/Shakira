'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { Search, Plus, User, Settings, LogOut, RefreshCw, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NewChatModal from './new-chat-modal';
import LogoutModal from './logout-modal';
import CreateGroupModal from './create-group-modal';

type ConversationWithDetails = {
  id: string;
  otherUser: Profile;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  draft: string | null;
  isFavourite: boolean;
  is_group: boolean;
  group_name?: string;
};

export default function ChatList({
  onSelectConversation,
  selectedConversation,
  onViewChange,
  currentView,
}: {
  onSelectConversation: (id: string) => void;
  selectedConversation: string | null;
  onViewChange: (view: 'chats' | 'profile' | 'settings') => void;
  currentView: string;
}) {
  const { user, profile, signOut } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'groups' | 'favourites'>('all');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchConversations)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, fetchConversations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participants?.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participants.map((p) => p.conversation_id);

    const { data: convsFromDb } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds);

    const conversationsData = await Promise.all(
      (convsFromDb || []).map(async (conv) => {
        const convId = conv.id;

        let otherUserProfile: Profile | null = null;
        if (conv.is_group) {
          otherUserProfile = {
            id: conv.id,
            username: conv.group_name || 'Group Chat',
            full_name: conv.group_name || 'Group Chat',
            avatar_url: conv.group_avatar_url || null,
            is_online: false,
            last_seen: new Date().toISOString(),
            bio: '',
            created_at: conv.created_at,
            updated_at: conv.updated_at,
          };
        } else {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', convId)
            .neq('user_id', user.id)
            .single();

          if (otherParticipant) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipant.user_id)
              .single();
            otherUserProfile = profile;
          }
        }

        if (!otherUserProfile) return null;

        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastReadKey = `last_read_${convId}_${user.id}`;
        const lastReadTime = localStorage.getItem(lastReadKey);

        let unreadCount = 0;
        if (lastReadTime) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .neq('sender_id', user.id)
            .gt('created_at', lastReadTime);
          
          unreadCount = count || 0;
        } else {
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', convId)
            .neq('sender_id', user.id);
          
          unreadCount = unreadMessages?.length || 0;
        }

        const draft = localStorage.getItem(`draft_${convId}`) || null;

        let lastMessagePreview = 'No messages yet';
        if (draft) {
          lastMessagePreview = `Draft: ${draft.length > 25 ? draft.substring(0, 25) + '...' : draft}`;
        } else if (lastMessage) {
          const isYou = lastMessage.sender_id === user.id;
          const prefix = isYou ? 'You: ' : '';
          const content = lastMessage.content || '';
          const truncated = content.length > 30 ? content.substring(0, 30) + '...' : content;
          lastMessagePreview = prefix + truncated;
        }

        return {
          id: convId,
          otherUser: otherUserProfile!,
          lastMessage: lastMessagePreview,
          lastMessageTime: lastMessage?.created_at || null,
          unreadCount: unreadCount || 0,
          draft,
          isFavourite: false,
          is_group: conv.is_group,
          group_name: conv.group_name,
        };
      })
    );

    const validConversations = conversationsData.filter(Boolean) as ConversationWithDetails[];

    const { data: favourites } = await supabase
      .from('favourite_conversations')
      .select('conversation_id')
      .eq('user_id', user.id);

    const favouriteIds = new Set(favourites?.map(f => f.conversation_id) || []);

    validConversations.forEach(conv => {
      conv.isFavourite = favouriteIds.has(conv.id);
    });

    setConversations(validConversations);
    setLoading(false);
  };

  const toggleFavourite = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    if (conv.isFavourite) {
      await supabase
        .from('favourite_conversations')
        .delete()
        .eq('user_id', user!.id)
        .eq('conversation_id', conversationId);
    } else {
      await supabase
        .from('favourite_conversations')
        .insert({
          user_id: user!.id,
          conversation_id: conversationId,
        });
    }

    fetchConversations();
  };

  const filteredConversations = conversations
    .filter((conv) => {
      const searchName = conv.is_group ? conv.group_name : conv.otherUser.username;
      const matchesSearch = searchName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filter === 'unread') return conv.unreadCount > 0;
      if (filter === 'read') return conv.unreadCount === 0;
      if (filter === 'groups') return conv.is_group;
      if (filter === 'favourites') return conv.isFavourite;
      
      return true;
    });

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-[var(--bg-primary)] p-3 sm:p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
            <div className="flex gap-1 sm:gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-[var(--text-primary)] ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => onViewChange('profile')}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
              <button
                onClick={() => onViewChange('settings')}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'read', label: 'Read' },
              { key: 'groups', label: 'Groups' },
              { key: 'favourites', label: 'Favourites' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === tab.key
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg skeleton h-16" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] p-8">
              {filter === 'favourites' ? (
                <>
                  <Star className="w-16 h-16 mb-4 text-[var(--text-secondary)]" />
                  <p className="text-center text-lg font-semibold mb-2">No Favourites Yet</p>
                  <p className="text-center text-sm mb-4">Star conversations to add them to favourites</p>
                </>
              ) : filter === 'groups' ? (
                <>
                  <svg className="w-16 h-16 mb-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-center text-lg font-semibold mb-2">No Groups Yet</p>
                  <p className="text-center text-sm mb-4">Create a group to chat with multiple people</p>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Create Group
                  </button>
                </>
              ) : (
                <>
                  <p className="text-center mb-4">No conversations yet</p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Start a conversation
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="p-2 sm:p-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-all animate-slide-in cursor-pointer ${
                    selectedConversation === conv.id ? 'bg-[var(--bg-secondary)]' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                      {conv.otherUser.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        conv.otherUser.username[0].toUpperCase()
                      )}
                    </div>
                    {conv.otherUser.is_online && !conv.is_group && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--text-primary)] truncate">{conv.is_group ? conv.group_name : conv.otherUser.username}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavourite(conv.id);
                          }}
                          className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                        >
                          <Star 
                            className={`w-4 h-4 ${conv.isFavourite ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--text-secondary)]'}`}
                          />
                        </button>
                        {conv.lastMessageTime && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                          </span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="bg-[var(--accent)] text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm truncate ${conv.draft ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Chat Button - Sticky */}
        <div className="sticky bottom-0 bg-[var(--bg-primary)] p-3 sm:p-4 border-t border-[var(--border)]">
          <button
            onClick={() => setShowNewChat(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onSelectUser={(convId) => {
        setShowNewChat(false);
        onSelectConversation(convId);
        fetchConversations();
      }} />}

      {showLogoutModal && (
        <LogoutModal
          onConfirm={async () => {
            setLoggingOut(true);
            await signOut();
            setLoggingOut(false);
            setShowLogoutModal(false);
          }}
          onCancel={() => setShowLogoutModal(false)}
          loading={loggingOut}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          currentUserId={user!.id}
          onGroupCreated={(convId) => {
            setShowCreateGroup(false);
            fetchConversations();
            onSelectConversation(convId);
          }}
        />
      )}
    </>
  );
}
