begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
