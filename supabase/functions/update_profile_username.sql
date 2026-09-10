DECLARE
  v_user_id UUID := auth.uid();
  v_cleaned_name TEXT := TRIM(p_new_username);
  v_conflicting_room_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nem vagy bejelentkezve!';
  END IF;

  IF v_cleaned_name IS NULL OR LENGTH(v_cleaned_name) < 2 THEN
    RAISE EXCEPTION 'A névnek legalább 2 karakterből kell állnia!';
  END IF;

  IF LENGTH(v_cleaned_name) > 20 THEN
    RAISE EXCEPTION 'A név legfeljebb 20 karakter lehet!';
  END IF;

  -- Inspect all rooms that the user is currently a member of:
  -- Verify there are no duplicate display names among co-members
  SELECT r.room_name INTO v_conflicting_room_name
  FROM room_members my_rm
  JOIN room_members other_rm ON other_rm.room_id = my_rm.room_id AND other_rm.user_id != v_user_id
  JOIN profiles other_p ON other_p.id = other_rm.user_id
  JOIN rooms r ON r.id = my_rm.room_id
  WHERE my_rm.user_id = v_user_id
    AND LOWER(TRIM(other_p.username)) = LOWER(v_cleaned_name)
  LIMIT 1;

  IF v_conflicting_room_name IS NOT NULL THEN
    RAISE EXCEPTION 'A(z) "%" nevű szobádban már van egy "%" nevű tag! Kérlek válassz másik nevet.', v_conflicting_room_name, v_cleaned_name;
  END IF;

  -- If unique across all co-membered rooms, commit the new username
  UPDATE profiles
  SET username = v_cleaned_name
  WHERE id = v_user_id;
END;
