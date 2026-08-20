"use client";

import { useSyncExternalStore } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, ExternalLink, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// The QR has to encode an absolute URL, which only the browser knows. Read it
// as external state so there's no hydration mismatch and no setState-in-effect.
const noopSubscribe = () => () => {};

export function VenueQr({ slug, venueName }: { slug: string; venueName: string }) {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => ""
  );

  const url = origin ? `${origin}/order/${slug}` : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-white p-6 print:border-0">
        <span className="text-lg font-semibold text-black">{venueName}</span>
        {url && <QRCodeCanvas value={url} size={180} level="M" includeMargin />}
        <span className="text-sm text-neutral-600">Scan to view the menu and order</span>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }}
        >
          <Copy className="size-4" />
          Copy link
        </Button>
        <Button variant="outline" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Open
          </a>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      <p className="text-xs break-all text-muted-foreground print:hidden">{url}</p>
    </div>
  );
}
