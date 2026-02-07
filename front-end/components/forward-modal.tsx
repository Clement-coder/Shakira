'use client';

import { useState, useEffect } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { X, Search } from 'lucide-react';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  currentUserId: string;
}

export default function ForwardModal({ isOpen, onClose, messageContent, currentUserId }: ForwardModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .order('username');
    
    setUsers(data || []);
  };

  const handleForward = async (userId: string) => {
    setForwarding(true);
    
    // Find or create conversation
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    const { data: otherUserConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    const sharedConv = existingConv?.find(c => 
      otherUserConv?.some(o => o.conversation_id === c.conversation_id)
    );

    let conversationId = sharedConv?.conversation_id;

    if (!conversationId) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      conversationId = newConv?.id;

      await supabase.from('conversation_participants').insert([
        { conversation_id: conversationId, user_id: currentUserId },
        { conversation_id: conversationId, user_id: userId },
      ]);
    }

    // Send forwarded message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: messageContent,
      message_type: 'text',
    });

    setForwarding(false);
    onClose();
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Forward Message</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => handleForward(user.id)}
              disabled={forwarding}
              className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.username[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-[var(--text-primary)]">{user.full_name || user.username}</p>
                <p className="text-sm text-[var(--text-secondary)]">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
