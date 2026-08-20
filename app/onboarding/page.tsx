import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Set up your venue — Serva" };

export default function OnboardingPage() {
  return (
    <AuthShell title="Set up your venue" description="Four quick steps and you're in.">
      <OnboardingWizard />
    </AuthShell>
  );
}
