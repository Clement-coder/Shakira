'use client';

import { Profile } from '@/lib/supabase';
import { X, MessageCircle, Calendar, AtSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfileModal({
  user,
  onClose,
  onMessage,
}: {
  user: Profile;
  onClose: () => void;
  onMessage: () => void;
}) {
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

          {/* Actions */}
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
        </div>
      </div>
    </div>
  );
}