-- ============================================================================
-- Serva — full schema, RLS, and RPC functions.
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Covers every table used across all phases, so this is a one-time step.
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
-- Tables
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
-- New-user → profile row
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

-- ---------------------------------------------------------------------------
-- Atomic per-venue counters + alert helper
-- ---------------------------------------------------------------------------
create or replace function next_order_number(p_venue_id uuid) returns int
language sql security definer set search_path = public as $$
  update venues set next_order_number = next_order_number + 1
  where id = p_venue_id
  returning next_order_number;
$$;

create or replace function next_alert_number(p_venue_id uuid) returns int
language sql security definer set search_path = public as $$
  update venues set next_alert_number = next_alert_number + 1
  where id = p_venue_id
  returning next_alert_number;
$$;

create or replace function emit_alert(
  p_venue_id uuid, p_kind alert_kind, p_ref_id uuid, p_table_label text,
  p_message text, p_severity alert_severity
) returns alerts
language plpgsql security definer set search_path = public as $$
declare
  v_row alerts;
begin
  insert into alerts (venue_id, alert_number, kind, ref_id, table_label, message, severity)
  values (p_venue_id, next_alert_number(p_venue_id), p_kind, p_ref_id, p_table_label, p_message, p_severity)
  returning * into v_row;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding: create venue for the signed-in owner
-- ---------------------------------------------------------------------------
create or replace function create_venue_and_link_owner(
  p_name text, p_slug text, p_business_type business_type, p_currency text
) returns venues
language plpgsql security definer set search_path = public as $$
declare
  v_venue venues%rowtype;
begin
  insert into venues (owner_id, name, slug, business_type, currency)
  values (auth.uid(), p_name, p_slug, p_business_type, p_currency)
  returning * into v_venue;

  update profiles set venue_id = v_venue.id where id = auth.uid();

  return v_venue;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer: claim a table (race-safe via the partial unique index above)
-- ---------------------------------------------------------------------------
create or replace function claim_table(
  p_venue_id uuid, p_table_object_id uuid, p_customer_name text, p_customer_phone text
) returns table_sessions
language plpgsql security definer set search_path = public as $$
declare
  v_session table_sessions;
begin
  insert into table_sessions (venue_id, table_object_id, customer_name, customer_phone)
  values (p_venue_id, p_table_object_id, p_customer_name, p_customer_phone)
  returning * into v_session;
  return v_session;
exception when unique_violation then
  raise exception 'TABLE_TAKEN' using errcode = 'P0001';
end;
$$;

create or replace function free_table(p_session_id uuid) returns void
language sql security definer set search_path = public as $$
  update table_sessions set status = 'closed', closed_at = now() where id = p_session_id;
$$;

create or replace function call_waiter(p_session_id uuid) returns alerts
language plpgsql security definer set search_path = public as $$
declare
  v_venue_id uuid;
  v_table_label text;
  v_row alerts;
