'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { Search, Plus, User, Settings, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NewChatModal from './new-chat-modal';

type ConversationWithDetails = {
  id: string;
  otherUser: Profile;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
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

    const conversationsData = await Promise.all(
      conversationIds.map(async (convId) => {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId)
          .neq('user_id', user.id)
          .single();

        if (!otherParticipant) return null;

        const { data: otherUserProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherParticipant.user_id)
          .single();

        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: convId,
          otherUser: otherUserProfile!,
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.created_at || null,
          unreadCount: 0,
        };
      })
    );

    setConversations(conversationsData.filter(Boolean) as ConversationWithDetails[]);
    setLoading(false);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
            <div className="flex gap-1 sm:gap-2">
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
                onClick={signOut}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
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
              <p className="text-center mb-4">No conversations yet</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <div className="p-2 sm:p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-all animate-slide-in ${
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
                    {conv.otherUser.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[var(--text-primary)]">{conv.otherUser.username}</p>
                      {conv.lastMessageTime && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-3 sm:p-4 border-t border-[var(--border)]">
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
    </>
  );
}
