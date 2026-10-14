-- Ajaia Docs — initial schema
--
-- Tables:        profiles, documents, document_shares
-- Authorization: table/column grants + Row Level Security + SECURITY DEFINER helpers.
--                The browser only ever holds the publishable key and the user's JWT,
--                so everything below is the real access boundary.
--
-- Helpers live in schema `private`, which PostgREST does not expose, so they can't be
-- called as RPCs. They are SECURITY DEFINER so policies on one table can consult the
-- other table without triggering "infinite recursion detected in policy".

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.share_role as enum ('viewer', 'editor');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per auth user; lets us look users up by email without exposing auth.users.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.documents (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null default 'Untitled document',
  -- Tiptap / ProseMirror JSON document.
  content    jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint documents_content_shape check (jsonb_typeof(content) = 'object' and content ->> 'type' = 'doc'),
  constraint documents_content_size check (octet_length(content::text) <= 2000000)
);

create index documents_owner_id_idx on public.documents (owner_id);

create table public.document_shares (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.share_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  primary key (document_id, user_id)
);

create index document_shares_user_id_idx on public.document_shares (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function private.set_updated_at();

-- Keep profiles in sync with auth.users.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- Backfill users that existed before this migration.
insert into public.profiles (id, email)
select id, email from auth.users where email is not null
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------

create function private.is_document_owner(doc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id and d.owner_id = (select auth.uid())
  );
$$;

-- True when the current user and `other_user` are connected through a shared document
-- (either direction). Used so collaborators can see each other's email, and nobody else.
create function private.shares_document_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.document_shares s
    join public.documents d on d.id = s.document_id
    where (d.owner_id = (select auth.uid()) and s.user_id = other_user)
       or (s.user_id = (select auth.uid()) and d.owner_id = other_user)
  );
$$;

revoke all on function private.is_document_owner(uuid) from public;
revoke all on function private.shares_document_with(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_document_owner(uuid) to authenticated;
grant execute on function private.shares_document_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (defense in depth: clients may only write title/content)
-- ---------------------------------------------------------------------------

revoke all on table public.profiles, public.documents, public.document_shares from anon, authenticated;

grant select on table public.profiles to authenticated;

grant select, delete on table public.documents to authenticated;
grant insert (title, content), update (title, content) on table public.documents to authenticated;

-- Shares are created/updated only through public.share_document(); clients can read and revoke.
grant select, delete on table public.document_shares to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

-- profiles
create policy "profiles: read self and collaborators"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_document_with(id));

-- documents
create policy "documents: owner or shared users can read"
  on public.documents for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id and s.user_id = (select auth.uid())
    )
  );

create policy "documents: users create their own"
  on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "documents: owner or editors can update"
  on public.documents for update to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and s.user_id = (select auth.uid())
        and s.role = 'editor'
    )
  )
  with check (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and s.user_id = (select auth.uid())
        and s.role = 'editor'
    )
  );

create policy "documents: owner can delete"
  on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()));

-- document_shares
create policy "shares: owner and recipient can read"
  on public.document_shares for select to authenticated
  using (user_id = (select auth.uid()) or private.is_document_owner(document_id));

create policy "shares: owner can revoke"
  on public.document_shares for delete to authenticated
  using (private.is_document_owner(document_id));

-- ---------------------------------------------------------------------------
-- RPC: share a document with a registered user (create or change role)
-- ---------------------------------------------------------------------------

create function public.share_document(
  p_document_id uuid,
  p_email text,
  p_role public.share_role default 'viewer'
)
returns public.document_shares
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_share  public.document_shares;
begin
  if v_uid is null then
    raise exception 'You must be signed in to share documents' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.documents d where d.id = p_document_id and d.owner_id = v_uid
  ) then
    raise exception 'Only the document owner can share it' using errcode = '42501';
  end if;

  select p.id into v_target
  from public.profiles p
  where lower(p.email) = lower(btrim(p_email));

  if v_target is null then
    raise exception 'No user found with that email' using errcode = 'P0002';
  end if;

  if v_target = v_uid then
    raise exception 'You already own this document' using errcode = '22023';
  end if;

  insert into public.document_shares (document_id, user_id, role)
  values (p_document_id, v_target, p_role)
  on conflict (document_id, user_id) do update set role = excluded.role
  returning * into v_share;

  return v_share;
end;
$$;

revoke all on function public.share_document(uuid, text, public.share_role) from public, anon;
grant execute on function public.share_document(uuid, text, public.share_role) to authenticated;