begin
  select ts.venue_id, fo.label into v_venue_id, v_table_label
  from table_sessions ts join floor_objects fo on fo.id = ts.table_object_id
  where ts.id = p_session_id;

  v_row := emit_alert(v_venue_id, 'call_waiter', p_session_id, v_table_label,
    'Table ' || coalesce(v_table_label,'?') || ' is calling for a waiter', 'warning');
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer: place an order — atomic order + stock deduction + alert
-- p_items: [{ "menu_item_id": uuid, "qty": int, "note": text,
--             "options": [{"group_name","option_name","price_delta"}] }]
-- ---------------------------------------------------------------------------
create or replace function place_order(p_session_id uuid, p_items jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_venue_id uuid;
  v_table_object_id uuid;
  v_table_label text;
  v_status session_status;
  v_item jsonb;
  v_menu_item menu_items%rowtype;
  v_qty int;
  v_base numeric := 0;
  v_total_qty int := 0;
  v_extra numeric;
  v_busy numeric;
  v_target numeric;
  v_total_amount numeric := 0;
  v_order_number int;
  v_order orders%rowtype;
  v_active_orders int;
  v_extra_minutes numeric;
  v_busy_factor numeric;
  v_recipe record;
  v_new_ing_qty numeric;
  v_low_threshold numeric;
  v_ing_name text;
  v_order_items jsonb := '[]'::jsonb;
  v_opt jsonb;
  v_unit_price numeric;
begin
  select venue_id, table_object_id, status into v_venue_id, v_table_object_id, v_status
  from table_sessions where id = p_session_id for update;

  if v_venue_id is null then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_status <> 'open' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;

  select label into v_table_label from floor_objects where id = v_table_object_id;
  select sla_extra_item_minutes, sla_busy_factor into v_extra_minutes, v_busy_factor
  from venues where id = v_venue_id;

  select count(*) into v_active_orders from orders
  where venue_id = v_venue_id and status in ('queued','preparing');

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_menu_item from menu_items where id = (v_item->>'menu_item_id')::uuid;
    if v_menu_item.id is null then
      raise exception 'MENU_ITEM_NOT_FOUND' using errcode = 'P0001';
    end if;
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    v_base := greatest(v_base, v_menu_item.prep_minutes);
    v_total_qty := v_total_qty + v_qty;

    v_unit_price := v_menu_item.price;
    if v_item ? 'options' then
      for v_opt in select * from jsonb_array_elements(v_item->'options')
      loop
        v_unit_price := v_unit_price + coalesce((v_opt->>'price_delta')::numeric, 0);
      end loop;
    end if;
    v_total_amount := v_total_amount + (v_unit_price * v_qty);
  end loop;

  v_extra := greatest(v_total_qty - 1, 0) * v_extra_minutes;
  v_busy := least(1 + v_active_orders * v_busy_factor, 1.6);
  v_target := ceil((v_base + v_extra) * v_busy);

  v_order_number := next_order_number(v_venue_id);

  insert into orders (venue_id, session_id, order_number, status, target_minutes, total_amount, note)
  values (v_venue_id, p_session_id, v_order_number, 'queued', v_target, v_total_amount, p_note)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_menu_item from menu_items where id = (v_item->>'menu_item_id')::uuid;
    v_qty := greatest(coalesce((v_item->>'qty')::int, 1), 1);
    v_unit_price := v_menu_item.price;
    if v_item ? 'options' then
      for v_opt in select * from jsonb_array_elements(v_item->'options')
      loop
        v_unit_price := v_unit_price + coalesce((v_opt->>'price_delta')::numeric, 0);
      end loop;
    end if;

    insert into order_items (order_id, menu_item_id, name_snapshot, unit_price, qty, note, options_snapshot)
    values (v_order.id, v_menu_item.id, v_menu_item.name, v_unit_price, v_qty,
            v_item->>'note', coalesce(v_item->'options', '[]'::jsonb));

    v_order_items := v_order_items || jsonb_build_object(
      'menu_item_id', v_menu_item.id, 'name', v_menu_item.name, 'qty', v_qty, 'unit_price', v_unit_price
    );

    if v_menu_item.track_stock then
      update menu_items set stock_qty = greatest(stock_qty - v_qty, 0) where id = v_menu_item.id;
    end if;

    for v_recipe in select * from recipe_lines where menu_item_id = v_menu_item.id
    loop
      update ingredients set stock_qty = greatest(stock_qty - (v_recipe.qty_per_unit * v_qty), 0)
      where id = v_recipe.ingredient_id
      returning stock_qty, low_threshold, name into v_new_ing_qty, v_low_threshold, v_ing_name;

      insert into stock_movements (venue_id, ingredient_id, delta, reason, note)
      values (v_venue_id, v_recipe.ingredient_id, -(v_recipe.qty_per_unit * v_qty), 'sale',
              'Order #' || v_order_number);

      if v_new_ing_qty <= v_low_threshold and not exists (
        select 1 from alerts
        where venue_id = v_venue_id and kind = 'low_stock' and ref_id = v_recipe.ingredient_id and is_read = false
      ) then
        perform emit_alert(v_venue_id, 'low_stock', v_recipe.ingredient_id, null,
          v_ing_name || ' is running low (' || v_new_ing_qty || ' left)', 'warning');
      end if;
    end loop;
  end loop;

  perform emit_alert(v_venue_id, 'new_order', v_order.id, v_table_label,
    'New order #' || v_order_number || ' — Table ' || coalesce(v_table_label, '?'), 'info');

  return jsonb_build_object('order', to_jsonb(v_order), 'items', v_order_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner: advance an order's status
-- ---------------------------------------------------------------------------
create or replace function advance_order_status(p_order_id uuid, p_new_status order_status)
returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_table_label text;
begin
  update orders set
    status = p_new_status,
    started_at = case when p_new_status = 'preparing' and started_at is null then now() else started_at end,
    ready_at = case when p_new_status = 'ready' and ready_at is null then now() else ready_at end,
    delivered_at = case when p_new_status = 'delivered' and delivered_at is null then now() else delivered_at end
  where id = p_order_id
  returning * into v_order;

  if p_new_status = 'ready' then
    select fo.label into v_table_label
    from table_sessions ts join floor_objects fo on fo.id = ts.table_object_id
    where ts.id = v_order.session_id;

    perform emit_alert(v_order.venue_id, 'order_ready', v_order.id, v_table_label,
      'Order #' || v_order.order_number || ' ready — Table ' || coalesce(v_table_label, '?'), 'info');
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner-side polling tick: surface newly-late orders as alerts
-- ---------------------------------------------------------------------------
create or replace function check_late_orders(p_venue_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_table_label text;
  v_count int := 0;
begin
  for v_order in
    select o.* from orders o
    where o.venue_id = p_venue_id
      and o.status in ('queued','preparing')
      and extract(epoch from (now() - o.placed_at))/60 > o.target_minutes
      and not exists (
        select 1 from alerts a where a.venue_id = p_venue_id and a.kind = 'order_late' and a.ref_id = o.id
      )
  loop
    select fo.label into v_table_label
    from table_sessions ts join floor_objects fo on fo.id = ts.table_object_id
    where ts.id = v_order.session_id;

    perform emit_alert(p_venue_id, 'order_late', v_order.id, v_table_label,
      'Order #' || v_order.order_number || ' is running late — Table ' || coalesce(v_table_label,'?'), 'critical');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function claim_table(uuid,uuid,text,text) to anon, authenticated;
grant execute on function place_order(uuid,jsonb,text) to anon, authenticated;
grant execute on function free_table(uuid) to authenticated;
grant execute on function advance_order_status(uuid, order_status) to authenticated;
grant execute on function call_waiter(uuid) to anon, authenticated;
grant execute on function create_venue_and_link_owner(text,text,business_type,text) to authenticated;
grant execute on function check_late_orders(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table venues enable row level security;
alter table profiles enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_options enable row level security;
alter table suppliers enable row level security;
alter table ingredients enable row level security;
alter table recipe_lines enable row level security;
alter table purchase_orders enable row level security;
alter table po_lines enable row level security;
alter table stock_movements enable row level security;
alter table floor_areas enable row level security;
alter table floor_objects enable row level security;
alter table table_sessions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table alerts enable row level security;
alter table contact_messages enable row level security;

drop policy if exists "own profile select" on profiles;
create policy "own profile select" on profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update to authenticated using (id = auth.uid());

drop policy if exists "owner manage venue" on venues;
create policy "owner manage venue" on venues for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "public read venue" on venues;
create policy "public read venue" on venues for select to anon using (true);

drop policy if exists "owner manage categories" on menu_categories;
create policy "owner manage categories" on menu_categories for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));
drop policy if exists "public read categories" on menu_categories;
create policy "public read categories" on menu_categories for select to anon using (true);

drop policy if exists "owner manage items" on menu_items;
create policy "owner manage items" on menu_items for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));
drop policy if exists "public read items" on menu_items;
create policy "public read items" on menu_items for select to anon using (true);

