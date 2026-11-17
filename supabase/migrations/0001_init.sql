-- Miss France 2027 — pronostics entre amis

create table public.players (
  email text primary key check (email = lower(email)),
  display_name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  ceremony_at timestamptz not null,
  results text[] check (results is null or cardinality(results) = 5),
  results_at timestamptz
);

create table public.candidates (
  id text primary key,
  region text not null,
  nom text not null,
  age int,
  taille_cm int,
  ville text,
  profession text,
  bio text,
  details jsonb not null default '{}'::jsonb,
  portrait_url text,
  p_victoire numeric,
  p_top5 numeric,
  cote numeric,
  updated_at timestamptz not null default now()
);

create table public.photos (
  id bigint generated always as identity primary key,
  candidate_id text not null references public.candidates(id) on delete cascade,
  url text not null unique,
  source_url text unique,
  source_page text,
  credit text,
  type text,
  added_at timestamptz not null default now()
);
create index photos_candidate_idx on public.photos(candidate_id, added_at desc);

create table public.predictions (
  email text primary key references public.players(email) on delete cascade,
  picks text[] not null check (cardinality(picks) = 5),
  updated_at timestamptz not null default now()
);

-- Helpers
create or replace function public.current_email() returns text
language sql stable set search_path = '' as $$
  select lower(auth.jwt() ->> 'email')
$$;

create or replace function public.is_player() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.players where email = public.current_email())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.players where email = public.current_email() and is_admin)
$$;

create or replace function public.lock_at() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select ceremony_at - interval '2 hours' from public.settings where id = 1
$$;

create or replace function public.is_locked() returns boolean
language sql stable security definer set search_path = '' as $$
  select now() >= public.lock_at()
$$;

-- Vérifie avant l'envoi du lien magique que l'adresse est invitée
create or replace function public.is_invited(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.players where email = lower(trim(p_email)))
$$;

-- Qui a déjà pronostiqué (sans révéler le contenu avant le verrouillage)
create or replace function public.players_status()
returns table (email text, display_name text, has_played boolean, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.email, p.display_name, pr.email is not null, pr.updated_at
  from public.players p left join public.predictions pr on pr.email = p.email
  where public.is_player()
  order by p.display_name
$$;

-- Validation d'un pronostic : 5 candidates distinctes et existantes, avant verrouillage
create or replace function public.check_prediction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_locked() then
    raise exception 'Les pronostics sont verrouillés.';
  end if;
  if (select count(distinct x) from unnest(new.picks) x) <> 5 then
    raise exception 'Le Top 5 doit contenir 5 candidates différentes.';
  end if;
  if (select count(*) from public.candidates c where c.id = any(new.picks)) <> 5 then
    raise exception 'Candidate inconnue.';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger predictions_check before insert or update on public.predictions
for each row execute function public.check_prediction();

-- RLS
alter table public.players enable row level security;
alter table public.settings enable row level security;
alter table public.candidates enable row level security;
alter table public.photos enable row level security;
alter table public.predictions enable row level security;

create policy players_read on public.players for select to authenticated using (public.is_player());
create policy settings_read on public.settings for select to authenticated using (public.is_player());
create policy settings_admin on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy candidates_read on public.candidates for select to authenticated using (public.is_player());
create policy photos_read on public.photos for select to authenticated using (public.is_player());

create policy predictions_read on public.predictions for select to authenticated
  using (public.is_player() and (email = public.current_email() or public.is_locked()));
create policy predictions_insert on public.predictions for insert to authenticated
  with check (public.is_player() and email = public.current_email() and not public.is_locked());
create policy predictions_update on public.predictions for update to authenticated
  using (email = public.current_email() and not public.is_locked())
  with check (email = public.current_email() and not public.is_locked());

revoke execute on function public.check_prediction() from public, anon, authenticated;
revoke execute on function public.players_status() from public, anon;
grant execute on function public.players_status() to authenticated;
grant execute on function public.is_invited(text) to anon, authenticated;

-- Photos : bucket public en lecture (URL non devinables), écriture réservée au service
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

insert into public.settings (id, ceremony_at) values (1, '2026-12-12 21:10:00+01');
