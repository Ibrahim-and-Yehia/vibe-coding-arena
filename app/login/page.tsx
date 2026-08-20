import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in — Serva" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Access your venue's dashboard."
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
