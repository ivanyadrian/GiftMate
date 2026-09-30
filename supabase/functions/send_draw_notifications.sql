CREATE OR REPLACE FUNCTION public.send_draw_notifications(
  p_room_id UUID,
  p_manual_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec RECORD;
  v_brevo_api_key TEXT;
  v_sender_email TEXT;
  v_app_url TEXT := 'https://giftmate-app.vercel.app';
  v_html TEXT;
  v_subject TEXT;
BEGIN
  -- 1. Fetch Brevo API credentials and sender email from secure app_secrets table
  SELECT value INTO v_brevo_api_key 
  FROM public.app_secrets 
  WHERE key = 'brevo_api_key';

  SELECT value INTO v_sender_email 
  FROM public.app_secrets 
  WHERE key = 'brevo_sender_email';

  -- Default fallback sender email if not explicitly specified
  IF v_sender_email IS NULL OR TRIM(v_sender_email) = '' THEN
    v_sender_email := 'giftmate.noreply@gmail.com';
  END IF;

  -- Exit gracefully without throwing exceptions if API key is unconfigured
  IF v_brevo_api_key IS NULL OR TRIM(v_brevo_api_key) = '' THEN
    RAISE NOTICE 'Brevo API key is not configured in public.app_secrets.';
    RETURN;
  END IF;

  -- 2. Iterate through all eligible recipients retrieved by helper function
  FOR v_rec IN 
    SELECT * FROM public.get_draw_notification_recipients(p_room_id, p_manual_user_id)
  LOOP
    -- Clean, universal subject line independent of room name length
    v_subject := 'Megtörtént a sorsolás! 🎁 - GiftMate';
    
    -- Construct branded, responsive GiftMate HTML email template
    v_html := '<!DOCTYPE html>' ||
      '<html><head><meta charset="utf-8">' ||
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' ||
      '</head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif;">' ||
      '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 35px 15px;">' ||
      '<tr><td align="center">' ||
      '<table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">' ||
      '<tr><td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 30px; text-align: center;">' ||
      '<h1 style="color: #ffffff; margin: 0; font-size: 34px; font-weight: 800; letter-spacing: -0.5px;">GiftMate</h1>' ||
      '<h2 style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 20px; font-weight: 500;">Megtörtént a sorsolás!</h2>' ||
      '</td></tr>' ||
      '<tr><td style="padding: 36px 30px;">' ||
      '<p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">' ||
      'Szia <strong>' || v_rec.username || '</strong>!' ||
      '</p>' ||
      '<p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">' ||
      'Örömmel értesítünk, hogy az alábbi szobában sikeresen lezajlott a sorsolás. Ideje megtudni, hogy kit ajándékozol meg!' ||
      '</p>' ||
      '<div style="background-color: #f1f5f9; border-radius: 14px; padding: 16px 20px; margin-bottom: 28px;">' ||
      '<p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; text-align: center;">Szoba neve</p>' ||
      '<p style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0; text-align: left; word-break: break-word;">' || v_rec.room_name || '</p>' ||
      '</div>' ||
      '<div style="text-align: center; margin-bottom: 28px;">' ||
      '<a href="' || v_app_url || '/room/' || p_room_id || '" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);">Ajándékozottam felfedése</a>' ||
      '</div>' ||
      '<p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0 0 6px 0; text-align: center;">' ||
      'Ezt az emailt azért kaptad, mert tagja vagy a szobának, és engedélyezted az értesítéseket a profilodban.' ||
      '</p>' ||
      '<p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">' ||
      'Ez egy automatikusan generált értesítő, kérlek, ne válaszolj rá!' ||
      '</p>' ||
      '</td></tr>' ||
      '<tr><td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">' ||
      '<p style="color: #94a3b8; font-size: 12px; margin: 0;">© GiftMate • Made by Ivány Adrián</p>' ||
      '</td></tr>' ||
      '</table></td></tr></table></body></html>';

    -- 3. Dispatch non-blocking asynchronous HTTP POST request to Brevo REST API via pg_net
    PERFORM net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json',
        'api-key', v_brevo_api_key
      ),
      body := jsonb_build_object(
        'sender', jsonb_build_object(
          'name', 'GiftMate',
          'email', v_sender_email
        ),
        'to', jsonb_build_array(
          jsonb_build_object(
            'email', v_rec.email,
            'name', v_rec.username
          )
        ),
        'subject', v_subject,
        'htmlContent', v_html
      )
    );
  END LOOP;
END;
$$;