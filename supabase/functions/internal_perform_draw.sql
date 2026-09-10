DECLARE
    member_ids UUID[];
    shuffled_ids UUID[];
    i INT;
    n INT;
BEGIN
    -- Verify that draw has not already occurred in this room
    IF EXISTS (SELECT 1 FROM public.draws WHERE room_id = p_room_id) THEN
        RAISE EXCEPTION 'Ebben a szobában már történt sorsolás!';
    END IF;

    -- Fetch all current members in the room
    SELECT array_agg(user_id) INTO member_ids
    FROM public.room_members
    WHERE room_id = p_room_id;
    
    n := array_length(member_ids, 1);
    
    IF n IS NULL OR n < 2 THEN
        RAISE EXCEPTION 'A sorsoláshoz legalább 2 résztvevő szükséges!';
    END IF;

    -- Shuffle participants randomly
    SELECT array_agg(user_id ORDER BY random()) INTO shuffled_ids
    FROM unnest(member_ids) AS user_id;
    
    -- Pair participants in a guaranteed cycle/derangement (nobody draws themselves)
    FOR i IN 1..n LOOP
        INSERT INTO public.draws (room_id, drawer_id, drawn_id)
        VALUES (
            p_room_id,
            shuffled_ids[i],
            shuffled_ids[CASE WHEN i = n THEN 1 ELSE i + 1 END]
        );
    END LOOP;
END;
