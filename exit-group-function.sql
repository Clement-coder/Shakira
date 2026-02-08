-- Function to allow a user to exit a group
CREATE OR REPLACE FUNCTION exit_group(p_user_id UUID, p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_username TEXT;
    v_group_name TEXT;
BEGIN
    -- Get the username of the user exiting
    SELECT username INTO v_username FROM profiles WHERE id = p_user_id;

    -- Get the group name
    SELECT group_name INTO v_group_name FROM conversations WHERE id = p_conversation_id;

    -- Delete the participant from the conversation
    DELETE FROM conversation_participants
    WHERE user_id = p_user_id AND conversation_id = p_conversation_id;

    -- Insert a system message into the messages table
    INSERT INTO messages (conversation_id, sender_id, content, message_type)
    VALUES (p_conversation_id, p_user_id, v_username || ' has left the group ' || v_group_name || '.', 'text');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION exit_group(UUID, UUID) TO authenticated;