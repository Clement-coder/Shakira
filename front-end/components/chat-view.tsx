'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Message } from '@/lib/supabase';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, Smile, RefreshCw, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatView({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    fetchOtherUser();
    fetchMessages();

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`,
      }, handleTypingChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchOtherUser = async () => {
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user!.id)
      .single();

    if (participant) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', participant.user_id)
        .single();

      setOtherUser(profile);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTypingChange = async (payload: any) => {
    if (payload.new.user_id !== user!.id) {
      setIsTyping(payload.new.is_typing);
    }
  };

  const updateTypingStatus = async (typing: boolean) => {
    await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: user!.id,
        is_typing: typing,
        updated_at: new Date().toISOString(),
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    updateTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    updateTypingStatus(false);

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: messageContent,
      message_type: 'text',
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading || !otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)] p-3 sm:p-4 border-b border-[var(--border)] flex items-center gap-2 sm:gap-3">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 sm:p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold relative flex-shrink-0">
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            otherUser.username[0].toUpperCase()
          )}
          {otherUser.is_online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] text-sm sm:text-base truncate">{otherUser.username}</p>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {otherUser.is_online ? 'Online' : `Last seen ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true })}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-[var(--text-primary)] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-hide">
        {messages.map((msg, idx) => {
          const isSent = msg.sender_id === user!.id;
          const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;

          return (
            <div
              key={msg.id}
              className={`flex gap-2 animate-slide-up ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              {!isSent && showAvatar && (
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {otherUser.avatar_url ? (
                    <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    otherUser.username[0].toUpperCase()
                  )}
                </div>
              )}
              {!isSent && !showAvatar && <div className="w-8" />}
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  isSent
                    ? 'bg-[var(--message-sent)] text-white rounded-br-sm'
                    : 'bg-[var(--message-received)] text-[var(--text-primary)] rounded-bl-sm'
                }`}
              >
                <p className="break-words">{msg.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                  <p className={`text-xs ${isSent ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                  {isSent && (
                    <div className="flex items-center">
                      {otherUser.is_online ? (
                        <CheckCheck className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Check className="w-3 h-3 text-white/70" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-2 items-center animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-semibold">
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                otherUser.username[0].toUpperCase()
              )}
            </div>
            <div className="bg-[var(--message-received)] px-4 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-2 sm:p-3 md:p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full text-[var(--text-primary)] text-sm sm:text-base focus:border-[var(--accent)] transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 sm:p-2.5 md:p-3 bg-[var(--accent)] text-white rounded-full hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
