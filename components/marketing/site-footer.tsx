import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-[0.2em] uppercase">Serva</div>
          <p className="text-sm text-muted-foreground">Run your floor, live.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
