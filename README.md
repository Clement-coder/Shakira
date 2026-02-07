# Shakira Messaging App

A premium, production-ready real-time messaging application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

✅ **Authentication & Users**
- Sign up, login, logout, password reset
- Persistent auth sessions
- Auto-create user profiles

✅ **User Profiles**
- Avatar uploads via Supabase Storage
- Editable username, full name, and bio
- Online/offline presence tracking
- Last-seen status

✅ **Real-time Messaging**
- 1-to-1 conversations
- Real-time message delivery
- Typing indicators
- Message timestamps
- Smooth animations

✅ **Search**
- Search users by username or name
- Start conversations instantly

✅ **Settings**
- Light/dark mode toggle
- Privacy settings (online status, read receipts)
- Notification preferences

✅ **Premium UI/UX**
- Fully responsive (mobile, tablet, desktop)
- Smooth animations and transitions
- Skeleton loaders
- Inline error/success messages
- Modern icon set

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to the SQL Editor
3. Copy the entire contents of `supabase-schema.sql` from the project root
4. Paste it into the SQL Editor and run it
5. Go to Storage and create two buckets:
   - `avatars` (public)
   - `message-files` (public)
6. For each bucket, set the following policies:
   - **SELECT**: Allow public access
   - **INSERT**: Allow authenticated users to upload
   - **UPDATE**: Allow users to update their own files
   - **DELETE**: Allow users to delete their own files

### 2. Environment Variables

Your `.env` file is already configured with:
```
NEXT_PUBLIC_SUPABASE_PROJECT_ID=zdeochldezvbcurngkdn
NEXT_PUBLIC_SUPABASE_URL=https://zdeochldezvbcurngkdn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Install Dependencies

Dependencies are already installed. If you need to reinstall:
```bash
cd front-end
npm install
```

### 4. Run the Development Server

```bash
cd front-end
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
front-end/
├── app/
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Main page with auth routing
│   └── globals.css         # Global styles and animations
├── components/
│   ├── auth-page.tsx       # Authentication UI
│   ├── chat-layout.tsx     # Main chat layout
│   ├── chat-list.tsx       # Conversations list
│   ├── chat-view.tsx       # Individual chat view
│   ├── new-chat-modal.tsx  # User search and chat creation
│   ├── profile-view.tsx    # Profile editing
│   └── settings-view.tsx   # App settings
├── lib/
│   ├── supabase.ts         # Supabase client and types
│   └── auth-context.tsx    # Authentication context
└── .env                    # Environment variables

supabase-schema.sql         # Database schema (paste into Supabase)
```

## Database Schema

The app uses the following tables:
- `profiles` - User profiles with avatar, bio, online status
- `conversations` - Chat conversations
- `conversation_participants` - Links users to conversations
- `messages` - Chat messages
- `message_status` - Delivery and read receipts
- `typing_indicators` - Real-time typing status
- `message_reactions` - Emoji reactions (ready for future use)
- `user_settings` - User preferences

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Key Technologies

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Supabase** - Backend (Auth, Database, Realtime, Storage)
- **Lucide React** - Icon library
- **date-fns** - Date formatting

## Features in Detail

### Real-time Updates
- Messages appear instantly using Supabase Realtime
- Typing indicators show when someone is typing
- Online status updates automatically

### Animations
- Smooth page transitions
- Message bubble animations
- Button press feedback
- Modal animations
- Skeleton loaders

### Responsive Design
- Mobile-first approach
- Adaptive layout for tablets and desktops
- Touch-friendly interface

### Security
- Row Level Security on all tables
- Users can only access their own conversations
- Secure file uploads
- Protected routes

## Usage

1. **Sign Up**: Create an account with email and password
2. **Complete Profile**: Add your avatar, full name, and bio
3. **Find Users**: Click "New Chat" to search for users
4. **Start Chatting**: Select a user to start a conversation
5. **Customize**: Toggle dark mode and adjust privacy settings

## Troubleshooting

### Messages not appearing in real-time
- Check that the Supabase Realtime is enabled in your project settings
- Verify RLS policies are correctly set up

### Avatar upload not working
- Ensure the `avatars` bucket exists in Supabase Storage
- Check that the bucket is set to public
- Verify storage policies allow authenticated uploads

### Can't find other users
- Make sure other users have signed up
- Check that profiles are being created automatically (trigger should handle this)

## Production Deployment

1. Build the app:
```bash
npm run build
```

2. Deploy to Vercel, Netlify, or your preferred hosting platform

3. Set environment variables in your hosting platform

4. Ensure Supabase project is on a production plan for better performance

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
