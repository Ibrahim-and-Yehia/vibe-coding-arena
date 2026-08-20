import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Package, Map, Bell, ChefHat, QrCode, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Features — Serva" };

const GROUPS = [
  {
    icon: BookOpen,
    title: "Menu",
    features: [
      ["Categories and ordering", "Group your menu the way customers read it, and reorder any time."],
      ["Photos", "Upload an image per item; it shows on the customer menu."],
      ["Options", "Size, doneness, add-ons — each with its own price adjustment."],
      ["Prep times", "Per item, feeding the wait-time engine."],
      ["Availability", "Hide an item instantly, or let stock hide it for you."],
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    features: [
      ["Ingredients", "Units, stock on hand, cost per unit, low thresholds."],
      ["Recipes", "Link ingredients to dishes; selling deducts stock automatically."],
      ["Cost & margin", "Live cost per dish and margin at your current price."],
      ["Suppliers", "Who you buy from, with contact details."],
      ["Purchase orders", "Draft, mark ordered, receive — receiving updates stock atomically."],
      ["Stock takes", "Enter counted quantities, see variance, apply in one go."],
    ],
  },
  {
    icon: Map,
    title: "Floor plan",
    features: [
      ["Visual editor", "Drag, resize, rotate, duplicate on a snap-to-grid canvas."],
      ["Tables & fixtures", "Round, square, long, bar stools, plus kitchen, bar, entrance, restrooms."],
      ["Multiple areas", "Indoor, terrace, rooftop — tabbed and independent."],
      ["Templates", "Start from a layout that suits your venue type."],
      ["Live mode", "The exact plan you drew, colour-coded by table state."],
    ],
  },
  {
    icon: Bell,
    title: "Orders & alerts",
    features: [
      ["Numbered orders", "Every order and alert carries a number you can call out."],
      ["Countdown rings", "Green to amber to red against a target from real prep times."],
      ["Table sessions", "One sitting, many orders, a running total."],
      ["Alert sidebar", "New orders, late warnings, waiter calls, low stock."],
      ["Kitchen display", "Queued / Preparing / Ready columns, one tap to advance."],
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Everything, in one place
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Built around how service actually runs — not a spreadsheet with a menu bolted on.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <div className="flex flex-col gap-12">
          {GROUPS.map(({ icon: Icon, title, features }) => (
            <div key={title}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {features.map(([name, body]) => (
                  <Card key={name}>
                    <CardHeader>
                      <CardTitle className="text-base">{name}</CardTitle>
                      <CardDescription>{body}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">For your customers</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: QrCode, title: "No app to install", body: "One QR opens the menu in their browser." },
              { icon: Users, title: "They pick their table", body: "Only genuinely free tables are selectable." },
              { icon: Clock, title: "They can watch it", body: "A live status timeline with an honest ETA." },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardContent className="flex flex-col gap-2 pt-6">
                  <Icon className="size-5 text-primary" />
                  <div className="font-medium">{title}</div>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-16 text-center">
        <ChefHat className="size-8 text-primary" />
        <h2 className="text-2xl font-semibold tracking-tight">Ready to see it running?</h2>
        <Button size="lg" asChild>
          <Link href="/signup">
            Set up your venue
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  );
}
