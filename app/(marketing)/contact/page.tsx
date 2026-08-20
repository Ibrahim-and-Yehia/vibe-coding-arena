import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, PlayCircle, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact — Serva" };

export default function ContactPage() {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-12 px-5 py-16 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">Get in touch</h1>
        <p className="mt-4 text-muted-foreground">
          Questions about whether this fits your venue, or want a walkthrough? Send us a note.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <PlayCircle className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium">Try it right now</div>
                <p className="text-sm text-muted-foreground">
                  <Link href="/signup" className="underline underline-offset-4">
                    Set up a venue
                  </Link>{" "}
                  and have it running in about five minutes.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium">See what&apos;s included</div>
                <p className="text-sm text-muted-foreground">
                  The{" "}
                  <Link href="/features" className="underline underline-offset-4">
                    features page
                  </Link>{" "}
                  covers every part in detail.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <MessageSquare className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium">Typical reply time</div>
                <p className="text-sm text-muted-foreground">One business day.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <ContactForm />
      </div>
    </section>
  );
}
