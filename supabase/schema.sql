-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Owner Settings Table (For About/Live panel content)
create table public.owner_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Allow anyone to read, only authenticated users (owner) to update
alter table public.owner_settings enable row level security;

create policy "Allow public read access"
  on public.owner_settings for select
  using (true);

create policy "Owner manage settings" 
  on public.owner_settings for all 
  using (auth.role() = 'authenticated');


-- 2. Products Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  price decimal(10,2) not null,
  image_url text, -- URL to storage
  category text,
  zodiac text, -- comma separated tags
  status text default 'active', -- active, sold, draft
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id)
);

alter table public.products enable row level security;

create policy "Public read products"
  on public.products for select
  using (true);

create policy "Owner manage products"
  on public.products for all
  using (auth.role() = 'authenticated');


-- 3. Orders Table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  total decimal(10,2) not null,
  status text default 'pending', -- pending, paid, shipped
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Users read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users create orders"
  on public.orders for insert
  using (auth.uid() = user_id);


-- 4. Storage Buckets
-- Note: You have to create buckets via the dashboard or API, but you can set policies here.
-- Assuming buckets 'panel-images' and 'product-images' become available.

-- Policy for panel-images (About/Live photos)
-- Make sure to create a public bucket named 'panel-images'
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'panel-images' );
-- create policy "Owner Upload" on storage.objects for insert using ( bucket_id = 'panel-images' and auth.role() = 'authenticated' );
