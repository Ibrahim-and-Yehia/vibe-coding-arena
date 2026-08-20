import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomerApp } from "@/components/order/customer-app";

export async function generateMetadata(props: PageProps<"/order/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const admin = createAdminClient();
  const { data: venue } = await admin.from("venues").select("name").eq("slug", slug).maybeSingle();
  return { title: venue ? `Order — ${venue.name}` : "Order" };
}

export default async function OrderPage(props: PageProps<"/order/[slug]">) {
  const { slug } = await props.params;
  const admin = createAdminClient();

  const { data: venue } = await admin.from("venues").select("*").eq("slug", slug).maybeSingle();
  if (!venue) notFound();

  const [{ data: categories }, { data: items }, { data: options }] = await Promise.all([
    admin.from("menu_categories").select("*").eq("venue_id", venue.id).eq("is_active", true).order("sort_order"),
    admin.from("menu_items").select("*").eq("venue_id", venue.id).order("sort_order"),
    admin.from("menu_item_options").select("*").order("sort_order"),
  ]);

  return (
    <CustomerApp
      venue={venue}
      categories={categories ?? []}
      items={items ?? []}
      options={options ?? []}
    />
  );
}
