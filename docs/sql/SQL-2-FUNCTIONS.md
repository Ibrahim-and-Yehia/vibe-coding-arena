# SQL 2 of 3 — Functions and triggers

**Where:** Supabase Dashboard → SQL Editor → New query → paste → Run.
**Run SQL-1 first.**

These are the business rules. They live in the database on purpose: an order and its stock
deduction must commit together, and order numbering must be race-free.

---

## Paste this

```sql
-- ============================================================================
-- SERVA — 2/3 FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Per-venue sequential counters. A single UPDATE ... RETURNING is atomic, so
-- two simultaneous orders can never receive the same number.
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
-- Onboarding: create the venue and link it to the signed-in owner in one step.
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
-- Customer claims a table. The partial unique index from SQL-1 does the real
-- work: a simultaneous second claim violates it and we translate that into a
-- clean TABLE_TAKEN error the UI can show.
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
-- Place an order. Everything here commits together: the order, its lines, the
-- wait-time target, per-item stock, recipe ingredient deduction, the stock
-- movement log, and the new_order alert.
--
-- p_items shape:
--   [{ "menu_item_id": uuid, "qty": int, "note": text,
--      "options": [{ "group_name": t, "option_name": t, "price_delta": n }] }]
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

  -- Pass 1: compute the wait-time target and the order total.
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

  -- Pass 2: write the lines and move stock.
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
      where id = v_recipe.ingredient_id;

      insert into stock_movements (venue_id, ingredient_id, delta, reason, note)
      values (v_venue_id, v_recipe.ingredient_id, -(v_recipe.qty_per_unit * v_qty), 'sale',
              'Order #' || v_order_number);
    end loop;
  end loop;

  perform emit_alert(v_venue_id, 'new_order', v_order.id, v_table_label,
    'New order #' || v_order_number || ' — Table ' || coalesce(v_table_label, '?'), 'info');

  return jsonb_build_object('order', to_jsonb(v_order), 'items', v_order_items);
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner advances an order. Stamps the right timestamp and announces "ready".
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
-- Called on every dashboard poll. Raises one order_late alert per overdue
-- order, exactly once (the NOT EXISTS guard prevents spam).
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

-- ---------------------------------------------------------------------------
-- Receiving a purchase order: bump stock, log a movement per line, and price
-- the PO from what actually arrived.
-- ---------------------------------------------------------------------------
create or replace function receive_purchase_order(p_po_id uuid) returns purchase_orders
language plpgsql security definer set search_path = public as $$
declare
  v_po purchase_orders%rowtype;
  v_line record;
  v_total numeric := 0;
  v_caller_venue uuid;
begin
  select venue_id into v_caller_venue from profiles where id = auth.uid();

  select * into v_po from purchase_orders where id = p_po_id;
  if v_po.id is null then
    raise exception 'PO_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_po.venue_id <> v_caller_venue then
    raise exception 'NOT_YOUR_VENUE' using errcode = 'P0001';
  end if;
  if v_po.status = 'received' then
    return v_po;   -- already received; make this idempotent
  end if;

  for v_line in select * from po_lines where purchase_order_id = p_po_id
  loop
    update ingredients set stock_qty = stock_qty + v_line.qty where id = v_line.ingredient_id;

    insert into stock_movements (venue_id, ingredient_id, delta, reason, note)
    values (v_po.venue_id, v_line.ingredient_id, v_line.qty, 'receive', 'PO received');

    v_total := v_total + (v_line.qty * v_line.unit_cost);
  end loop;

  update purchase_orders set status = 'received', received_at = now(), total_cost = v_total
  where id = p_po_id
  returning * into v_po;

  return v_po;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stock take. Only writes ingredients whose counted quantity actually differs.
-- p_counts: [{ "ingredient_id": uuid, "counted_qty": number }]
-- ---------------------------------------------------------------------------
create or replace function apply_stock_take(p_venue_id uuid, p_counts jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_ingredient_id uuid;
  v_counted numeric;
  v_current numeric;
  v_delta numeric;
  v_count int := 0;
  v_caller_venue uuid;
begin
  select venue_id into v_caller_venue from profiles where id = auth.uid();
  if p_venue_id <> v_caller_venue then
    raise exception 'NOT_YOUR_VENUE' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_counts)
  loop
    v_ingredient_id := (v_item->>'ingredient_id')::uuid;
    v_counted := (v_item->>'counted_qty')::numeric;

    select stock_qty into v_current from ingredients where id = v_ingredient_id and venue_id = p_venue_id;
    if v_current is null then continue; end if;

    v_delta := v_counted - v_current;
    if v_delta = 0 then continue; end if;

    update ingredients set stock_qty = v_counted where id = v_ingredient_id;
    insert into stock_movements (venue_id, ingredient_id, delta, reason, note)
    values (p_venue_id, v_ingredient_id, v_delta, 'count', 'Stock take');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Low stock alerting lives in a TRIGGER, not in place_order, so it fires on
-- every path that changes stock: sales, receiving, stock takes, manual edits.
-- The unread-duplicate guard stops it re-alerting on every single sale.
-- ---------------------------------------------------------------------------
create or replace function trg_check_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stock_qty <= new.low_threshold and not exists (
    select 1 from alerts
    where venue_id = new.venue_id and kind = 'low_stock' and ref_id = new.id and is_read = false
  ) then
    perform emit_alert(new.venue_id, 'low_stock', new.id, null,
      new.name || ' is running low (' || new.stock_qty || ' ' || new.unit || ' left)', 'warning');
  end if;
  return new;
end;
$$;

drop trigger if exists on_ingredient_stock_change on ingredients;
create trigger on_ingredient_stock_change
  after update of stock_qty on ingredients
  for each row execute function trg_check_low_stock();
```

---

## Verify it worked

Should return `12`:

```sql
select count(*) from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'next_order_number','next_alert_number','emit_alert',
    'create_venue_and_link_owner','claim_table','free_table','call_waiter',
    'place_order','advance_order_status','check_late_orders',
    'receive_purchase_order','apply_stock_take'
  );
```

And the trigger:

```sql
select tgname from pg_trigger where tgname = 'on_ingredient_stock_change';
```
