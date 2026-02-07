'use client';

import { LogOut, X } from 'lucide-react';

export default function LogoutModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Logout Confirmation
        </h3>
        <p className="text-[var(--text-secondary)] mb-6">
          Are you sure you want to logout? You'll need to login again to access your messages.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Logout
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
