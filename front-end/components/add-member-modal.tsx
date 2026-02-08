'use client';

import { useState, useEffect } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { X, Search, Check } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onMembersAdded: () => void;
  existingParticipants: string[];
}

export default function AddMemberModal({ isOpen, onClose, conversationId, onMembersAdded, existingParticipants }: AddMemberModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user!.id)
      .order('username');
    
    if (data) {
      const usersToAdd = data.filter(u => !existingParticipants.includes(u.id));
      setUsers(usersToAdd);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleAdd = async () => {
    if (selectedUsers.size === 0) return;

    setAdding(true);

    try {
      const newParticipants = Array.from(selectedUsers).map(userId => ({
        conversation_id: conversationId,
        user_id: userId,
        is_admin: false,
      }));

      await supabase
        .from('conversation_participants')
        .insert(newParticipants);

      const { data: adderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user!.id)
        .single();

      for (const userId of selectedUsers) {
        localStorage.setItem(`newly-added-to-group-${conversationId}`, adderProfile?.username || 'Someone');
        const { data: newMemberProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user!.id,
          content: `${newMemberProfile?.username} was added by ${adderProfile?.username}`,
          message_type: 'text',
        });
      }

      onMembersAdded();
      onClose();
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setAdding(false);
    }
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
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Members</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-4 space-y-4 border-b border-[var(--border)]">
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

          {selectedUsers.size > 0 && (
            <div className="text-sm text-[var(--text-secondary)]">
              {selectedUsers.size} member{selectedUsers.size > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredUsers.map(u => (
            <button
              key={u.id}
              onClick={() => toggleUser(u.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  u.username[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-[var(--text-primary)]">{u.full_name || u.username}</p>
                <p className="text-sm text-[var(--text-secondary)]">@{u.username}</p>
              </div>
              {selectedUsers.has(u.id) && (
                <Check className="w-5 h-5 text-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleAdd}
            disabled={adding || selectedUsers.size === 0}
            className="w-full py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : `Add Members (${selectedUsers.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
