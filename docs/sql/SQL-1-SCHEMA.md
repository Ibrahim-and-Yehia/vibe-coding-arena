# SQL 1 of 3 — Schema

**Where:** Supabase Dashboard → SQL Editor → New query → paste → Run.

**Before you run anything**, do the Auth setup at the bottom of this file. It is two
toggles and the build will not work without them.

Run SQL-1, SQL-2, SQL-3 **in order**. Each is safe to re-run.

---

## Paste this

```sql
-- ============================================================================
-- SERVA — 1/3 SCHEMA
-- Enums, tables, indexes, and the new-user profile trigger.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin create type business_type as enum ('cafe','restaurant','bar'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('queued','preparing','ready','delivered','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type po_status as enum ('draft','ordered','received'); exception when duplicate_object then null; end $$;
do $$ begin create type stock_reason as enum ('receive','sale','count','correction'); exception when duplicate_object then null; end $$;
do $$ begin create type session_status as enum ('open','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type alert_kind as enum ('new_order','order_ready','order_late','low_stock','call_waiter'); exception when duplicate_object then null; end $$;
do $$ begin create type alert_severity as enum ('info','warning','critical'); exception when duplicate_object then null; end $$;
do $$ begin create type floor_object_kind as enum ('table','kitchen','bar','pos','entrance','restroom','wall','plant','stairs','other'); exception when duplicate_object then null; end $$;
do $$ begin create type floor_object_shape as enum ('round','square','rect','stool','line','rect_fixture'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Venue + owner profile
-- ---------------------------------------------------------------------------
create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  business_type business_type not null default 'restaurant',
  currency text not null default 'USD',
  logo_url text,
  kitchen_label text not null default 'Kitchen',
  sla_extra_item_minutes numeric not null default 1.5,
  sla_busy_factor numeric not null default 0.08,
  sla_amber_pct numeric not null default 0.7,
  sla_red_pct numeric not null default 1.0,
  next_order_number int not null default 0,
  next_alert_number int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  venue_id uuid references venues(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  category_id uuid references menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  prep_minutes numeric not null default 5,
  is_available boolean not null default true,
  track_stock boolean not null default false,
  stock_qty numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists menu_item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  group_name text not null,
  option_name text not null,
  price_delta numeric(10,2) not null default 0,
  is_default boolean not null default false,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null,
  unit text not null default 'unit',
  stock_qty numeric not null default 0,
  low_threshold numeric not null default 0,
  cost_per_unit numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists recipe_lines (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  qty_per_unit numeric not null default 0,
  unique (menu_item_id, ingredient_id)
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  status po_status not null default 'draft',
  total_cost numeric(10,2) not null default 0,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists po_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  qty numeric not null default 0,
  unit_cost numeric(10,4) not null default 0
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  delta numeric not null,
  reason stock_reason not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Floor plan
-- ---------------------------------------------------------------------------
create table if not exists floor_areas (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null default 'Main Area',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists floor_objects (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  area_id uuid not null references floor_areas(id) on delete cascade,
  kind floor_object_kind not null default 'table',
  shape floor_object_shape not null default 'round',
  label text not null default '',
  seats int not null default 2,
  x numeric not null default 0,
  y numeric not null default 0,
  w numeric not null default 80,
  h numeric not null default 80,
  rotation numeric not null default 0,
  z int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sessions and orders
-- ---------------------------------------------------------------------------
create table if not exists table_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  table_object_id uuid not null references floor_objects(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  status session_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

-- THE most important line in the schema. This partial unique index is what makes
-- "two customers cannot claim the same table" true even under a simultaneous race.
create unique index if not exists one_open_session_per_table
  on table_sessions (table_object_id) where (status = 'open');

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  session_id uuid not null references table_sessions(id) on delete cascade,
  order_number int not null,
  status order_status not null default 'queued',
  placed_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  target_minutes numeric not null default 15,
  total_amount numeric(10,2) not null default 0,
  note text,
  unique (venue_id, order_number)
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name_snapshot text not null,
  unit_price numeric(10,2) not null default 0,
  qty int not null default 1,
  note text,
  options_snapshot jsonb not null default '[]'::jsonb
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  alert_number int not null,
  kind alert_kind not null,
  ref_id uuid,
  table_label text,
  message text not null,
  severity alert_severity not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (venue_id, alert_number)
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  business_name text,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_menu_items_venue on menu_items(venue_id);
create index if not exists idx_menu_categories_venue on menu_categories(venue_id);
create index if not exists idx_ingredients_venue on ingredients(venue_id);
create index if not exists idx_floor_objects_venue on floor_objects(venue_id);
create index if not exists idx_table_sessions_venue on table_sessions(venue_id);
create index if not exists idx_table_sessions_status on table_sessions(venue_id, status);
create index if not exists idx_orders_venue on orders(venue_id);
create index if not exists idx_orders_session on orders(session_id);
create index if not exists idx_orders_status on orders(venue_id, status);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_alerts_venue on alerts(venue_id, created_at desc);
create index if not exists idx_stock_movements_ingredient on stock_movements(ingredient_id);

-- ---------------------------------------------------------------------------
-- Every new auth user automatically gets a profiles row
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## Verify it worked

Run this. It must return exactly `18`.

```sql
select count(*) from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'venues','profiles','menu_categories','menu_items','menu_item_options',
    'suppliers','ingredients','recipe_lines','purchase_orders','po_lines',
    'stock_movements','floor_areas','floor_objects','table_sessions','orders',
    'order_items','alerts','contact_messages'
  );
```

Anything less means a `create table` failed — scroll up in the SQL Editor output to find
which one.

Also confirm the race-protection index exists (this is what stops two customers claiming
the same table):

```sql
select indexname from pg_indexes where indexname = 'one_open_session_per_table';
```

---

## Auth setup — do this now, it is required

Supabase Dashboard → **Authentication** → **Sign In / Providers** → **Email**:

1. **Enable email provider** — must be **ON**.
2. **Confirm email** — must be **OFF**. If it is on, a new signup gets no session until
   they click a link in an email, and the onboarding flow stalls.
3. Click **Save** *inside that Email panel*. It has its own Save button, separate from the
   page's — this is easy to miss and the change silently does not apply.

Verify with (replace with your project ref and anon key):

```bash
curl -s "https://<PROJECT_REF>.supabase.co/auth/v1/settings" -H "apikey: <ANON_KEY>"
```

You want to see `"email":true` and `"mailer_autoconfirm":true` in the response.
`mailer_autoconfirm: true` means confirmation is off. Both must be as stated.
