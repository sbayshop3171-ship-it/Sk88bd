-- 011: the contact fields My Account asks for.
--
-- The reference's My Account screen offers a real name, a nickname, a
-- Facebook ID, a Google account, a WhatsApp number, an email and a second
-- phone number. `profiles` had nowhere to put any of them, so the screen
-- only ever drew the nickname — a box that forgets what it is told is worse
-- than no box.
--
-- `real_name` is write-once: the reference shows it greyed out and masked
-- (J**) once it is set, because it is what a withdrawal is checked against.
-- The trigger below is what makes that true rather than merely styled.
-- Safe to run more than once.

alter table profiles add column if not exists real_name text;
alter table profiles add column if not exists facebook_id text;
alter table profiles add column if not exists google_id  text;
alter table profiles add column if not exists whatsapp   text;
alter table profiles add column if not exists email      text;
alter table profiles add column if not exists contact_phone text;

-- ---------- real_name is set once and never rewritten ----------
create or replace function lock_real_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and nullif(btrim(old.real_name), '') is not null
     and new.real_name is distinct from old.real_name
     and not is_admin() then
    raise exception 'real name cannot be changed' using errcode = 'invalid_parameter_value';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_real_name on profiles;
create trigger profiles_lock_real_name
  before update on profiles
  for each row execute function lock_real_name();
