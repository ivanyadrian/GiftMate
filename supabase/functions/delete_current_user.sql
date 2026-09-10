CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    curr_user_id UUID := auth.uid();
    v_is_in_active_draw BOOLEAN;
BEGIN
    IF curr_user_id IS NULL THEN
        RAISE EXCEPTION 'Nincs bejelentkezett felhasználó!';
    END IF;

    -- Prevent deleting the shared public demo account
    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = curr_user_id AND LOWER(email) = 'demo@giftmate.app'
    ) THEN
        RAISE EXCEPTION 'A nyilvános demó fiók nem törölhető!';
    END IF;

    -- 1. Verify if user is an organizer in any room with an active draw
    IF EXISTS (
        SELECT 1
        FROM public.rooms r
        INNER JOIN public.draws d ON d.room_id = r.id
        WHERE r.created_by = curr_user_id
    ) THEN
        RAISE EXCEPTION 'Nem törölheted a fiókodat, mert szervezője vagy legalább egy olyan szobának, ahol a sorsolás már lezajlott!';
    END IF;

    -- 2. Check if user is an invited member in any active draw
    SELECT EXISTS (
        SELECT 1 FROM public.draws
        WHERE drawer_id = curr_user_id OR drawn_id = curr_user_id
    ) INTO v_is_in_active_draw;

    -- 3. Delete rooms created by the user where draw hasn't happened yet, along with room members
    DELETE FROM public.room_members
    WHERE room_id IN (SELECT id FROM public.rooms WHERE created_by = curr_user_id);

    DELETE FROM public.rooms WHERE created_by = curr_user_id;

    -- 4. Delete memberships immediately from rooms where no draw has occurred yet
    DELETE FROM public.room_members
    WHERE user_id = curr_user_id
      AND room_id NOT IN (SELECT DISTINCT room_id FROM public.draws);

    -- 5. Handle profile and ghost membership for active draws
    IF v_is_in_active_draw THEN
        -- Convert user to ghost member (is_deleted = true) in drawn rooms to preserve pairing chain
        UPDATE public.room_members
        SET is_deleted = TRUE
        WHERE user_id = curr_user_id
          AND room_id IN (SELECT DISTINCT room_id FROM public.draws);

        -- Update avatar to placeholder (username is preserved for reveal results)
        UPDATE public.profiles
        SET avatar_url = '/deleted_user.webp'
        WHERE id = curr_user_id;
    ELSE
        -- If user is not part of any draw, remove completely from profiles table
        DELETE FROM public.profiles WHERE id = curr_user_id;
    END IF;

    -- 6. Delete authentication record (prevents further logins)
    DELETE FROM auth.users WHERE id = curr_user_id;

    -- 7. Clean up any orphaned ghost profiles
    DELETE FROM public.profiles
    WHERE id NOT IN (SELECT id FROM auth.users)
      AND id NOT IN (SELECT user_id FROM public.room_members)
      AND id NOT IN (SELECT drawer_id FROM public.draws)
      AND id NOT IN (SELECT drawn_id FROM public.draws);
END;
$$;
