CREATE OR REPLACE FUNCTION public.kick_room_member(
  p_room_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_owner BOOLEAN;
  v_room_code TEXT;
  v_draw_count INT;
BEGIN
  -- 1. Validate required parameter
  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hiányzó felhasználó azonosító!');
  END IF;

  -- 2. Validate room and check for protected demo room (U1J1TN)
  SELECT (created_by = v_caller_id), room_code INTO v_is_owner, v_room_code
  FROM public.rooms
  WHERE id = p_room_id;

  IF v_room_code = 'U1J1TN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A bemutató (demó) szoba tagjait nem lehet eltávolítani!');
  END IF;

  -- 3. Authorization check: only organizer can remove participants
  IF v_is_owner IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Csak a szoba szervezője távolíthat el tagokat!');
  END IF;

  -- 4. Prevent organizer from kicking themselves
  IF v_caller_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'A szervező saját magát nem távolíthatja el!');
  END IF;

  -- 5. Post-draw immutability guard
  SELECT count(*) INTO v_draw_count FROM public.draws WHERE room_id = p_room_id;
  IF v_draw_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sorsolás után nem távolítható el tag!');
  END IF;

  -- 6. Remove participant from room_members
  DELETE FROM public.room_members 
  WHERE room_id = p_room_id AND user_id = p_target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
