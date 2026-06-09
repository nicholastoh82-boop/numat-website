-- 20260610_chat_people_functions.sql
-- Two fast lookups for Team Chat, replacing calls that downloaded the entire
-- user list through the auth admin API on every chat open.
--
-- tc_portal_people: every numat.ph person, for the private chat picker and the
-- task assignee picker.
-- tc_channel_people: members of one channel, for the members modal and the @
-- mention picker. It returns rows only when the requester is themselves a
-- member of that channel, and a member always appears in their own channel, so
-- an empty result means the requester is not a member.
--
-- Both run as security definer to read auth.users, and only the service role
-- may execute them. The portal API routes call them with the service key.

create or replace function public.tc_portal_people()
returns table (id uuid, name text, email text)
language sql
security definer
set search_path = public
as $$
  select u.id,
         coalesce(
           nullif(u.raw_user_meta_data ->> 'full_name', ''),
           nullif(u.raw_user_meta_data ->> 'name', ''),
           u.email
         )::text as name,
         u.email::text
  from auth.users u
  where lower(coalesce(u.email, '')) like '%@numat.ph'
  order by 2;
$$;

revoke all on function public.tc_portal_people() from public;
revoke all on function public.tc_portal_people() from anon;
revoke all on function public.tc_portal_people() from authenticated;
grant execute on function public.tc_portal_people() to service_role;

create or replace function public.tc_channel_people(p_channel uuid, p_requester uuid)
returns table (id uuid, name text, email text)
language sql
security definer
set search_path = public
as $$
  select u.id,
         coalesce(
           nullif(u.raw_user_meta_data ->> 'full_name', ''),
           nullif(u.raw_user_meta_data ->> 'name', ''),
           u.email
         )::text as name,
         u.email::text
  from public.team_channel_members cm
  join auth.users u on u.id = cm.user_id
  where cm.channel_id = p_channel
    and exists (
      select 1
      from public.team_channel_members me
      where me.channel_id = p_channel
        and me.user_id = p_requester
    )
  order by 2;
$$;

revoke all on function public.tc_channel_people(uuid, uuid) from public;
revoke all on function public.tc_channel_people(uuid, uuid) from anon;
revoke all on function public.tc_channel_people(uuid, uuid) from authenticated;
grant execute on function public.tc_channel_people(uuid, uuid) to service_role;
