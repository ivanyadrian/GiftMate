CREATE OR REPLACE FUNCTION public.perform_draw(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    shuffled_ids UUID[];
    n INT;
    i INT;
    j INT;
    tmp UUID;
BEGIN
    -- 1. Purge kicked / deleted participants and previous draw records for this room
    DELETE FROM public.room_members WHERE room_id = p_room_id AND is_deleted = TRUE;
    DELETE FROM public.draws WHERE room_id = p_room_id;

    -- 2. Fetch all active participants
    SELECT ARRAY_AGG(user_id) INTO shuffled_ids
    FROM public.room_members
    WHERE room_id = p_room_id AND (is_deleted IS NULL OR is_deleted = FALSE);

    n := cardinality(shuffled_ids);
    IF n IS NULL OR n < 2 THEN
        RAISE EXCEPTION 'A sorsoláshoz legalább 2 aktív résztvevő szükséges!';
    END IF;

    -- 3. In-place Fisher-Yates shuffle algorithm
    FOR i IN REVERSE n..2 LOOP
        j := floor(random() * i + 1)::INT;
        tmp := shuffled_ids[i];
        shuffled_ids[i] := shuffled_ids[j];
        shuffled_ids[j] := tmp;
    END LOOP;

    -- 4. Create pairing derangement in a single cyclic permutation (nobody draws themselves)
    FOR i IN 1..n LOOP
        INSERT INTO public.draws (room_id, drawer_id, drawn_id, is_revealed)
        VALUES (
            p_room_id,
            shuffled_ids[i],
            shuffled_ids[(i % n) + 1],
            FALSE
        );
    END LOOP;

    -- 5. Dispatch automated email notifications in background via Brevo REST API and pg_net
    PERFORM public.send_draw_notifications(p_room_id, auth.uid());
END;
$$;
