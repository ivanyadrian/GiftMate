DECLARE
  r RECORD;
  v_scheduled_ts TIMESTAMP WITH TIME ZONE;
  v_member_count INT;
BEGIN
  FOR r IN 
    SELECT * 
    FROM rooms 
    WHERE draw_type = 'auto' 
      AND draw_date IS NOT NULL 
      AND draw_time IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM draws WHERE room_id = rooms.id)
  LOOP
    -- Calculate scheduled timestamp within room's configured timezone
    v_scheduled_ts := (r.draw_date || ' ' || r.draw_time)::TIMESTAMP AT TIME ZONE COALESCE(r.timezone, 'Europe/Budapest');

    -- Trigger draw only if deadline has arrived within the 2-minute processing window
    IF NOW() >= v_scheduled_ts AND NOW() <= (v_scheduled_ts + INTERVAL '2 minutes') THEN
      
      SELECT COUNT(*) INTO v_member_count
      FROM room_members
      WHERE room_id = r.id;

      -- Execute draw only if minimum required participant threshold (>= 2) is met
      IF v_member_count >= 2 THEN
        PERFORM perform_draw(r.id);
      END IF;

    END IF;
  END LOOP;
END;
