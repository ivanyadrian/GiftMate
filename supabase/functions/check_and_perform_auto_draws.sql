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
    v_scheduled_ts := (r.draw_date || ' ' || r.draw_time)::TIMESTAMP AT TIME ZONE COALESCE(r.timezone, 'Europe/Budapest');

    -- As soon as the scheduled time is reached and at least 2 members are present, the draw runs immediately:
    IF NOW() >= v_scheduled_ts THEN
      SELECT COUNT(*) INTO v_member_count
      FROM room_members
      WHERE room_id = r.id;

      IF v_member_count >= 2 THEN
        PERFORM perform_draw(r.id);
      END IF;
    END IF;
  END LOOP;
END;
