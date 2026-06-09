-- 20260609_team_chat_push.sql
-- Send a push the moment a Team Chat mention is created. A trigger already turns
-- each message into mention rows (private chats notify the other person, public
-- channels notify anyone tagged). This adds a second trigger on those mention
-- rows that calls our push endpoint over http using pg_net. The endpoint does the
-- encrypting and sending. The shared secret lives in push_config (key
-- hook_secret) so only the database can call the endpoint.

create or replace function public.tc_push_on_mention()
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
    url := 'https://numatbamboo.com/api/portal/push/mention-hook',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', v_secret),
    body := jsonb_build_object('mention_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists trg_tc_push_on_mention on public.team_mentions;
create trigger trg_tc_push_on_mention
after insert on public.team_mentions
for each row execute function public.tc_push_on_mention();
