'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, MessageSquareText, Copy, Share2, Smile } from 'lucide-react';

interface MessageActionsDropdownProps {
  messageId: string;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onReact: () => void;
}

export default function MessageActionsDropdown({
  messageId,
  onReply,
  onCopy,
  onForward,
  onReact,
}: MessageActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors shadow-md"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4 text-[var(--text-primary)]" />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-1 w-36 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-lg z-20 animate-scale-in origin-top-right"
        >
          <button
            onClick={() => handleActionClick(onReply)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-t-lg"
          >
            <MessageSquareText className="w-4 h-4" /> Reply
          </button>
          <button
            onClick={() => handleActionClick(onCopy)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={() => handleActionClick(onForward)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            <Share2 className="w-4 h-4" /> Forward
          </button>
          <button
            onClick={() => handleActionClick(onReact)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-b-lg"
          >
            <Smile className="w-4 h-4" /> React
          </button>
        </div>
      )}
    </div>
  );
}