drop policy if exists "owner manage options" on menu_item_options;
create policy "owner manage options" on menu_item_options for all to authenticated
  using (menu_item_id in (select id from menu_items where venue_id = (select venue_id from profiles where id = auth.uid())))
  with check (menu_item_id in (select id from menu_items where venue_id = (select venue_id from profiles where id = auth.uid())));
drop policy if exists "public read options" on menu_item_options;
create policy "public read options" on menu_item_options for select to anon using (true);

drop policy if exists "owner manage suppliers" on suppliers;
create policy "owner manage suppliers" on suppliers for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));

drop policy if exists "owner manage ingredients" on ingredients;
create policy "owner manage ingredients" on ingredients for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));

drop policy if exists "owner manage recipe lines" on recipe_lines;
create policy "owner manage recipe lines" on recipe_lines for all to authenticated
  using (menu_item_id in (select id from menu_items where venue_id = (select venue_id from profiles where id = auth.uid())))
  with check (menu_item_id in (select id from menu_items where venue_id = (select venue_id from profiles where id = auth.uid())));

drop policy if exists "owner manage purchase orders" on purchase_orders;
create policy "owner manage purchase orders" on purchase_orders for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));

drop policy if exists "owner manage po lines" on po_lines;
create policy "owner manage po lines" on po_lines for all to authenticated
  using (purchase_order_id in (select id from purchase_orders where venue_id = (select venue_id from profiles where id = auth.uid())))
  with check (purchase_order_id in (select id from purchase_orders where venue_id = (select venue_id from profiles where id = auth.uid())));

