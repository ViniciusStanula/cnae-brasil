create table public.crawl_logs (
  id         bigint generated always as identity primary key,
  path       text        not null,
  link_type  text,                  -- 'html' | 'js' | null (leaf/non-cnae pages)
  crawled_at timestamptz not null default now(),
  user_agent text,
  ip         text,
  bot_name   text,                  -- 'Googlebot' | 'Bingbot' | 'GPTBot' | etc.
  verified   boolean               -- true = reverse DNS confirmed (Googlebot + Bingbot only)
);

-- RLS: allow anon inserts from middleware (service role not required)
alter table public.crawl_logs enable row level security;

create policy "allow anon insert"
  on public.crawl_logs
  for insert
  to anon
  with check (true);

create policy "allow service read"
  on public.crawl_logs
  for select
  to service_role
  using (true);

-- Raw server log — every single request, humans + bots
create table public.request_logs (
  id         bigint generated always as identity primary key,
  path       text        not null,
  hit_at     timestamptz not null default now(),
  user_agent text,
  ip         text
);

alter table public.request_logs enable row level security;

create policy "allow anon insert"
  on public.request_logs
  for insert
  to anon
  with check (true);

create policy "allow service read"
  on public.request_logs
  for select
  to service_role
  using (true);
