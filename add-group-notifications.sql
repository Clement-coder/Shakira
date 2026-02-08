-- Add group notifications table
CREATE TABLE IF NOT EXISTS group_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE group_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON group_notifications;
CREATE POLICY "Users can view their own notifications" ON group_notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert notifications for others in their groups" ON group_notifications;
CREATE POLICY "Users can insert notifications for others in their groups" ON group_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = group_notifications.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON group_notifications;
CREATE POLICY "Users can mark their own notifications as read" ON group_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Add index
CREATE INDEX IF NOT EXISTS idx_group_notifications_user_conv ON group_notifications(user_id, conversation_id);
