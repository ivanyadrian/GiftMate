
DECLARE
    curr_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        d.id AS draw_id,
        d.drawn_id,
        COALESCE(p.username, 'Névtelen játékos') AS username,
        CASE
            WHEN COALESCE(rm.is_deleted, FALSE) = TRUE THEN '/deleted_user.webp'
            ELSE p.avatar_url
        END AS avatar_url,
        COALESCE(d.is_revealed, FALSE) AS is_revealed,
        COALESCE(rm.is_deleted, FALSE) AS is_deleted
    FROM draws d
    LEFT JOIN profiles p ON p.id = d.drawn_id
    LEFT JOIN room_members rm ON rm.room_id = p_room_id AND rm.user_id = d.drawn_id
    WHERE d.room_id = p_room_id
      AND d.drawer_id = curr_user_id;
END;
