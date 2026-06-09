-- 20260609_team_chat_push.sql
-- Push for every Team Chat message to all other members of the channel, so no
-- message is missed. Fires the moment a message row is created and calls our push
-- endpoint over http using pg_net. The endpoint does the encrypting and sending.
-- The shared secret lives in push_config (key hook_secret) so only the database
-- can call the endpoint. This replaces an earlier version that only pushed people
-- who were tagged.

drop trigger if exists trg_tc_push_on_mention on public.team_mentions;
drop function if exists public.tc_push_on_mention();

create or replace function public.tc_push_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select value into v_secret from public.push_config where key = 'hook_secret';
  if v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://numatbamboo.com/api/portal/push/chat-hook',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret),
    body := jsonb_build_object('message_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists trg_tc_push_on_message on public.team_messages;
create trigger trg_tc_push_on_message
after insert on public.team_messages
for each row execute function public.tc_push_on_message();
