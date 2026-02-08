'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Message, Conversation } from '@/lib/supabase';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, Smile, RefreshCw, Check, CheckCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserProfileModal from './user-profile-modal';
import ForwardModal from './forward-modal';
import GroupProfileModal from './group-profile-modal';
import MessageActionsDropdown from './message-actions-dropdown';

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
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [linkPreview, setLinkPreview] = useState<{ url: string; title: string; image?: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Profile[]>([]);

  // Auto-focus input on mount and when replying
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('group_notifications')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user!.id)
      .eq('is_read', false);
    
    if (data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    fetchConversation();
    fetchMessages();
    fetchNotifications();
    
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_notifications',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conv) {
      setConversation(conv);
      if (!conv.is_group) {
        fetchOtherUser();
      } else {
        fetchParticipants();
      }
    }
  };

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

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('conversation_participants')
      .select('profiles(*)')
      .eq('conversation_id', conversationId);

    if (data) {
      setParticipants(data.map((p: any) => p.profiles));
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

    // Detect and preview links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = value.match(urlRegex);
    
    if (urls && urls.length > 0 && !loadingPreview) {
      fetchLinkPreview(urls[0]);
    } else if (!urls) {
      setLinkPreview(null);
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
    const previewData = linkPreview;
    
    setNewMessage('');
    setLinkPreview(null);
    updateTypingStatus(false);
    
    localStorage.removeItem(`draft_${conversationId}`);

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: messageContent,
        message_type: 'text',
        reply_to_message_id: replyingTo?.id || null,
        link_preview: previewData ? JSON.stringify(previewData) : null,
      });

      if (error) {
        console.error('Error sending message:', error);
        // Restore message on error
        setNewMessage(messageContent);
        setLinkPreview(previewData);
      } else {
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(messageContent);
      setLinkPreview(previewData);
    }
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

  const fetchLinkPreview = async (url: string) => {
    setLoadingPreview(true);
    try {
      // Simple preview - extract domain and create basic preview
      const urlObj = new URL(url);
      setLinkPreview({
        url: url,
        title: urlObj.hostname,
        image: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`
      });
    } catch (error) {
      console.error('Error fetching link preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(messageId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const forwardMessage = (message: Message) => {
    setForwardingMessage(message);
    setShowForwardModal(true);
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

  const handleHeaderClick = () => {
    if (conversation?.is_group) {
      setShowGroupProfile(true);
    } else {
      setShowUserProfile(true);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    await supabase
      .from('group_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  if (loading || (!otherUser && !conversation?.is_group)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const headerText = conversation?.is_group ? conversation.group_name : otherUser?.username;
  const subHeaderText = conversation?.is_group ? 'Group chat' : (otherUser?.is_online ? 'Online' : `Last seen ${formatDistanceToNow(new Date(otherUser?.last_seen || 0), { addSuffix: true })}`);

  return (
    <div className="flex flex-col h-full">
      {notifications.map(notification => (
        <div key={notification.id} className="bg-blue-500 text-white text-sm text-center p-2 relative">
          {notification.message}
          <button onClick={() => dismissNotification(notification.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)] p-3 sm:p-4 border-b border-[var(--border)] flex items-center gap-2 sm:gap-3">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 sm:p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <button
          onClick={handleHeaderClick}
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:bg-[var(--bg-secondary)] rounded-lg p-2 -m-2 transition-colors"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-semibold relative flex-shrink-0">
            {conversation?.is_group ? (
              conversation.group_avatar_url ? (
                <img src={conversation.group_avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                conversation.group_name?.[0].toUpperCase()
              )
            ) : (
              otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                headerText?.[0].toUpperCase()
              )
            )}
            {otherUser?.is_online && !conversation?.is_group && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-[var(--text-primary)] text-sm sm:text-base truncate">{headerText}</p>
            {conversation?.is_group && participants.length > 0 ? (
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {participants.slice(0, 2).map(p => p.username).join(', ')}
                {participants.length > 2 && ` and ${participants.length - 2} others`}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {subHeaderText}
              </p>
            )}
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
          const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id || (messages[idx - 1].sender_id === msg.sender_id && conversation?.is_group && messages[idx - 1].sender_id !== messages[idx].sender_id);
          const replyToMsg = msg.reply_to_message_id ? messages.find(m => m.id === msg.reply_to_message_id) : null;
          const senderProfile = conversation?.is_group ? participants.find(p => p.id === msg.sender_id) : otherUser;

          return (
            <div
              key={msg.id}
              className={`flex gap-2 animate-slide-up group ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              {!isSent && showAvatar && (
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {senderProfile?.avatar_url ? (
                    <img src={senderProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    senderProfile?.username?.[0].toUpperCase()
                  )}
                </div>
              )}
              {!isSent && !showAvatar && <div className="w-8 sm:w-8" />}
              
              <div className="relative max-w-[75%] sm:max-w-[70%]">
                {conversation?.is_group && !isSent && showAvatar && (
                  <p className="text-xs text-[var(--text-secondary)] mb-1 ml-3 font-semibold">
                    {senderProfile?.username}
                  </p>
                )}
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
                  
                  {/* Link Preview */}
                  {msg.link_preview && (() => {
                    try {
                      const preview = JSON.parse(msg.link_preview);
                      return (
                        <a
                          href={preview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-2 border border-white/20 rounded-lg overflow-hidden hover:border-white/40 transition-colors max-w-[200px]"
                        >
                          {preview.image && (
                            <img src={preview.image} alt="" className="w-full h-20 object-cover" />
                          )}
                          <div className="p-2 bg-black/10">
                            <div className="font-semibold text-sm truncate">{preview.title}</div>
                            <div className="text-xs opacity-70 truncate">{preview.url}</div>
                          </div>
                        </a>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                  
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
                    {isSent && !conversation?.is_group && otherUser && (
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
              {/* Visible on small screens */}
              <div className={`absolute top-0 ${isSent ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} sm:hidden opacity-0 group-hover:opacity-100 transition-opacity gap-1 px-2`}>
                <MessageActionsDropdown
                  onReply={() => setReplyingTo(msg)}
                  onCopy={() => copyMessage(msg.content || '', msg.id)}
                  onForward={() => forwardMessage(msg)}
                  onReact={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                  copySuccess={copySuccess === msg.id}
                />
              </div>
              {/* Visible on medium and larger screens */}
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
                  onClick={() => copyMessage(msg.content || '', msg.id)}
                  className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors shadow-md"
                  title="Copy"
                >
                  {copySuccess === msg.id ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => forwardMessage(msg)}
                  className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors shadow-md"
                  title="Forward"
                >
                  <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
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
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                otherUser?.username[0].toUpperCase()
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
      <form onSubmit={sendMessage} className="sticky bottom-0 bg-[var(--bg-primary)] border-t border-[var(--border)] message-input-form">
        {linkPreview && (
          <div className="px-4 py-2 bg-[var(--bg-secondary)] flex items-center gap-3">
            {linkPreview.image && (
              <img src={linkPreview.image} alt="" className="w-12 h-12 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--accent)] font-semibold">Link Preview</div>
              <div className="text-sm text-[var(--text-primary)] truncate">{linkPreview.title}</div>
              <div className="text-xs text-[var(--text-secondary)] truncate">{linkPreview.url}</div>
            </div>
            <button
              type="button"
              onClick={() => setLinkPreview(null)}
              className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
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

      {showGroupProfile && conversation && (
        <GroupProfileModal
          conversation={conversation}
          onClose={() => setShowGroupProfile(false)}
        />
      )}

      {showForwardModal && forwardingMessage && (
        <ForwardModal
          isOpen={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setForwardingMessage(null);
          }}
          messageContent={forwardingMessage.content || ''}
          currentUserId={user!.id}
        />
      )}
    </div>
  );
}
