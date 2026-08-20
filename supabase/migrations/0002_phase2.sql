-- ============================================================================
-- Phase 2 additions: centralized low-stock trigger, purchase-order receiving,
-- and stock-take application. Run once in Supabase SQL Editor after
-- 0001_init.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Low-stock trigger — fires on ANY ingredient stock change (sale, receiving,
-- stock-take, manual edit), not just the sale path. Replaces the inline
-- check that place_order used to do itself.
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

-- ---------------------------------------------------------------------------
-- place_order — re-declared without the inline low-stock check (the trigger
-- above now covers it for every stock-changing path uniformly).
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
-- Owner: receive a purchase order — atomically bumps ingredient stock,
-- records a stock_movement per line, and prices the PO from what was
-- actually received.
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
    return v_po;
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
-- Owner: apply a physical stock-take — writes only the ingredients whose
-- counted quantity actually differs, each as a 'count' movement.
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
    if v_current is null then
      continue;
    end if;
    v_delta := v_counted - v_current;
    if v_delta = 0 then
      continue;
    end if;

    update ingredients set stock_qty = v_counted where id = v_ingredient_id;
    insert into stock_movements (venue_id, ingredient_id, delta, reason, note)
    values (p_venue_id, v_ingredient_id, v_delta, 'count', 'Stock take');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function receive_purchase_order(uuid) to authenticated;
grant execute on function apply_stock_take(uuid, jsonb) to authenticated;

-- ============================================================================
-- Done. Verify with: select proname from pg_proc where proname in
-- ('receive_purchase_order','apply_stock_take','trg_check_low_stock');
-- ============================================================================
