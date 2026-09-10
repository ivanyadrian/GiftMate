CREATE OR REPLACE FUNCTION public.leave_room(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Prevent leaving the protected demo room (U1J1TN)
    IF EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND room_code = 'U1J1TN') THEN
        RAISE EXCEPTION 'A bemutató (demó) szobát nem lehet elhagyni!';
    END IF;

    -- Verify caller is a member of the room
    IF NOT EXISTS (
        SELECT 1 FROM public.room_members
        WHERE room_id = p_room_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Nem vagy tagja ennek a szobának!';
    END IF;

    -- Verify room owner is not attempting to leave (they must delete the room instead)
    IF EXISTS (
        SELECT 1 FROM public.rooms
        WHERE id = p_room_id AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'A szoba tulajdonosa nem hagyhatja el a szobát!';
    END IF;

    -- Verify draw has not occurred yet
    IF EXISTS (
        SELECT 1 FROM public.draws
        WHERE room_id = p_room_id
    ) THEN
        RAISE EXCEPTION 'Nem lehet elhagyni a szobát, miután már történt sorsolás!';
    END IF;

    -- Remove membership
    DELETE FROM public.room_members
    WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$;
