-- COMPLETE FIX: Remove all recursive policies (handles existing policies)

-- Fix conversations table
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON conversations;

CREATE POLICY "Users can view all conversations" ON conversations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

-- Fix conversation_participants table
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can delete participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view all participants" ON conversation_participants;
DROP POLICY IF EXISTS "Anyone can add participants" ON conversation_participants;

CREATE POLICY "Users can view all participants" ON conversation_participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can add participants" ON conversation_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete participants" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid());
