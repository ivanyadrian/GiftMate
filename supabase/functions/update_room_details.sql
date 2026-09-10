CREATE OR REPLACE FUNCTION public.update_room_details(
    p_room_id UUID,
    p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_room public.rooms%ROWTYPE;
    v_has_draw BOOLEAN;
    v_room_name TEXT;
    v_budget_amount NUMERIC;
    v_updated_room public.rooms%ROWTYPE;
BEGIN
    -- 1. Validate authenticated session
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nem vagy bejelentkezve!';
    END IF;

    IF p_room_id IS NULL THEN
        RAISE EXCEPTION 'A szoba azonosítója kötelező!';
    END IF;

    -- 2. Validate room existence and ownership
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A szoba nem található!';
    END IF;

    IF v_room.created_by != v_user_id THEN
        RAISE EXCEPTION 'Csak a szoba szervezője módosíthatja a szoba adatait!';
    END IF;

    -- 3. Check if draw has already taken place in this room
    SELECT EXISTS (
        SELECT 1 FROM public.draws WHERE room_id = p_room_id
    ) INTO v_has_draw;

    -- Lock draw configuration permanently once pairings are active
    IF v_has_draw THEN
        IF (p_updates ? 'draw_type' AND (p_updates->>'draw_type') IS DISTINCT FROM v_room.draw_type) OR
           (p_updates ? 'draw_date' AND NULLIF(p_updates->>'draw_date', '')::DATE IS DISTINCT FROM v_room.draw_date) OR
           (p_updates ? 'draw_time' AND NULLIF(p_updates->>'draw_time', '')::TIME IS DISTINCT FROM v_room.draw_time) OR
           (p_updates ? 'timezone' AND (p_updates->>'timezone') IS DISTINCT FROM v_room.timezone) THEN
            RAISE EXCEPTION 'A sorsolási beállítások nem módosíthatók, mert a sorsolás már lezajlott!';
        END IF;
    END IF;

    -- 4. Validate room_name constraints if provided
    IF p_updates ? 'room_name' THEN
        v_room_name := TRIM(p_updates->>'room_name');
        IF v_room_name IS NULL OR v_room_name = '' THEN
            RAISE EXCEPTION 'A szoba neve nem lehet üres!';
        END IF;
        IF LENGTH(v_room_name) > 40 THEN
            RAISE EXCEPTION 'A szoba neve legfeljebb 40 karakter lehet!';
        END IF;
    END IF;

    -- 5. Validate budget constraints if provided
    IF p_updates ? 'budget_amount' AND NULLIF(p_updates->>'budget_amount', '') IS NOT NULL THEN
        v_budget_amount := (NULLIF(p_updates->>'budget_amount', ''))::NUMERIC;
        IF v_budget_amount <= 0 THEN
            RAISE EXCEPTION 'A költségkeret csak pozitív szám lehet!';
        END IF;
        IF v_budget_amount > 9999999 THEN
            RAISE EXCEPTION 'A költségkeret összege legfeljebb 7 számjegy lehet!';
        END IF;
    END IF;

    -- 6. Validate automated draw schedule against future timestamp
    IF NOT v_has_draw THEN
        DECLARE
            v_next_draw_type TEXT := CASE WHEN p_updates ? 'draw_type' THEN (p_updates->>'draw_type') ELSE v_room.draw_type END;
            v_next_draw_date DATE := CASE WHEN p_updates ? 'draw_date' THEN NULLIF(p_updates->>'draw_date', '')::DATE ELSE v_room.draw_date END;
            v_next_draw_time TIME := CASE WHEN p_updates ? 'draw_time' THEN NULLIF(p_updates->>'draw_time', '')::TIME ELSE v_room.draw_time END;
            v_next_tz TEXT := CASE WHEN p_updates ? 'timezone' THEN NULLIF(p_updates->>'timezone', '') ELSE COALESCE(v_room.timezone, 'Europe/Budapest') END;
        BEGIN
            IF v_next_draw_type = 'auto' AND (p_updates ? 'draw_date' OR p_updates ? 'draw_time' OR p_updates ? 'draw_type') THEN
                IF v_next_draw_date IS NULL OR v_next_draw_time IS NULL THEN
                    RAISE EXCEPTION 'Automatikus sorsoláshoz a dátum és az időpont megadása kötelező!';
                END IF;
                BEGIN
                    IF (v_next_draw_date + v_next_draw_time) AT TIME ZONE COALESCE(v_next_tz, 'Europe/Budapest') <= NOW() THEN
                        RAISE EXCEPTION 'A megadott sorsolási időpont a kiválasztott időzónában már elmúlt!';
                    END IF;
                EXCEPTION
                    WHEN invalid_parameter_value THEN
                        NULL; -- Gracefully fall back if client submits unrecognized timezone
                END;
            END IF;
        END;
    END IF;

    -- 7. Execute atomic update
    UPDATE public.rooms
    SET
        room_name = CASE 
            WHEN p_updates ? 'room_name' THEN TRIM(p_updates->>'room_name') 
            ELSE room_name 
        END,
        event_type = CASE 
            WHEN p_updates ? 'event_type' THEN NULLIF(TRIM(p_updates->>'event_type'), '') 
            ELSE event_type 
        END,
        location = CASE 
            WHEN p_updates ? 'location' THEN NULLIF(TRIM(p_updates->>'location'), '') 
            ELSE location 
        END,
        event_date = CASE 
            WHEN p_updates ? 'event_date' THEN NULLIF(p_updates->>'event_date', '')::DATE 
            ELSE event_date 
        END,
        event_time = CASE 
            WHEN p_updates ? 'event_time' THEN NULLIF(p_updates->>'event_time', '')::TIME 
            ELSE event_time 
        END,
        description = CASE 
            WHEN p_updates ? 'description' THEN NULLIF(TRIM(p_updates->>'description'), '') 
            ELSE description 
        END,
        has_budget = CASE 
            WHEN p_updates ? 'has_budget' THEN (p_updates->>'has_budget')::BOOLEAN 
            ELSE has_budget 
        END,
        budget_amount = CASE 
            WHEN p_updates ? 'has_budget' AND NOT (p_updates->>'has_budget')::BOOLEAN THEN NULL
            WHEN p_updates ? 'budget_amount' THEN NULLIF(p_updates->>'budget_amount', '')::NUMERIC 
            ELSE budget_amount 
        END,
        currency = CASE 
            WHEN p_updates ? 'has_budget' AND NOT (p_updates->>'has_budget')::BOOLEAN THEN NULL
            WHEN p_updates ? 'currency' THEN NULLIF(TRIM(p_updates->>'currency'), '') 
            ELSE currency 
        END,
        draw_type = CASE 
            WHEN v_has_draw THEN draw_type 
            WHEN p_updates ? 'draw_type' THEN (p_updates->>'draw_type') 
            ELSE draw_type 
        END,
        draw_date = CASE 
            WHEN v_has_draw THEN draw_date 
            WHEN p_updates ? 'draw_type' AND (p_updates->>'draw_type') = 'manual' THEN NULL
            WHEN p_updates ? 'draw_date' THEN NULLIF(p_updates->>'draw_date', '')::DATE 
            ELSE draw_date 
        END,
        draw_time = CASE 
            WHEN v_has_draw THEN draw_time 
            WHEN p_updates ? 'draw_type' AND (p_updates->>'draw_type') = 'manual' THEN NULL
            WHEN p_updates ? 'draw_time' THEN NULLIF(p_updates->>'draw_time', '')::TIME 
            ELSE draw_time 
        END,
        timezone = CASE 
            WHEN v_has_draw THEN timezone 
            WHEN p_updates ? 'timezone' THEN NULLIF(TRIM(p_updates->>'timezone'), '') 
            ELSE timezone 
        END
    WHERE id = p_room_id
    RETURNING * INTO v_updated_room;

    -- Return updated room record as JSONB
    RETURN to_jsonb(v_updated_room);
END;
$$;
