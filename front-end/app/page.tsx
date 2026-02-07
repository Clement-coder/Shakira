'use client';

import { useAuth } from '@/lib/auth-context';
import AuthPage from '@/components/auth-page';
import ChatLayout from '@/components/chat-layout';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <ChatLayout /> : <AuthPage />;
}
