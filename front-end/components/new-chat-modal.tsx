'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { X, Search } from 'lucide-react';

export default function NewChatModal({
  onClose,
  onSelectUser,
}: {
  onClose: () => void;
  onSelectUser: (conversationId: string) => void;
}) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    const query = supabase
      .from('profiles')
      .select('*')
      .neq('id', user!.id)
      .limit(20);

    if (searchQuery) {
      query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
    }

    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  };

  const createConversation = async (otherUserId: string) => {
    // Check if conversation already exists
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user!.id);

    if (existingParticipants) {
      for (const participant of existingParticipants) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', participant.conversation_id)
          .eq('user_id', otherUserId)
          .single();

        if (otherParticipant) {
          onSelectUser(participant.conversation_id);
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (newConversation) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConversation.id, user_id: user!.id },
        { conversation_id: newConversation.id, user_id: otherUserId },
      ]);

      onSelectUser(newConversation.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">New Chat</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 skeleton rounded-lg" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--text-secondary)]">
              No users found
            </div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => createConversation(u.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      u.username[0].toUpperCase()
                    )}
                  </div>
                  {u.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[var(--text-primary)]">{u.username}</p>
                  {u.full_name && (
                    <p className="text-sm text-[var(--text-secondary)]">{u.full_name}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
