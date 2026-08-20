import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Map,
  Bell,
  QrCode,
  Clock,
  Package,
  ChefHat,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroFloor } from "@/components/marketing/hero-floor";

const PILLARS = [
  {
    icon: BookOpen,
    title: "Menu & inventory that agree with each other",
    body: "Build your menu once. Attach recipes so selling a dish deducts the exact ingredients behind it, and get warned before you run out — not after a customer orders it.",
    points: ["Categories, photos, options, prep times", "Recipes with live cost and margin per dish", "Suppliers, purchase orders, stock takes"],
  },
  {
    icon: Map,
    title: "Draw your floor. Watch it come alive.",
    body: "Lay out your room from the top down — tables, kitchen, bar, entrance. The moment you save, that same plan becomes your live operations view.",
    points: ["Drag, resize, rotate, duplicate", "Multiple areas: indoor, terrace, rooftop", "Colour-coded the second an order lands"],
  },
  {
    icon: Bell,
    title: "Know which table is about to be unhappy",
    body: "Every order carries a target time calculated from what was actually ordered and how busy the kitchen is. A ring counts down green to amber to red, so you act before anyone complains.",
    points: ["Numbered orders, tap for full detail", "Alerts for late orders, waiter calls, low stock", "Kitchen display with one-tap status"],
  },
];

const STEPS = [
  { icon: QrCode, title: "Put your QR on the tables", body: "One code for your venue. Customers open it, enter their name and pick a free table." },
  { icon: ChefHat, title: "Orders land instantly", body: "Their order appears on your floor plan and kitchen display within a second, numbered and timed." },
  { icon: Check, title: "Move it along, free the table", body: "Advance queue → preparing → ready → delivered, then free the table when they leave." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-16 pb-20 sm:pt-24">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            For cafes, restaurants, and bars
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Run your floor, live.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Your menu, your stock, and every open order on one top-down plan of your own room — updating
            the instant a customer orders.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Set up your venue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14">
          <HeroFloor />
          <p className="mt-3 text-center text-sm text-muted-foreground">
            A live floor plan — orders landing, timers running warm, tables turning over.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              The information exists. It&apos;s just scattered.
            </h2>
            <p className="mt-4 text-muted-foreground">
              A ticket on a spike. A number in someone&apos;s head. A stock count nobody did. By the time you
              notice table nine has been waiting twenty-five minutes, they&apos;ve already noticed.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              "Which table did that order belong to again?",
              "How long has table six actually been waiting?",
              "Are we out of salmon? Since when?",
              "What does this dish actually cost us to make?",
            ].map((q) => (
              <div key={q} className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
                {q}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="flex flex-col gap-16">
          {PILLARS.map(({ icon: Icon, title, body, points }, i) => (
            <div key={title} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>div:first-child]:order-2" : ""}`}>
              <div>
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-balance">{title}</h3>
                <p className="mt-3 text-muted-foreground">{body}</p>
              </div>
              <ul className="flex flex-col gap-3">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-3 rounded-lg border p-4">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <Card key={title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </div>
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="pt-2">{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Extras */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, title: "Smart timing", body: "Targets from real prep times, adjusted for kitchen load." },
            { icon: Package, title: "Recipe costing", body: "See margin per dish as you price it." },
            { icon: ChefHat, title: "Kitchen display", body: "Big tickets, one tap to advance." },
            { icon: QrCode, title: "One QR per venue", body: "Print it, place it, done." },
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
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-5 py-20 text-center">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
            Set up your venue in about five minutes.
          </h2>
          <p className="max-w-lg text-muted-foreground">
            Pick your type and we&apos;ll start you with a menu and a floor plan that already look like your
            place. Change anything.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
