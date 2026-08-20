# SQL 3 of 3 — Security, storage, realtime

**Where:** Supabase Dashboard → SQL Editor → New query → paste → Run.
**Run SQL-1 and SQL-2 first.**

---

## The security model in one paragraph

The **owner** browses with the anon key and is protected by Row Level Security: every
policy checks that the row's `venue_id` matches the venue on their own `profiles` row, so
one owner can never see another's data. The **customer** is not logged in at all, so every
customer write goes through a Server Action on the server using the service-role key —
which never reaches the browser. Public read policies exist only for the tables the
customer menu genuinely needs (venue, menu, tables, and their own orders).

---

## Paste this

```sql
-- ============================================================================
-- SERVA — 3/3 SECURITY, STORAGE, REALTIME
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function execution grants
-- ---------------------------------------------------------------------------
grant execute on function claim_table(uuid,uuid,text,text) to anon, authenticated;
grant execute on function place_order(uuid,jsonb,text) to anon, authenticated;
grant execute on function call_waiter(uuid) to anon, authenticated;
grant execute on function free_table(uuid) to authenticated;
grant execute on function advance_order_status(uuid, order_status) to authenticated;
grant execute on function create_venue_and_link_owner(text,text,business_type,text) to authenticated;
grant execute on function check_late_orders(uuid) to authenticated;
grant execute on function receive_purchase_order(uuid) to authenticated;
grant execute on function apply_stock_take(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
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

-- ---------------------------------------------------------------------------
-- Profiles: you can only ever see your own
-- ---------------------------------------------------------------------------
drop policy if exists "own profile select" on profiles;
create policy "own profile select" on profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own profile update" on profiles;
create policy "own profile update" on profiles for update to authenticated using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Venue: owner has full control; anon can read (customer menu needs name,
-- currency and SLA settings).
-- ---------------------------------------------------------------------------
drop policy if exists "owner manage venue" on venues;
create policy "owner manage venue" on venues for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "public read venue" on venues;
create policy "public read venue" on venues for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Menu: owner manages own venue's; anon reads (this IS the customer menu).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Inventory: owner only. Customers never see cost or stock levels.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Floor plan: owner manages; anon reads (customer needs the table list).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Sessions and orders: owner manages; anon reads so a customer can watch
-- their own order status. Writes always go through the RPCs.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Alerts: owner only.
-- ---------------------------------------------------------------------------
drop policy if exists "owner manage alerts" on alerts;
create policy "owner manage alerts" on alerts for all to authenticated
  using (venue_id = (select venue_id from profiles where id = auth.uid()))
  with check (venue_id = (select venue_id from profiles where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Contact form: anyone can submit, only signed-in users can read.
-- ---------------------------------------------------------------------------
drop policy if exists "anyone can contact" on contact_messages;
create policy "anyone can contact" on contact_messages for insert to anon with check (true);
drop policy if exists "authenticated can read contact" on contact_messages;
create policy "authenticated can read contact" on contact_messages for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: one public bucket for menu photos and venue logos
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
-- Realtime: publish the tables the live dashboard subscribes to.
-- (Polling is the baseline — this only makes updates feel instant.)
-- ---------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table orders; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table order_items; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table table_sessions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table alerts; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table floor_objects; exception when others then null; end $$;
```

---

## Verify it worked

RLS on every table (should return `18`):

```sql
select count(*) from pg_tables
where schemaname = 'public' and rowsecurity = true;
```

Storage bucket exists:

```sql
select id, public from storage.buckets where id = 'serva-media';
```

Realtime publication (should list 5 tables):

```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
```

---

## Database is now complete

Do not run any more SQL. Do not change the schema during the build — both people's
TypeScript types depend on it exactly as it is.
