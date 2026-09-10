CREATE OR REPLACE FUNCTION public.prevent_google_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Prevent email modification for public demo account and Google OAuth users
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF LOWER(OLD.email) = 'demo@giftmate.app' THEN
      RAISE EXCEPTION 'A nyilvános demó fiók e-mail címe nem módosítható!';
    END IF;

    -- Check if providers JSON array contains 'google' using the '@>' containment operator
    IF OLD.raw_app_meta_data->'providers' @> '"google"' THEN
      RAISE EXCEPTION 'A Google fiókkal rendelkező felhasználók nem módosíthatják az e-mail címüket.';
    END IF;
  END IF;

  -- 2. Prevent password modification for public demo account
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    IF LOWER(OLD.email) = 'demo@giftmate.app' THEN
      RAISE EXCEPTION 'A nyilvános demó fiók jelszava nem módosítható!';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
