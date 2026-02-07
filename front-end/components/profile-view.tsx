'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Camera, Save } from 'lucide-react';

export default function ProfileView({ onBack }: { onBack: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      await refreshProfile();
      setSuccess('Avatar updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
          bio,
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Edit Profile</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-4xl font-semibold overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile.username[0].toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-[var(--accent)] text-white rounded-full cursor-pointer hover:bg-[var(--accent-hover)] transition-colors">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-sm text-[var(--text-secondary)]">Uploading...</p>}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm animate-slide-up">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm animate-slide-up">
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
