-- Add read receipts tracking table
CREATE TABLE IF NOT EXISTS conversation_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE conversation_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all conversation views" ON conversation_views
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own view time" ON conversation_views
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their view time" ON conversation_views
  FOR UPDATE USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_conversation_views ON conversation_views(conversation_id, user_id);
