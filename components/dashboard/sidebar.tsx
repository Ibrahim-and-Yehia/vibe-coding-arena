"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  BookOpen,
  Package,
  ClipboardList,
  ChefHat,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVenue } from "@/components/dashboard/venue-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/floor", label: "Floor Plan", icon: Map },
  { href: "/dashboard/menu", label: "Menu", icon: BookOpen },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const venue = useVenue();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Serva</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="truncate text-sm font-medium">{venue.name}</div>
        <div className="text-xs text-muted-foreground capitalize">{venue.business_type}</div>
      </div>
    </aside>
  );
}
