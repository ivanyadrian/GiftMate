BEGIN
    DELETE FROM public.draws WHERE room_id = p_room_id;
    DELETE FROM public.room_members WHERE room_id = p_room_id AND is_deleted = TRUE;

    -- Reset room to manual draw mode
    UPDATE public.rooms
    SET draw_type = 'manual',
        draw_date = NULL,
        draw_time = NULL
    WHERE id = p_room_id;

    -- Clean up orphaned ghost profiles with no remaining rooms or draws
    DELETE FROM public.profiles
    WHERE id NOT IN (SELECT id FROM auth.users)
      AND id NOT IN (SELECT user_id FROM public.room_members)
      AND id NOT IN (SELECT drawer_id FROM public.draws)
      AND id NOT IN (SELECT drawn_id FROM public.draws);
END;
