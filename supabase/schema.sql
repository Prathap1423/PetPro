-- My Gold Vault — tables, row level security and private file storage.
-- Paste the whole file into Supabase → SQL Editor → New query, then click Run. Run it once.
--
-- Every row has a user_id, and every policy limits rows to the signed-in user (auth.uid()).
-- Files live in private buckets under "<user id>/<jewellery id>/<file>" and are opened with signed URLs.

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- jewellery ----------
create table public.jewellery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (category in ('Chain','Necklace','Ring','Bracelet','Bangle','Earring','Pendant','Coin','Other')),
  purchase_date date not null check (purchase_date <= current_date + 1),
  shop_name text check (char_length(shop_name) <= 120),
  invoice_number text check (char_length(invoice_number) <= 60),
  purity text not null check (purity in ('24K','22K','18K','14K','Other')),
  huid text check (char_length(huid) <= 20),
  gross_weight numeric(10,3) not null check (gross_weight > 0),
  non_gold_weight numeric(10,3) not null default 0 check (non_gold_weight >= 0),
  net_gold_weight numeric(10,3) not null,
  gold_rate_at_purchase numeric(12,2) check (gold_rate_at_purchase is null or gold_rate_at_purchase > 0),
  making_charges numeric(14,2) not null default 0 check (making_charges >= 0),
  wastage_charges numeric(14,2) not null default 0 check (wastage_charges >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  other_charges numeric(14,2) not null default 0 check (other_charges >= 0),
  purchase_price numeric(14,2) not null check (purchase_price >= 0),
  status text not null default 'owned' check (status in ('owned','sold','gifted','exchanged')),
  bill_path text,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jewellery_non_gold_lt_gross check (non_gold_weight < gross_weight),
  constraint jewellery_net_weight_consistent check (net_gold_weight = gross_weight - non_gold_weight)
);

create index jewellery_user_date_idx on public.jewellery (user_id, purchase_date desc);

-- Duplicates: the same invoice number, or the same name + date + gross weight, can't be entered twice.
create unique index jewellery_unique_invoice
  on public.jewellery (user_id, lower(btrim(invoice_number))) where invoice_number is not null and btrim(invoice_number) <> '';
create unique index jewellery_unique_item
  on public.jewellery (user_id, lower(btrim(name)), purchase_date, gross_weight);

create trigger jewellery_updated_at before update on public.jewellery
  for each row execute function public.set_updated_at();

-- ---------- jewellery_images ----------
create table public.jewellery_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  jewellery_id uuid not null references public.jewellery(id) on delete cascade,
  storage_path text not null unique,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index jewellery_images_jewellery_idx on public.jewellery_images (jewellery_id);
-- At most one cover photo per item.
create unique index jewellery_images_one_cover on public.jewellery_images (jewellery_id) where is_cover;

-- ---------- gold_rates (latest rate per purity) ----------
create table public.gold_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purity text not null check (purity in ('24K','22K','18K','14K','Other')),
  rate_per_gram numeric(12,2) not null check (rate_per_gram > 0),
  source text not null default 'manual' check (char_length(source) <= 120),
  updated_at timestamptz not null default now(),
  unique (user_id, purity)
);
create trigger gold_rates_updated_at before update on public.gold_rates
  for each row execute function public.set_updated_at();

-- ---------- transactions ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  jewellery_id uuid not null references public.jewellery(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('purchase','sale','gift','exchange')),
  transaction_date date not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index transactions_jewellery_idx on public.transactions (jewellery_id);

-- ---------- row level security ----------
alter table public.jewellery enable row level security;
alter table public.jewellery_images enable row level security;
alter table public.gold_rates enable row level security;
alter table public.transactions enable row level security;

grant select, insert, update, delete on public.jewellery, public.jewellery_images, public.gold_rates, public.transactions to authenticated;

create policy jewellery_select on public.jewellery for select to authenticated using (user_id = (select auth.uid()));
create policy jewellery_insert on public.jewellery for insert to authenticated with check (user_id = (select auth.uid()));
create policy jewellery_update on public.jewellery for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy jewellery_delete on public.jewellery for delete to authenticated using (user_id = (select auth.uid()));

-- Child rows must belong to the caller and point at an item the caller owns.
create policy images_select on public.jewellery_images for select to authenticated using (user_id = (select auth.uid()));
create policy images_insert on public.jewellery_images for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.jewellery j where j.id = jewellery_id and j.user_id = (select auth.uid()))
);
create policy images_update on public.jewellery_images for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy images_delete on public.jewellery_images for delete to authenticated using (user_id = (select auth.uid()));

create policy rates_select on public.gold_rates for select to authenticated using (user_id = (select auth.uid()));
create policy rates_insert on public.gold_rates for insert to authenticated with check (user_id = (select auth.uid()));
create policy rates_update on public.gold_rates for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy rates_delete on public.gold_rates for delete to authenticated using (user_id = (select auth.uid()));

create policy tx_select on public.transactions for select to authenticated using (user_id = (select auth.uid()));
create policy tx_insert on public.transactions for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.jewellery j where j.id = jewellery_id and j.user_id = (select auth.uid()))
);
create policy tx_update on public.transactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tx_delete on public.transactions for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- private file storage ----------
-- jewellery-images: <user id>/<jewellery id>/<uuid>.jpg
-- jewellery-bills:  <user id>/<jewellery id>/bill-<uuid>.(jpg|pdf)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('jewellery-images', 'jewellery-images', false, 5242880,  array['image/jpeg']),
  ('jewellery-bills',  'jewellery-bills',  false, 10485760, array['image/jpeg','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The first folder of every path must be the signed-in user's id.
create policy "gold vault files: read" on storage.objects for select to authenticated
  using (bucket_id in ('jewellery-images','jewellery-bills') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "gold vault files: insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('jewellery-images','jewellery-bills') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "gold vault files: update" on storage.objects for update to authenticated
  using (bucket_id in ('jewellery-images','jewellery-bills') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "gold vault files: delete" on storage.objects for delete to authenticated
  using (bucket_id in ('jewellery-images','jewellery-bills') and (storage.foldername(name))[1] = (select auth.uid())::text);
