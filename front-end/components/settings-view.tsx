'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, UserSettings } from '@/lib/supabase';
import { ArrowLeft, Moon, Sun, Bell, Eye, Check } from 'lucide-react';

export default function SettingsView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setSettings(data);
      document.documentElement.classList.toggle('dark', data.theme === 'dark');
    }
    setLoading(false);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user || !settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    await supabase
      .from('user_settings')
      .update({ [key]: value })
      .eq('id', user.id);

    if (key === 'theme') {
      document.documentElement.classList.toggle('dark', value === 'dark');
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Appearance */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Appearance</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-[var(--text-primary)]" />
                ) : (
                  <Sun className="w-5 h-5 text-[var(--text-primary)]" />
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Theme</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.theme === 'dark' ? 'bg-[var(--accent)]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Privacy</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[var(--text-primary)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Online Status</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Show when you're online
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('show_online_status', !settings.show_online_status)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.show_online_status ? 'bg-[var(--accent)]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.show_online_status ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[var(--text-primary)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Read Receipts</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Show when you've read messages
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('show_read_receipts', !settings.show_read_receipts)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.show_read_receipts ? 'bg-[var(--accent)]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.show_read_receipts ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Notifications</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[var(--text-primary)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Push Notifications</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Receive notifications for new messages
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateSetting('notifications_enabled', !settings.notifications_enabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  settings.notifications_enabled ? 'bg-[var(--accent)]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.notifications_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
