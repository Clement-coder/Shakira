-- Add is_admin column to profiles table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add group related columns to conversations table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='is_group') THEN
    ALTER TABLE conversations ADD COLUMN is_group BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='group_name') THEN
    ALTER TABLE conversations ADD COLUMN group_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='group_avatar_url') THEN
    ALTER TABLE conversations ADD COLUMN group_avatar_url TEXT;
  END IF;
END $$;

-- Function to delete a group by an admin
CREATE OR REPLACE FUNCTION public.delete_group_by_admin(group_id UUID)
RETURNS VOID AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT is_admin INTO _is_admin FROM public.profiles WHERE id = auth.uid();

  IF _is_admin THEN
    -- Delete the conversation (group)
    DELETE FROM public.conversations WHERE id = group_id AND is_group = TRUE;
  ELSE
    RAISE EXCEPTION 'Only admins can delete groups.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;