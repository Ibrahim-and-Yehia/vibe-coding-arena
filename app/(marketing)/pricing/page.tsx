import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing — Serva" };

const TIERS = [
  {
    name: "Counter",
    price: "29",
    blurb: "Single-room cafes and small bars finding their feet.",
    features: [
      "Up to 15 tables",
      "Full menu builder with photos and options",
      "Item-level stock tracking",
      "One floor plan area",
      "Live floor and order tracking",
      "Customer QR ordering",
    ],
  },
  {
    name: "Service",
    price: "79",
    blurb: "Full-service restaurants running a real kitchen.",
    featured: true,
    features: [
      "Unlimited tables and areas",
      "Everything in Counter, plus:",
      "Ingredient inventory with recipes",
      "Cost per dish and margin tracking",
      "Suppliers, purchase orders, stock takes",
      "Kitchen display screen",
      "Wait-time targets and late alerts",
    ],
  },
  {
    name: "Group",
    price: "199",
    blurb: "Multiple venues under one roof.",
    features: [
      "Everything in Service, plus:",
      "Multiple venues on one account",
      "Cross-venue reporting",
      "Custom SLA rules per venue",
      "Priority support",
    ],
  },
];

const FAQ = [
  ["Do I need special hardware?", "No. It runs in a browser — a laptop or tablet for the floor view, and your customers use their own phones for the QR menu."],
  ["Do customers need to install anything?", "No. The QR code opens a normal web page."],
  ["Can I change my menu during service?", "Yes. Edits are live immediately, including hiding an item that's just run out."],
  ["How is the wait-time target calculated?", "From the prep time of the slowest item in the order, plus a small amount per extra item, scaled up when the kitchen already has orders in the queue."],
  ["What happens when a table is freed?", "The sitting closes and the table becomes selectable again on the customer ordering page. Only staff can free a table."],
];

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Simple pricing, per venue
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Everything is included at every tier — the difference is scale.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <Card key={tier.name} className={cn(tier.featured && "border-primary shadow-lg")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.featured && <Badge>Most popular</Badge>}
                </div>
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-semibold">${tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>{tier.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex flex-col gap-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={tier.featured ? "default" : "outline"} asChild>
                  <Link href="/signup">Start with {tier.name}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-3xl px-5 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Common questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Still deciding?</h2>
        <p className="text-muted-foreground">Set up a venue and see it running with your own menu.</p>
        <Button size="lg" asChild>
          <Link href="/login">
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  );
}