drop policy if exists "owner manage stock movements" on stock_movements;
create policy "owner manage stock movements" on stock_movements for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));

drop policy if exists "owner manage areas" on floor_areas;
create policy "owner manage areas" on floor_areas for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));
drop policy if exists "public read areas" on floor_areas;
create policy "public read areas" on floor_areas for select to anon using (true);

drop policy if exists "owner manage objects" on floor_objects;
create policy "owner manage objects" on floor_objects for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));
drop policy if exists "public read objects" on floor_objects;
create policy "public read objects" on floor_objects for select to anon using (true);

drop policy if exists "owner manage sessions" on table_sessions;
create policy "owner manage sessions" on table_sessions for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));
drop policy if exists "public read sessions" on table_sessions;
create policy "public read sessions" on table_sessions for select to anon using (true);

drop policy if exists "owner manage orders" on orders;
create policy "owner manage orders" on orders for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));
drop policy if exists "public read orders" on orders;
create policy "public read orders" on orders for select to anon using (true);

drop policy if exists "owner manage order items" on order_items;
create policy "owner manage order items" on order_items for all to authenticated
  using (order_id in (select id from orders where venue_id = (select venue_id from profiles where id = auth.uid())))
  with check (order_id in (select id from orders where venue_id = (select venue_id from profiles where id = auth.uid())));
drop policy if exists "public read order items" on order_items;
create policy "public read order items" on order_items for select to anon using (true);

drop policy if exists "owner manage alerts" on alerts;
create policy "owner manage alerts" on alerts for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));

drop policy if exists "anyone can contact" on contact_messages;
create policy "anyone can contact" on contact_messages for insert to anon with check (true);
drop policy if exists "authenticated can read contact" on contact_messages;
create policy "authenticated can read contact" on contact_messages for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: one public bucket for menu photos / venue logos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('serva-media', 'serva-media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects for select
  using (bucket_id = 'serva-media');
drop policy if exists "authenticated upload media" on storage.objects;
create policy "authenticated upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'serva-media');
drop policy if exists "authenticated update media" on storage.objects;
create policy "authenticated update media" on storage.objects for update to authenticated
  using (bucket_id = 'serva-media');
drop policy if exists "authenticated delete media" on storage.objects;
create policy "authenticated delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'serva-media');

-- ---------------------------------------------------------------------------
-- Realtime: broadcast changes on the tables the live dashboard/tracker watch
-- ---------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table orders; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table order_items; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table table_sessions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table alerts; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table floor_objects; exception when others then null; end $$;

-- ============================================================================
-- Done. Verify with: select 1 from information_schema.tables where table_name = 'venues';
-- ============================================================================
