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
