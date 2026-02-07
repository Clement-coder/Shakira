import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'file';
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

export type MessageStatus = {
  id: string;
  message_id: string;
  user_id: string;
  is_delivered: boolean;
  is_read: boolean;
  delivered_at: string | null;
  read_at: string | null;
};

export type UserSettings = {
  id: string;
  theme: 'light' | 'dark';
  notifications_enabled: boolean;
  show_online_status: boolean;
  show_read_receipts: boolean;
  created_at: string;
  updated_at: string;
};
