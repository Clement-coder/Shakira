-- Add blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own blocks" ON blocked_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unblock" ON blocked_users
  FOR DELETE USING (user_id = auth.uid());

-- Index
CREATE INDEX idx_blocked_users ON blocked_users(user_id, blocked_user_id);
