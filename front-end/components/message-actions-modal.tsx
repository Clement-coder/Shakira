'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageSquareText, Copy, Share2, Smile } from 'lucide-react';

interface MessageActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  messageId: string;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onReact: () => void;
  copySuccess: boolean;
}

export default function MessageActionsModal({
  isOpen,
  onClose,
  messageContent,
  messageId,
  onReply,
  onCopy,
  onForward,
  onReact,
  copySuccess,
}: MessageActionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    } else {
      document.removeEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4 z-[100] animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-[var(--bg-primary)] rounded-t-2xl w-full max-w-md flex flex-col animate-slide-up-from-bottom"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing modal
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Message Actions</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Original Message:</p>
          <p className="text-base text-[var(--text-primary)] line-clamp-3">{messageContent}</p>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => { onReply(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-base text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <MessageSquareText className="w-5 h-5" />
            Reply
          </button>
          <button
            onClick={() => { onCopy(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-base text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            {copySuccess ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <Copy className="w-5 h-5" />
            )}
            Copy
          </button>
          <button
            onClick={() => { onForward(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-base text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Forward
          </button>
          <button
            onClick={() => { onReact(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-base text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
          >
            <Smile className="w-5 h-5" />
            React
          </button>
        </div>
      </div>
    </div>
  );
}
