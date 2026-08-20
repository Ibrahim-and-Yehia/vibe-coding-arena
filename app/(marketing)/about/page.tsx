import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "About — Serva" };

const PRINCIPLES = [
  {
    title: "Show the room, not a list",
    body: "Hospitality happens in a physical space. A list of order IDs makes you translate; a picture of your own floor doesn't. Everything is built around the plan you drew.",
  },
  {
    title: "Warn early, not after",
    body: "A late order is only useful information before the customer notices. Targets come from what was actually ordered and how loaded the kitchen is, so amber means something.",
  },
  {
    title: "One number, everywhere",
    body: "Orders and alerts are numbered so staff can say them out loud. \"Fourteen is up\" should mean exactly one thing across the floor, the pass, and the screen.",
  },
  {
    title: "Nothing you have to babysit",
    body: "Stock deducts itself from recipes. Late alerts raise themselves. Sold-out items hide themselves. The system should be doing the bookkeeping, not you.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Software shaped like a service
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Most hospitality software asks you to think like a database. You translate your room into table
          IDs, your dishes into SKUs, and your evening into a list of rows — then translate it all back
          under pressure, mid-service.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          Serva starts from the opposite end. You draw your room. That drawing is the interface. Orders
          appear where they physically are, timers run where you can see them, and the things that need
          attention find you rather than waiting to be looked up.
        </p>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto w-full max-w-5xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">What we optimise for</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <Card key={p.title}>
                <CardContent className="flex flex-col gap-2 pt-6">
                  <div className="font-medium">{p.title}</div>
                  <p className="text-sm text-muted-foreground">{p.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Who it&apos;s for</h2>
        <p className="mt-4 text-muted-foreground">
          Independent cafes, restaurants and bars — places small enough that the owner still walks the
          floor, and busy enough that a missed ticket costs a customer. If you have between five and fifty
          tables and a kitchen or bar that people wait on, this was built for you.
        </p>
      </section>

      <section className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Have a look for yourself</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Set up your venue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
