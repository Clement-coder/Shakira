'use client';

import { useState, useEffect } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { X, Search, Check } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onGroupCreated: (conversationId: string) => void;
}

export default function CreateGroupModal({ isOpen, onClose, currentUserId, onGroupCreated }: CreateGroupModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

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

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.size === 0) return;

    setCreating(true);

    try {
      // Create conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group: true,
          group_name: groupName.trim(),
          created_by: currentUserId,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (including creator)
      const participants = [
        { conversation_id: newConv.id, user_id: currentUserId, is_admin: true },
        ...Array.from(selectedUsers).map(userId => ({
          conversation_id: newConv.id,
          user_id: userId,
          is_admin: false,
        })),
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();

      // Create notifications for new members
      const notifications = Array.from(selectedUsers).map(userId => ({
        user_id: userId,
        conversation_id: newConv.id,
        message: `You were added by ${creatorProfile?.username || 'Someone'}`,
      }));
      await supabase.from('group_notifications').insert(notifications);

      // Send system message
      await supabase.from('messages').insert({
        conversation_id: newConv.id,
        sender_id: currentUserId,
        content: `Group "${groupName}" was created by ${creatorProfile?.username}`,
        message_type: 'text',
      });

      onGroupCreated(newConv.id);
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
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
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Create Group</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-4 space-y-4 border-b border-[var(--border)]">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors"
          />

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
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => toggleUser(user.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
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
              {selectedUsers.has(user.id) && (
                <Check className="w-5 h-5 text-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedUsers.size === 0}
            className="w-full py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : `Create Group (${selectedUsers.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
