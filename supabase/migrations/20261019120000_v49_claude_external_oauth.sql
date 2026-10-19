-- V49 Gate 6 (Claude External law C-3, C-5).
--
-- OAuth 2.1 authorization server storage for the hosted MCP connector, and the
-- user_api_keys repair for the stdio MCP server. Codes and tokens are stored
-- only as SHA-256 hashes; every table is service-role only (RLS on, no
-- policies). Idempotent: safe to re-run.

create extension if not exists pgcrypto;

-- Dynamically registered public clients (RFC 7591).
create table if not exists public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_name text not null,
  redirect_uris text[] not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Single-use authorization codes (PKCE S256, ≤ 10 minutes).
create table if not exists public.oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  client_id text not null references public.oauth_clients (client_id) on delete cascade,
  user_id uuid not null,
  redirect_uri text not null,
  scopes text[] not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256' check (code_challenge_method = 'S256'),
  resource text,
  family_id uuid not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Access (1 h) and refresh (30 d) tokens; a refresh rotation family shares family_id.
create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  token_kind text not null check (token_kind in ('access', 'refresh')),
  family_id uuid not null,
  client_id text not null references public.oauth_clients (client_id) on delete cascade,
  user_id uuid not null,
  scopes text[] not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  rotated_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists oauth_tokens_user_client_idx on public.oauth_tokens (user_id, client_id);
create index if not exists oauth_tokens_family_idx on public.oauth_tokens (family_id);
create index if not exists oauth_authorization_codes_family_idx on public.oauth_authorization_codes (family_id);

alter table public.oauth_clients enable row level security;
alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_tokens enable row level security;

-- user_api_keys: hashed keys + expires_at (stdio MCP verification shape).
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text,
  key_hash text,
  scopes text[] not null default '{}'::text[],
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_api_keys add column if not exists key_hash text;
alter table public.user_api_keys add column if not exists scopes text[] not null default '{}'::text[];
alter table public.user_api_keys add column if not exists expires_at timestamptz;
alter table public.user_api_keys add column if not exists last_used_at timestamptz;

do $$
begin
  -- Legacy issuance stored the plaintext key in `key` and the expiry in `expire_at`.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_api_keys' and column_name = 'key'
  ) then
    execute 'update public.user_api_keys set key_hash = encode(digest(key, ''sha256''), ''hex'') where key_hash is null and key is not null';
    execute 'alter table public.user_api_keys drop column key';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_api_keys' and column_name = 'expire_at'
  ) then
    execute 'update public.user_api_keys set expires_at = expire_at where expires_at is null';
    execute 'alter table public.user_api_keys drop column expire_at';
  end if;
end $$;

create unique index if not exists user_api_keys_key_hash_idx on public.user_api_keys (key_hash);
create index if not exists user_api_keys_user_idx on public.user_api_keys (user_id);
alter table public.user_api_keys enable row level security;
