'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { X, MessageCircle, Calendar, AtSign, Trash2, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfileModal({
  user,
  onClose,
  onMessage,
  conversationId,
}: {
  user: Profile;
  onClose: () => void;
  onMessage: () => void;
  conversationId?: string;
}) {
  const { user: currentUser } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteConversation = async () => {
    if (!conversationId || !confirm('Delete this conversation? This cannot be undone.')) return;
    
    setDeleting(true);
    setError('');
    
    try {
      // Delete conversation (cascade will delete messages and participants)
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (deleteError) throw deleteError;
      
      onClose();
      window.location.reload(); // Refresh to update list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!confirm(`Block ${user.username}? They won't be able to message you.`)) return;
    
    setBlocking(true);
    setError('');
    
    try {
      // Create blocked_users table entry (you'll need to create this table)
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          user_id: currentUser!.id,
          blocked_user_id: user.id,
        });
      
      if (blockError) throw blockError;
      
      alert(`${user.username} has been blocked`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to block user');
    } finally {
      setBlocking(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-6 -mt-16 mb-4">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-4xl font-bold border-4 border-[var(--bg-primary)] overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>
            {user.is_online && (
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-[var(--bg-primary)]" />
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 pb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            {user.full_name || user.username}
          </h2>
          
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-4">
            <AtSign className="w-4 h-4" />
            <span className="text-sm">@{user.username}</span>
          </div>

          {user.bio && (
            <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
              <p className="text-[var(--text-primary)] text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-6">
            <Calendar className="w-4 h-4" />
            <span>
              {user.is_online 
                ? 'Online now' 
                : `Last seen ${formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}`
              }
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Close
              </button>
              <button
                onClick={onMessage}
                className="flex-1 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>

            {conversationId && (
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteConversation}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete Chat'}
                </button>
                <button
                  onClick={handleBlockUser}
                  disabled={blocking}
                  className="flex-1 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  {blocking ? 'Blocking...' : 'Block User'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}