'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Message } from '@/lib/supabase';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, Smile, RefreshCw, Check, CheckCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserProfileModal from './user-profile-modal';

// Message Status Icon Component
function MessageStatusIcon({ 
  messageId, 
  conversationId, 
  otherUserId,
  messageTime,
  otherUserOnline
}: { 
  messageId: string; 
  conversationId: string; 
  otherUserId: string;
  messageTime: string;
  otherUserOnline: boolean;
}) {
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    // Check if other user has viewed this message via Supabase
    const checkReadStatus = async () => {
      const { data } = await supabase
        .from('conversation_views')
        .select('last_viewed_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUserId)
        .single();
      
      if (data && data.last_viewed_at) {
        const lastViewedTime = new Date(data.last_viewed_at).getTime();
        const msgTime = new Date(messageTime).getTime();
        
        // Message is read if other user viewed conversation AFTER this message was sent
        if (lastViewedTime > msgTime) {
          setIsRead(true);
        }
      }
    };

    checkReadStatus();
    
    // Check every 3 seconds for read status
    const interval = setInterval(checkReadStatus, 3000);
    return () => clearInterval(interval);
  }, [conversationId, otherUserId, messageTime]);

  // Read (blue double check) - other user opened conversation after message
  if (isRead) {
    return <CheckCheck className="w-3 h-3 text-blue-400" />;
  }
  
  // Delivered (gray double check) - user is online
  if (otherUserOnline) {
    return <CheckCheck className="w-3 h-3 text-white/70" />;
  }
  
  // Sent (single gray check) - user is offline
  return <Check className="w-3 h-3 text-white/70" />;
}

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
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Auto-focus input on mount and when replying
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    fetchOtherUser();
    fetchMessages();
    
    // Mark conversation as viewed in Supabase
    const markAsViewed = async () => {
      await supabase
        .from('conversation_views')
        .upsert({
          conversation_id: conversationId,
          user_id: user!.id,
          last_viewed_at: new Date().toISOString(),
        });
    };
    
    markAsViewed();
    
    // Mark conversation as read - save current timestamp (localStorage backup)
    const lastReadKey = `last_read_${conversationId}_${user!.id}`;
    localStorage.setItem(lastReadKey, new Date().toISOString());
    
    // Load draft from localStorage
    const savedDraft = localStorage.getItem(`draft_${conversationId}`);
    if (savedDraft) {
      setNewMessage(savedDraft);
    }

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, { ...payload.new as Message, reactions: [] }]);
        scrollToBottom();
        const lastReadKey = `last_read_${conversationId}_${user!.id}`;
        localStorage.setItem(lastReadKey, new Date().toISOString());
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      }, () => {
        fetchMessages(); // Refresh when reactions change
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
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    }

    // Fetch reactions separately
    if (data) {
      const messageIds = data.map(m => m.id);
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      // Attach reactions to messages
      const messagesWithReactions = data.map(msg => ({
        ...msg,
        reactions: reactions?.filter(r => r.message_id === msg.id) || []
      }));

      setMessages(messagesWithReactions);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isNearTop = scrollTop < 100;
    setShowScrollButton(!isNearBottom);
    setShowScrollTopButton(!isNearTop && scrollTop > 200);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
    const value = e.target.value;
    setNewMessage(value);

    // Save draft to localStorage
    if (value.trim()) {
      localStorage.setItem(`draft_${conversationId}`, value);
    } else {
      localStorage.removeItem(`draft_${conversationId}`);
    }

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
    
    localStorage.removeItem(`draft_${conversationId}`);

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: messageContent,
      message_type: 'text',
      reply_to_message_id: replyingTo?.id || null,
    });

    setReplyingTo(null);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    await supabase.from('message_reactions').insert({
      message_id: messageId,
      user_id: user!.id,
      reaction: emoji,
    });
    setShowEmojiPicker(null);
    fetchMessages();
  };

  // Link detection and rendering
  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user!.id)
      .eq('reaction', emoji);
    fetchMessages();
  };

  const toggleReaction = async (messageId: string, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
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
        <button
          onClick={() => setShowUserProfile(true)}
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:bg-[var(--bg-secondary)] rounded-lg p-2 -m-2 transition-colors"
        >
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
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-[var(--text-primary)] text-sm sm:text-base truncate">{otherUser.username}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {otherUser.is_online ? 'Online' : `Last seen ${formatDistanceToNow(new Date(otherUser.last_seen), { addSuffix: true })}`}
            </p>
          </div>
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-[var(--text-primary)] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-hide relative"
      >
        {messages.map((msg, idx) => {
          const isSent = msg.sender_id === user!.id;
          const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
          const replyToMsg = msg.reply_to_message_id ? messages.find(m => m.id === msg.reply_to_message_id) : null;

          return (
            <div
              key={msg.id}
              className={`flex gap-2 animate-slide-up group ${isSent ? 'justify-end' : 'justify-start'}`}
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
              {!isSent && !showAvatar && <div className="w-8 sm:w-8" />}
              
              <div className="relative max-w-[75%] sm:max-w-[70%]">
                <div
                  className={`inline-block px-3 sm:px-4 py-2 rounded-2xl ${
                    isSent
                      ? 'bg-[var(--message-sent)] text-white rounded-br-sm'
                      : 'bg-[var(--message-received)] text-[var(--text-primary)] rounded-bl-sm'
                  }`}
                >
                  {replyToMsg && (
                    <div className="mb-2 pb-2 border-l-2 border-white/30 pl-2 text-xs opacity-70">
                      <div className="font-semibold">Replying to</div>
                      <div className="truncate">{replyToMsg.content}</div>
                    </div>
                  )}
                  <p className="break-words">{renderMessageContent(msg.content || '')}</p>
                  
                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {Object.entries(
                        msg.reactions.reduce((acc: any, r: any) => {
                          acc[r.reaction] = acc[r.reaction] || [];
                          acc[r.reaction].push(r.user_id);
                          return acc;
                        }, {})
                      ).map(([emoji, userIds]: [string, any]) => {
                        const hasReacted = userIds.includes(user!.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji, hasReacted)}
                            className={`text-xs px-2 py-0.5 rounded-full transition-all hover:scale-110 ${
                              hasReacted 
                                ? 'bg-[var(--accent)]/30 ring-1 ring-[var(--accent)]' 
                                : 'bg-white/10'
                            }`}
                          >
                            {emoji} {userIds.length}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <p className={`text-xs ${isSent ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                    {isSent && (
                      <MessageStatusIcon 
                        messageId={msg.id}
                        conversationId={conversationId}
                        otherUserId={otherUser.id}
                        messageTime={msg.created_at}
                        otherUserOnline={otherUser.is_online}
                      />
                    )}
                  </div>
                </div>

              {/* Message Actions */}
              <div className={`absolute top-0 ${isSent ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 px-2`}>
                <button
                  onClick={() => setReplyingTo(msg)}
                  className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors shadow-md"
                  title="Reply"
                >
                  <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                  className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors shadow-md"
                  title="React"
                >
                  <Smile className="w-4 h-4 text-[var(--text-primary)]" />
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker === msg.id && (
                <div className={`absolute ${isSent ? 'right-0' : 'left-0'} top-full mt-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-lg p-2 flex gap-1 z-10`}>
                  {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(msg.id, emoji)}
                      className="text-xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
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

      {/* Scroll to Top Button */}
      {showScrollTopButton && (
        <button
          onClick={scrollToTop}
          className="fixed top-20 right-4 sm:right-6 p-3 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] transition-all animate-bounce z-10"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 right-4 sm:right-6 p-3 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] transition-all animate-bounce z-10"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {/* Input - Sticky */}
      <form onSubmit={sendMessage} className="sticky bottom-0 bg-[var(--bg-primary)] border-t border-[var(--border)]">
        {replyingTo && (
          <div className="px-4 py-2 bg-[var(--bg-secondary)] flex items-center justify-between">
            <div className="flex-1 border-l-2 border-[var(--accent)] pl-3">
              <div className="text-xs text-[var(--accent)] font-semibold">Replying to</div>
              <div className="text-sm text-[var(--text-primary)] truncate">{replyingTo.content}</div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-2 sm:p-3 md:p-4 flex items-center gap-1.5 sm:gap-2 relative">
          <button
            type="button"
            onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
          >
            <Smile className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          
          {showInputEmojiPicker && (
            <div className="absolute bottom-full left-2 mb-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-lg p-3 grid grid-cols-6 gap-2 z-10">
              {['😀', '😂', '😍', '🥰', '😎', '🤔', '😊', '👍', '❤️', '🔥', '✨', '🎉', '👏', '🙏', '💯', '✅', '❌', '⭐'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowInputEmojiPicker(false);
                  }}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          
          <input
            ref={inputRef}
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

      {showUserProfile && otherUser && (
        <UserProfileModal
          user={otherUser}
          onClose={() => setShowUserProfile(false)}
          onMessage={() => setShowUserProfile(false)}
          conversationId={conversationId}
          onDelete={onBack}
        />
      )}
    </div>
  );
}
