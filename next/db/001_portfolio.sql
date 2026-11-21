-- Portfolio schema. Each project gets its own schema later (forgeloop, recallx ...).
-- Shared auth tables (Better Auth) live in public; see 000_auth.sql.
create schema if not exists portfolio;

create table if not exists portfolio.profile (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  short_name text not null,
  headline text not null,
  description text not null,
  about jsonb not null default '[]',       -- paragraphs
  quick_facts jsonb not null default '[]', -- [{label, value}]
  dream text,
  updated_at timestamptz not null default now()
);

create table if not exists portfolio.experience (
  id serial primary key,
  org text not null,
  role text not null,
  period text not null,
  is_current boolean not null default false,
  summary text not null default '',
  highlights jsonb not null default '[]',
  sort int not null default 0
);

create table if not exists portfolio.education (
  id serial primary key,
  school text not null,
  degree text not null,
  period text not null,
  is_current boolean not null default false,
  note text,
  sort int not null default 0
);

create table if not exists portfolio.projects (
  slug text primary key,
  title text not null,
  description text not null,
  tags jsonb not null default '[]',
  repo text not null,
  demo_url text,
  demo_note text,
  is_published boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists portfolio.links (
  id serial primary key,
  icon text not null,
  label text not null,
  href text not null,
  display text not null,
  sort int not null default 0
);

create table if not exists portfolio.keepalive (
  id smallint primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);
