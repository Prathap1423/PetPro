-- My Gold Vault 002 - diamonds.
-- Run after 001_init.sql: paste the whole file into Supabase > SQL Editor > New query, then click Run. Run it once.
--
-- Diamonds have no daily rate like gold, so current_value is entered by hand (for example from a jeweller's quote).
-- Photos and bills reuse the private buckets from 001 under "<user id>/<diamond id>/<file>".

-- ---------- diamonds ----------
create table public.diamonds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  diamond_type text not null check (diamond_type in ('Loose stone','Ring','Earrings','Pendant','Necklace','Bracelet','Bangle','Nose pin','Other')),
  purchase_date date not null check (purchase_date <= current_date + 1),
  shop_name text check (char_length(shop_name) <= 120),
  invoice_number text check (char_length(invoice_number) <= 60),
  carat numeric(8,3) not null check (carat > 0 and carat <= 1000),
  stone_count integer not null default 1 check (stone_count between 1 and 1000),
  shape text not null check (shape in ('Round','Princess','Oval','Cushion','Emerald','Pear','Marquise','Heart','Radiant','Asscher','Other')),
  cut text check (cut in ('Excellent','Very Good','Good','Fair','Poor')),
  colour text check (colour in ('D','E','F','G','H','I','J','K','L','M','N-Z')),
  clarity text check (clarity in ('FL','IF','VVS1','VVS2','VS1','VS2','SI1','SI2','I1','I2','I3')),
  certificate_lab text check (certificate_lab in ('GIA','IGI','HRD','SGL','Other')),
  certificate_number text check (char_length(certificate_number) <= 40),
  setting_metal text check (setting_metal in ('Yellow gold','White gold','Rose gold','Platinum','Silver','Other')),
  purchase_price numeric(14,2) not null check (purchase_price >= 0),
  current_value numeric(14,2) check (current_value is null or current_value >= 0),
  value_updated_at timestamptz,
  status text not null default 'owned' check (status in ('owned','sold','gifted','exchanged')),
  bill_path text,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diamonds_user_date_idx on public.diamonds (user_id, purchase_date desc);

-- Duplicates: the same invoice number, or the same grading certificate, can't be entered twice.
create unique index diamonds_unique_invoice
  on public.diamonds (user_id, lower(btrim(invoice_number))) where invoice_number is not null and btrim(invoice_number) <> '';
create unique index diamonds_unique_certificate
  on public.diamonds (user_id, coalesce(certificate_lab, ''), lower(btrim(certificate_number))) where certificate_number is not null and btrim(certificate_number) <> '';

create trigger diamonds_updated_at before update on public.diamonds
  for each row execute function public.set_updated_at();

-- ---------- diamond_images ----------
create table public.diamond_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  diamond_id uuid not null references public.diamonds(id) on delete cascade,
  storage_path text not null unique,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index diamond_images_diamond_idx on public.diamond_images (diamond_id);
-- At most one cover photo per diamond.
create unique index diamond_images_one_cover on public.diamond_images (diamond_id) where is_cover;

-- ---------- row level security ----------
alter table public.diamonds enable row level security;
alter table public.diamond_images enable row level security;

grant select, insert, update, delete on public.diamonds, public.diamond_images to authenticated;

create policy diamonds_select on public.diamonds for select to authenticated using (user_id = (select auth.uid()));
create policy diamonds_insert on public.diamonds for insert to authenticated with check (user_id = (select auth.uid()));
create policy diamonds_update on public.diamonds for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy diamonds_delete on public.diamonds for delete to authenticated using (user_id = (select auth.uid()));

-- Child rows must belong to the caller and point at a diamond the caller owns.
create policy diamond_images_select on public.diamond_images for select to authenticated using (user_id = (select auth.uid()));
create policy diamond_images_insert on public.diamond_images for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.diamonds d where d.id = diamond_id and d.user_id = (select auth.uid()))
);
create policy diamond_images_update on public.diamond_images for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy diamond_images_delete on public.diamond_images for delete to authenticated using (user_id = (select auth.uid()));
