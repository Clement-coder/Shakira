-- Add favourites table
CREATE TABLE IF NOT EXISTS favourite_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE favourite_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own favourites" ON favourite_conversations;
CREATE POLICY "Users can view their own favourites"
  ON favourite_conversations FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can add their own favourites" ON favourite_conversations;
CREATE POLICY "Users can add their own favourites"
  ON favourite_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove their own favourites" ON favourite_conversations;
CREATE POLICY "Users can remove their own favourites"
  ON favourite_conversations FOR DELETE
  USING (user_id = auth.uid());

-- Add index
CREATE INDEX IF NOT EXISTS idx_favourite_conversations_user ON favourite_conversations(user_id);

-- Add group chat support
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS group_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add admin role to conversation_participants
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

