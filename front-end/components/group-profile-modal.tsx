'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Profile, Conversation, deleteGroup } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { X, Users, ShieldCheck, Camera, Trash2, UserPlus, LogOut, AlertTriangle } from 'lucide-react';
import UserProfileModal from './user-profile-modal';
import ConfirmModal from './confirm-modal';
import AddMemberModal from './add-member-modal';

type ParticipantWithProfile = {
  profile: Profile;
  is_admin: boolean;
};

export default function GroupProfileModal({
  conversation,
  onClose,
}: {
  conversation: Conversation;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userToRemove, setUserToRemove] = useState<ParticipantWithProfile | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentUserIsAdmin = participants.find(p => p.profile.id === user?.id)?.is_admin || false;

  const fetchParticipants = async () => {
    setLoading(true);
    const { data: participantIds } = await supabase
      .from('conversation_participants')
      .select('user_id, is_admin')
      .eq('conversation_id', conversation.id);

    if (participantIds) {
      const userIds = participantIds.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profiles) {
        const participantsWithProfiles = participantIds.map(p => {
          const profile = profiles.find(prof => prof.id === p.user_id);
          return {
            profile: profile!,
            is_admin: p.is_admin,
          };
        }).filter(p => p.profile);
        setParticipants(participantsWithProfiles);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParticipants();
  }, [conversation.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('group-avatars')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading group avatar:', error);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('group-avatars')
      .getPublicUrl(fileName);

    await supabase
      .from('conversations')
      .update({ group_avatar_url: publicUrl })
      .eq('id', conversation.id);

    conversation.group_avatar_url = publicUrl;
    setUploading(false);
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    setRemoving(true);
    await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversation.id)
      .eq('user_id', userToRemove.profile.id);

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user!.id,
      content: `${userToRemove.profile.username} has been removed from the group.`,
      message_type: 'text',
    });

    setRemoving(false);
    setUserToRemove(null);
    fetchParticipants();
  };

  const handleExitGroup = async () => {
    if (!user) return;

    setRemoving(true);
    const { error } = await supabase.rpc('exit_group', { p_user_id: user.id, p_conversation_id: conversation.id });

    if (error) {
      console.error('Error exiting group:', error);
      setRemoving(false);
      return;
    }

    setRemoving(false);
    setShowExitConfirm(false);
    onClose(); // Redirects back to chat list
  };

  const handleDeleteGroup = async () => {
    setRemoving(true);
    try {
      await deleteGroup(conversation.id);
      setRemoving(false);
      setShowDeleteConfirm(false);
      onClose(); // Redirects back to chat list
    } catch (error) {
      console.error('Error deleting group:', error);
      setRemoving(false);
      // Optionally show an error message to the user
    }
  };

  if (selectedUser) {
    return (
      <UserProfileModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onMessage={() => {
          setSelectedUser(null);
          onClose();
        }}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Group Info</h2>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Group Info */}
          <div className="p-4 sm:p-6 flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold">
                {conversation.group_avatar_url ? (
                  <img src={conversation.group_avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  conversation.group_name?.[0].toUpperCase()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1 bg-gray-700 rounded-full hover:bg-gray-600"
                disabled={uploading}
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{conversation.group_name}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{participants.length} members</p>
            </div>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-t border-[var(--border)]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members
              </h4>
              {currentUserIsAdmin && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </button>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg skeleton h-14" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.profile.id}
                    className="w-full flex items-center gap-3 p-2 hover:bg-[var(--bg-secondary)] rounded-lg"
                  >
                    <button onClick={() => setSelectedUser(p.profile)} className="flex items-center gap-3 text-left flex-1">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                          {p.profile.avatar_url ? (
                            <img src={p.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            p.profile.username[0].toUpperCase()
                          )}
                        </div>
                        {p.profile.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{p.profile.full_name || p.profile.username}</p>
                        <p className="text-sm text-[var(--text-secondary)]">@{p.profile.username}</p>
                      </div>
                    </button>
                    {p.is_admin && (
                      <div className="flex items-center gap-1 text-xs text-[var(--accent)]">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin</span>
                      </div>
                    )}
                    {currentUserIsAdmin && !p.is_admin && (
                      <button
                        onClick={() => setUserToRemove(p)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[var(--border)]">
            {currentUserIsAdmin && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 sm:py-3 bg-red-700 text-white font-medium rounded-lg hover:bg-red-800 transition-colors text-sm sm:text-base flex items-center justify-center gap-2 mb-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            )}
            <button
              onClick={() => setShowExitConfirm(true)}
              className="w-full py-2.5 sm:py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Exit Group
            </button>
          </div>
        </div>
      </div>
      {userToRemove && (
        <ConfirmModal
          isOpen={!!userToRemove}
          onClose={() => setUserToRemove(null)}
          onConfirm={handleRemoveUser}
          title="Remove User"
          message={`Are you sure you want to remove ${userToRemove.profile.username} from the group?`}
          confirmText="Remove"
          confirmColor="red"
          loading={removing}
        />
      )}
      {showAddMemberModal && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          conversationId={conversation.id}
          existingParticipants={participants.map(p => p.profile.id)}
          onMembersAdded={() => {
            fetchParticipants();
            setShowAddMemberModal(false);
          }}
        />
      )}
      {showExitConfirm && (
        <ConfirmModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onConfirm={handleExitGroup}
          title="Exit Group"
          message={`Are you sure you want to exit "${conversation.group_name}"? You will be removed from this group.`}
          confirmText="Exit"
          confirmColor="red"
          loading={removing}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteGroup}
          title="Delete Group"
          message={`Are you sure you want to permanently delete "${conversation.group_name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmColor="red"
          loading={removing}
        />
      )}
    </>
  );
}
