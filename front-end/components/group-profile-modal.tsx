'use client';

import { useState, useEffect } from 'react';
import { supabase, Profile, Conversation } from '@/lib/supabase';
import { X, Users, ShieldCheck } from 'lucide-react';

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
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchParticipants();
  }, [conversation.id]);

  return (
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
          <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold">
            {conversation.group_avatar_url ? (
              <img src={conversation.group_avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              conversation.group_name?.[0].toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{conversation.group_name}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{participants.length} members</p>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-t border-[var(--border)]">
          <h4 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Members
          </h4>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg skeleton h-14" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map(({ profile, is_admin }) => (
                <div key={profile.id} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-secondary)] rounded-lg">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        profile.username[0].toUpperCase()
                      )}
                    </div>
                    {profile.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-[var(--text-secondary)]">@{profile.username}</p>
                  </div>
                  {is_admin && (
                    <div className="flex items-center gap-1 text-xs text-[var(--accent)]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-[var(--border)]">
            <button
                onClick={onClose}
                className="w-full py-2.5 sm:py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-sm sm:text-base"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
}
