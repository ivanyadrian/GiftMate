CREATE OR REPLACE FUNCTION public.get_my_rooms()
RETURNS TABLE (
    room_id UUID,
    room_name TEXT,
    room_code TEXT,
    event_type TEXT,
    location TEXT,
    event_date DATE,
    event_time TIME,
    description TEXT,
    has_budget BOOLEAN,
    budget_amount NUMERIC,
    currency TEXT,
    draw_type TEXT,
    draw_date DATE,
    draw_time TIME,
    member_count BIGINT,
    is_drawn BOOLEAN,
    is_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
BEGIN
    IF curr_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        r.id AS room_id,
        r.room_name,
        r.room_code,
        r.event_type,
        r.location,
        r.event_date,
        r.event_time,
        r.description,
        r.has_budget,
        r.budget_amount,
        r.currency,
        r.draw_type,
        r.draw_date,
        r.draw_time,
        COUNT(all_members.user_id)::BIGINT AS member_count,
        EXISTS(SELECT 1 FROM public.draws d WHERE d.room_id = r.id) AS is_drawn,
        (r.created_by = curr_user_id) AS is_owner
    FROM public.room_members my_rm
    JOIN public.rooms r ON r.id = my_rm.room_id
    LEFT JOIN public.room_members all_members ON all_members.room_id = r.id
    WHERE my_rm.user_id = curr_user_id
    GROUP BY r.id, my_rm.joined_at
    ORDER BY my_rm.joined_at ASC;
END;
$$;

