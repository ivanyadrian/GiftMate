DECLARE
  v_user_id UUID;
  v_room_code TEXT;
  v_room_id UUID;
  v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_exists BOOLEAN;
  i INT;
BEGIN
  -- 1. Validate authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nem vagy bejelentkezve!';
  END IF;

  -- 2. Generate guaranteed unique 6-character room code with collision check
  LOOP
    v_room_code := '';
    FOR i IN 1..6 LOOP
      v_room_code := v_room_code || substr(v_chars, floor(random() * length(v_chars) + 1)::INT, 1);
    END LOOP;

    -- Check if code already exists in the rooms table
    SELECT EXISTS(SELECT 1 FROM rooms WHERE room_code = v_room_code) INTO v_exists;
    EXIT WHEN NOT v_exists; -- Exit loop only when code is not taken
  END LOOP;

  -- 3. Insert new room record
  INSERT INTO rooms (
    room_name,
    event_type,
    location,
    event_date,
    event_time,
    description,
    has_budget,
    budget_amount,
    currency,
    draw_type,
    draw_date,
    draw_time,
    timezone,
    created_by,
    room_code
  ) VALUES (
    p_room_name,
    p_event_type,
    p_location,
    p_event_date,
    p_event_time,
    p_description,
    p_has_budget,
    p_budget_amount,
    p_currency,
    p_draw_type,
    p_draw_date,
    p_draw_time,
    p_timezone,
    v_user_id,
    v_room_code
  )
  RETURNING id INTO v_room_id;

  -- 4. Add room creator to room_members within the same atomic transaction
  INSERT INTO room_members (room_id, user_id)
  VALUES (v_room_id, v_user_id);

  -- 5. Return newly created room ID
  RETURN v_room_id;
END;
