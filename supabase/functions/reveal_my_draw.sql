DECLARE
    curr_user_id UUID := auth.uid();
BEGIN
    UPDATE draws
    SET is_revealed = TRUE
    WHERE room_id = p_room_id AND drawer_id = curr_user_id;
END;
