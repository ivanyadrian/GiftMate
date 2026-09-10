DECLARE
    shuffled_ids UUID[];
    n INT;
    i INT;
    j INT;
    tmp UUID;
BEGIN
    -- 1. Purge previous ghost members and existing draw records
    DELETE FROM room_members WHERE room_id = p_room_id AND is_deleted = TRUE;
    DELETE FROM draws WHERE room_id = p_room_id;

    -- 2. Fetch active participants
    SELECT ARRAY_AGG(user_id) INTO shuffled_ids
    FROM room_members
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
        INSERT INTO draws (room_id, drawer_id, drawn_id, is_revealed)
        VALUES (
            p_room_id,
            shuffled_ids[i],
            shuffled_ids[(i % n) + 1],
            FALSE
        );
    END LOOP;
END;
