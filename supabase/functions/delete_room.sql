CREATE OR REPLACE FUNCTION public.delete_room(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
  v_room_code TEXT;
  v_has_draw BOOLEAN;
BEGIN
  -- 1. Validate room existence and fetch organizer ID and room code
  SELECT created_by, room_code INTO v_creator_id, v_room_code
  FROM public.rooms
  WHERE id = p_room_id;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'A szoba nem található.';
  END IF;

  -- 2. Prevent deleting the protected demo room (U1J1TN)
  IF v_room_code = 'U1J1TN' THEN
    RAISE EXCEPTION 'A bemutató (demó) szobát nem lehet törölni!';
  END IF;

  -- 3. Authorization check: only organizer can delete the room
  IF v_creator_id != v_user_id THEN
    RAISE EXCEPTION 'Nincs jogosultságod törölni ezt a szobát!';
  END IF;

  -- 4. Verify that draw has not occurred yet
  SELECT EXISTS (
    SELECT 1 FROM public.draws WHERE room_id = p_room_id
  ) INTO v_has_draw;

  IF v_has_draw THEN
    RAISE EXCEPTION 'A szoba nem törölhető, mert a sorsolás már lezajlott!';
  END IF;

  -- 5. Delete associated memberships and room itself
  DELETE FROM public.room_members WHERE room_id = p_room_id;
  DELETE FROM public.rooms WHERE id = p_room_id;

  -- 6. Clean up orphaned profiles with no remaining rooms or draws
  DELETE FROM public.profiles
  WHERE id NOT IN (SELECT id FROM auth.users)
    AND id NOT IN (SELECT user_id FROM public.room_members)
    AND id NOT IN (SELECT drawer_id FROM public.draws)
    AND id NOT IN (SELECT drawn_id FROM public.draws);
END;
$$;
