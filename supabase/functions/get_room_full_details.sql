CREATE OR REPLACE FUNCTION public.get_room_full_details(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
    v_room public.rooms%ROWTYPE;
    v_has_draw BOOLEAN;
    v_members JSONB;
    v_my_draw JSONB := NULL;
BEGIN
    IF curr_user_id IS NULL THEN
        RAISE EXCEPTION 'Nem vagy bejelentkezve!';
    END IF;

    IF p_room_id IS NULL THEN
        RAISE EXCEPTION 'A szoba azonosítója kötelező!';
    END IF;

    -- 1. Fetch room metadata
    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 2. Check if a draw has already occurred in the room
    SELECT EXISTS (SELECT 1 FROM public.draws WHERE room_id = p_room_id) INTO v_has_draw;

    -- 3. Fetch member roster (aggregating profile and draw status)
    SELECT
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', rm.user_id,
                    'joined_at', rm.joined_at,
                    'is_me', (rm.user_id = curr_user_id),
                    'is_owner', (rm.user_id = v_room.created_by),
                    'is_deleted', COALESCE(rm.is_deleted, FALSE),
                    'has_viewed_draw', COALESCE(d.is_revealed, FALSE),
                    'draw_exists', v_has_draw,
                    'username', COALESCE(p.username, 'Névtelen játékos'),
                    'avatar_url', CASE
                        WHEN COALESCE(rm.is_deleted, FALSE) = TRUE THEN '/deleted_user.webp'
                        ELSE p.avatar_url
                    END
                ) ORDER BY rm.joined_at ASC
            ),
            '[]'::jsonb
        ) INTO v_members
    FROM public.room_members rm
    LEFT JOIN public.profiles p ON p.id = rm.user_id
    LEFT JOIN public.draws d ON d.room_id = p_room_id AND d.drawer_id = rm.user_id
    WHERE rm.room_id = p_room_id;

    -- 4. Fetch current user's assigned partner (if draw exists)
    SELECT
        jsonb_build_object(
            'draw_id', d.id,
            'drawn_id', d.drawn_id,
            'username', COALESCE(p.username, 'Névtelen játékos'),
            'avatar_url', CASE
                WHEN COALESCE(rm.is_deleted, FALSE) = TRUE THEN '/deleted_user.webp'
                ELSE p.avatar_url
            END,
            'is_revealed', COALESCE(d.is_revealed, FALSE),
            'is_deleted', COALESCE(rm.is_deleted, FALSE)
        ) INTO v_my_draw
    FROM public.draws d
    LEFT JOIN public.profiles p ON p.id = d.drawn_id
    LEFT JOIN public.room_members rm ON rm.room_id = p_room_id AND rm.user_id = d.drawn_id
    WHERE d.room_id = p_room_id
      AND d.drawer_id = curr_user_id;

    -- 5. Return consolidated JSONB object for single-roundtrip hydration
    RETURN jsonb_build_object(
        'room', to_jsonb(v_room),
        'members', v_members,
        'my_draw', v_my_draw
    );
END;
$$;
