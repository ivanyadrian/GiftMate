DECLARE
    curr_user_id UUID := auth.uid();
    room_owner_id UUID;
    has_draws BOOLEAN;
BEGIN
    SELECT created_by INTO room_owner_id FROM rooms WHERE id = p_room_id;
    SELECT EXISTS (SELECT 1 FROM draws WHERE room_id = p_room_id) INTO has_draws;

    RETURN QUERY
    SELECT
        rm.user_id,
        rm.joined_at,
        (rm.user_id = curr_user_id) AS is_me,
        (rm.user_id = room_owner_id) AS is_owner,
        COALESCE(rm.is_deleted, FALSE) AS is_deleted,
        COALESCE(d.is_revealed, FALSE) AS has_viewed_draw,
        has_draws AS draw_exists,
        COALESCE(p.username, 'Névtelen játékos') AS username,
        CASE
            WHEN COALESCE(rm.is_deleted, FALSE) = TRUE THEN '/deleted_user.webp'
            ELSE p.avatar_url
        END AS avatar_url
    FROM room_members rm
    LEFT JOIN profiles p ON p.id = rm.user_id
    LEFT JOIN draws d ON d.room_id = p_room_id AND d.drawer_id = rm.user_id
    WHERE rm.room_id = p_room_id
    ORDER BY rm.joined_at ASC;
END;
