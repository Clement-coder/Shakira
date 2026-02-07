'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile } from '@/lib/supabase';
import { X, MessageCircle, Calendar, AtSign, Trash2, Ban, Share2, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmModal from './confirm-modal';

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
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(true);
  const [error, setError] = useState('');
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Check if user is already blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!currentUser) return;
      
      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('blocked_user_id', user.id)
        .single();
      
      setIsBlocked(!!data);
      setCheckingBlock(false);
    };
    
    checkBlockStatus();
  }, [currentUser, user.id]);

  const handleDeleteConversation = async () => {
    if (!conversationId) return;
    
    setDeleting(true);
    setError('');
    
    try {
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (deleteError) throw deleteError;
      
      setShowDeleteConfirm(false);
      onClose();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBlockUser = async () => {
    setBlocking(true);
    setError('');
    
    try {
      if (isBlocked) {
        const { error: unblockError } = await supabase
          .from('blocked_users')
          .delete()
          .eq('user_id', currentUser!.id)
          .eq('blocked_user_id', user.id);
        
        if (unblockError) throw unblockError;
        
        setIsBlocked(false);
      } else {
        const { error: blockError } = await supabase
          .from('blocked_users')
          .insert({
            user_id: currentUser!.id,
            blocked_user_id: user.id,
          });
        
        if (blockError) throw blockError;
        
        setIsBlocked(true);
      }
      
      setShowBlockConfirm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update block status');
    } finally {
      setBlocking(false);
    }
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}?profile=${user.id}`;
    
    try {
      await navigator.clipboard.writeText(profileUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      alert(`Share this link: ${profileUrl}`);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-4 sm:px-6 -mt-12 sm:-mt-16 mb-4">
          <div className="relative inline-block">
            <button
              onClick={() => user.avatar_url && setShowFullAvatar(true)}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-3xl sm:text-4xl font-bold border-4 border-[var(--bg-primary)] overflow-hidden relative group"
            >
              {user.avatar_url ? (
                <>
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                </>
              ) : (
                user.username[0].toUpperCase()
              )}
            </button>
            {user.is_online && (
              <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full border-4 border-[var(--bg-primary)]" />
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1">
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

          {shareSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm animate-slide-up">
              Profile link copied to clipboard!
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleShareProfile}
                className="flex-1 py-2.5 sm:py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Share2 className="w-4 h-4" />
                Share Profile
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 sm:py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-sm sm:text-base"
              >
                Close
              </button>
              <button
                onClick={onMessage}
                className="flex-1 py-2.5 sm:py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
            </div>

            {conversationId && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="flex-1 py-2.5 sm:py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Chat
                </button>
                <button
                  onClick={() => setShowBlockConfirm(true)}
                  disabled={blocking || checkingBlock}
                  className={`flex-1 py-2.5 sm:py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base ${
                    isBlocked
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {isBlocked ? 'Unblock User' : 'Block User'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConversation}
        title="Delete Conversation"
        message={`Are you sure you want to delete this conversation with ${user.username}? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
        loading={deleting}
      />

      {/* Block/Unblock Confirmation Modal */}
      <ConfirmModal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleBlockUser}
        title={isBlocked ? 'Unblock User' : 'Block User'}
        message={
          isBlocked
            ? `Unblock ${user.username}? They will be able to message you again.`
            : `Block ${user.username}? They won't be able to message you.`
        }
        confirmText={isBlocked ? 'Unblock' : 'Block'}
        confirmColor={isBlocked ? 'green' : 'orange'}
        loading={blocking}
      />

      {/* Full Size Avatar Modal */}
      {showFullAvatar && user.avatar_url && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60] animate-fade-in"
          onClick={() => setShowFullAvatar(false)}
        >
          <button
            onClick={() => setShowFullAvatar(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={user.avatar_url} 
            alt={user.username}
            className="max-w-full max-h-full object-contain rounded-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}