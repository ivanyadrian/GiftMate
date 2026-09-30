
BEGIN
  RETURN QUERY
  SELECT 
    rm.user_id,
    u.email::TEXT,
    COALESCE(p.username, 'Résztvevő')::TEXT AS username,
    r.room_name::TEXT
  FROM public.room_members rm
  JOIN public.rooms r ON r.id = rm.room_id
  JOIN auth.users u ON u.id = rm.user_id
  LEFT JOIN public.profiles p ON p.id = rm.user_id
  WHERE rm.room_id = p_room_id
    -- Csak azoknak, akik nem kapcsolták ki az értesítést:
    AND (p.email_notifications_enabled IS NULL OR p.email_notifications_enabled = true)
    -- Ha kézi sorsolás volt, az indítót kihagyjuk, de ha automatikus (p_manual_user_id IS NULL), mindenki megkapja:
    AND (p_manual_user_id IS NULL OR rm.user_id != p_manual_user_id);
END;
