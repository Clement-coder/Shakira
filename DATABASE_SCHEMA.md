# Database Schema Overview

## Tables Structure

### 1. profiles
User profile information
- `id` (UUID, PK) - References auth.users
- `username` (TEXT, UNIQUE) - User's unique username
- `full_name` (TEXT) - User's full name
- `bio` (TEXT) - User biography
- `avatar_url` (TEXT) - URL to avatar image
- `is_online` (BOOLEAN) - Current online status
- `last_seen` (TIMESTAMPTZ) - Last activity timestamp
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 2. conversations
Chat conversation containers
- `id` (UUID, PK)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 3. conversation_participants
Links users to conversations (many-to-many)
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `user_id` (UUID, FK → profiles)
- `joined_at` (TIMESTAMPTZ)
- UNIQUE(conversation_id, user_id)

### 4. messages
Chat messages
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `sender_id` (UUID, FK → profiles)
- `content` (TEXT) - Message text
- `message_type` (TEXT) - 'text', 'image', or 'file'
- `file_url` (TEXT) - URL for file/image messages
- `file_name` (TEXT) - Original filename
- `created_at` (TIMESTAMPTZ)

### 5. message_status
Message delivery and read receipts
- `id` (UUID, PK)
- `message_id` (UUID, FK → messages)
- `user_id` (UUID, FK → profiles)
- `is_delivered` (BOOLEAN)
- `is_read` (BOOLEAN)
- `delivered_at` (TIMESTAMPTZ)
- `read_at` (TIMESTAMPTZ)
- UNIQUE(message_id, user_id)

### 6. typing_indicators
Real-time typing status
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `user_id` (UUID, FK → profiles)
- `is_typing` (BOOLEAN)
- `updated_at` (TIMESTAMPTZ)
- UNIQUE(conversation_id, user_id)

### 7. message_reactions
Emoji reactions to messages
- `id` (UUID, PK)
- `message_id` (UUID, FK → messages)
- `user_id` (UUID, FK → profiles)
- `emoji` (TEXT)
- `created_at` (TIMESTAMPTZ)
- UNIQUE(message_id, user_id, emoji)

### 8. user_settings
User preferences
- `id` (UUID, PK) - References auth.users
- `theme` (TEXT) - 'light' or 'dark'
- `notifications_enabled` (BOOLEAN)
- `show_online_status` (BOOLEAN)
- `show_read_receipts` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (1:1)
    ↓
    ├── conversation_participants (1:many)
    │       ↓
    │   conversations (many:1)
    │       ↓
    │   messages (1:many)
    │       ↓
    │       ├── message_status (1:many)
    │       └── message_reactions (1:many)
    │
    ├── messages (sender, 1:many)
    ├── typing_indicators (1:many)
    └── user_settings (1:1)
```

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:

1. **profiles**: Everyone can view, users can only update their own
2. **conversations**: Users can only see conversations they're part of
3. **messages**: Users can only see messages in their conversations
4. **message_status**: Users can only see/update their own status
5. **typing_indicators**: Users can only see indicators in their conversations
6. **message_reactions**: Users can only see reactions in their conversations
7. **user_settings**: Users can only see/update their own settings

## Triggers

### handle_new_user()
Automatically creates profile and settings when a new user signs up via Supabase Auth.

### update_updated_at_column()
Automatically updates the `updated_at` timestamp on:
- profiles
- conversations
- user_settings

## Indexes

Performance indexes on:
- `profiles.username`
- `conversation_participants.user_id`
- `conversation_participants.conversation_id`
- `messages.conversation_id, created_at DESC`
- `messages.sender_id`
- `message_status.message_id`
- `typing_indicators.conversation_id`

## Storage Buckets

### avatars (public)
- User profile pictures
- Public read access
- Authenticated write access

### message-files (public)
- File attachments in messages
- Public read access
- Authenticated write access

## Real-time Subscriptions

The app subscribes to:
1. **messages** table - New messages in conversations
2. **typing_indicators** table - Typing status updates
3. **conversation_participants** table - New conversations
4. **profiles** table - Online status changes

## Data Flow Example

### Sending a Message
1. User types message in chat-view.tsx
2. Insert into `messages` table
3. Supabase Realtime broadcasts to all subscribers
4. Other user's chat-view receives update
5. Message appears instantly with animation

### Starting a Conversation
1. User searches for another user in new-chat-modal.tsx
2. Check if conversation already exists
3. If not, create new `conversation` record
4. Insert two `conversation_participants` records
5. Redirect to new conversation
6. Both users can now send messages

### Online Status
1. User logs in via auth-context.tsx
2. Update `profiles.is_online = true`
3. Set interval to update `last_seen` every 30 seconds
4. On logout, set `is_online = false`
5. Other users see real-time status updates
