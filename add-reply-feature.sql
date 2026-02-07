-- Add reply_to_message_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);

-- Update message_reactions table - change emoji to reaction if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='message_reactions' AND column_name='emoji') THEN
    ALTER TABLE message_reactions RENAME COLUMN emoji TO reaction;
  END IF;
END $$;

-- Enable read receipts tracking (already exists in conversation_views table)
-- Just ensure the table exists
CREATE TABLE IF NOT EXISTS conversation_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on conversation_views
ALTER TABLE conversation_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_views
DROP POLICY IF EXISTS "Users can view their own conversation views" ON conversation_views;
CREATE POLICY "Users can view their own conversation views"
  ON conversation_views FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own conversation views" ON conversation_views;
CREATE POLICY "Users can insert their own conversation views"
  ON conversation_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own conversation views" ON conversation_views;
CREATE POLICY "Users can update their own conversation views"
  ON conversation_views FOR UPDATE
  USING (user_id = auth.uid());

-- Function to update user's last_seen and is_online status
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    last_seen = NOW(),
    is_online = true
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update activity when user sends a message
DROP TRIGGER IF EXISTS update_activity_on_message ON messages;
CREATE TRIGGER update_activity_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity();

