CREATE OR REPLACE FUNCTION public.join_room_by_code(p_room_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_room_id UUID;
  v_has_drawn BOOLEAN;
  v_my_username TEXT;
  v_existing_user_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'A csatlakozáshoz be kell jelentkezned!';
  END IF;

  -- Locate room by normalized room code
  SELECT id INTO v_room_id
  FROM public.rooms
  WHERE room_code = UPPER(TRIM(p_room_code));

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Nem található szoba ezzel a kóddal!';
  END IF;

  -- Prevent joining the protected demo room (U1J1TN)
  IF UPPER(TRIM(p_room_code)) = 'U1J1TN' THEN
    RAISE EXCEPTION 'A bemutató (demó) szobához új tagok nem csatlakozhatnak!';
  END IF;

  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.room_members WHERE room_id = v_room_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Már csatlakoztál ehhez a szobához!';
  END IF;

  -- Verify room has not performed its draw yet
  SELECT EXISTS (SELECT 1 FROM public.draws WHERE room_id = v_room_id) INTO v_has_drawn;
  IF v_has_drawn THEN
    RAISE EXCEPTION 'A sorsolás már megtörtént ebben a szobában, ezért nem csatlakozhatsz!';
  END IF;

  -- Check for duplicate display name collision within the room
  SELECT username INTO v_my_username
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_my_username IS NOT NULL AND TRIM(v_my_username) != '' THEN
    SELECT COUNT(*) INTO v_existing_user_count
    FROM public.room_members rm
    JOIN public.profiles p ON p.id = rm.user_id
    WHERE rm.room_id = v_room_id
      AND LOWER(TRIM(p.username)) = LOWER(TRIM(v_my_username));

    IF v_existing_user_count > 0 THEN
      RAISE EXCEPTION 'A szobában már létezik egy "%" nevű résztvevő! Kérlek válassz másik nevet a profilodban a csatlakozáshoz.', v_my_username;
    END IF;
  END IF;

  -- Add user to room
  INSERT INTO public.room_members (room_id, user_id, joined_at)
  VALUES (v_room_id, v_user_id, NOW());

  RETURN v_room_id;
END;
$$;
