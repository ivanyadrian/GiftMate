BEGIN
  RETURN EXISTS(SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = auth.uid());
END;
