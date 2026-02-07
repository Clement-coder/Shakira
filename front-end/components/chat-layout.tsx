'use client';

import { useState } from 'react';
import ChatList from './chat-list';
import ChatView from './chat-view';
import ProfileView from './profile-view';
import SettingsView from './settings-view';

export default function ChatLayout() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [view, setView] = useState<'chats' | 'profile' | 'settings'>('chats');

  return (
    <div className="h-screen flex bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-[var(--border)]`}>
        <ChatList
          onSelectConversation={setSelectedConversation}
          selectedConversation={selectedConversation}
          onViewChange={setView}
          currentView={view}
        />
      </div>

      {/* Main Content */}
      <div className={`${selectedConversation || view !== 'chats' ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {view === 'profile' && <ProfileView onBack={() => setView('chats')} />}
        {view === 'settings' && <SettingsView onBack={() => setView('chats')} />}
        {view === 'chats' && selectedConversation && (
          <ChatView
            conversationId={selectedConversation}
            onBack={() => setSelectedConversation(null)}
          />
        )}
        {view === 'chats' && !selectedConversation && (
          <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
