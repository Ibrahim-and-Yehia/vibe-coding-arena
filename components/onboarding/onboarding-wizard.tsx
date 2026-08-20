"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coffee, UtensilsCrossed, Martini, Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { BUSINESS_PRESETS, BUSINESS_TYPE_LABELS } from "@/lib/presets";
import { CURRENCIES } from "@/lib/currencies";
import type { BusinessType } from "@/lib/types";
import { createVenueAction } from "@/app/onboarding/actions";

const STEPS = ["Name", "Type", "Currency", "Review"] as const;

const TYPE_OPTIONS: { value: BusinessType; label: string; icon: React.ElementType; blurb: string }[] = [
  { value: "cafe", label: "Cafe", icon: Coffee, blurb: "Espresso bar, pastries, quick bites" },
  { value: "restaurant", label: "Restaurant", icon: UtensilsCrossed, blurb: "Starters, mains, table service" },
  { value: "bar", label: "Bar", icon: Martini, blurb: "Drinks-led, high-tops and stools" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [startEmpty, setStartEmpty] = useState(false);

  const canProceed =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && businessType !== null) ||
    step === 2 ||
    step === 3;

  async function handleFinish() {
    if (!businessType) return;
    setSubmitting(true);
    const result = await createVenueAction({ name: name.trim(), businessType, currency, startEmpty });
    if (result?.error) {
      toast.error(result.error);
      setSubmitting(false);
      return;
    }
    router.refresh();
  }

  const preset = businessType ? BUSINESS_PRESETS[businessType] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="flex justify-between text-xs text-muted-foreground">
          {STEPS.map((label, i) => (
            <span key={label} className={cn(i === step && "font-medium text-foreground")}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="venue-name">What&apos;s your venue called?</FieldLabel>
            <Input
              id="venue-name"
              autoFocus
              placeholder="The Copper Fork"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldDescription>
              Customers will reach your menu at serva.app/order/{slugify(name || "your-venue")}
            </FieldDescription>
          </Field>
        </FieldGroup>
      )}

      {step === 1 && (
        <div className="grid gap-3">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon, blurb }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBusinessType(value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                businessType === value && "border-primary bg-accent"
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{blurb}</div>
              </div>
              {businessType === value && <Check className="size-5 text-primary" />}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Change this later any time in settings.</FieldDescription>
          </Field>
        </FieldGroup>
      )}

      {step === 3 && preset && businessType && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <div className="font-medium">{name}</div>
            <div className="text-sm text-muted-foreground">
              {BUSINESS_TYPE_LABELS[businessType]} · {currency}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStartEmpty(false)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                !startEmpty && "border-primary bg-accent"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Start with a suggested setup</span>
                {!startEmpty && <Check className="size-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                A starter menu ({preset.items.length} items across {preset.categories.length} categories)
                and a floor plan ({preset.floorObjects.length} objects across {preset.areas.length} areas),
                all editable straight away.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStartEmpty(true)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
                startEmpty && "border-primary bg-accent"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Start from scratch</span>
                {startEmpty && <Check className="size-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                An empty venue. You build your own menu, inventory and floor plan from nothing.
              </p>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleFinish} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create my venue
          </Button>
        )}
      </div>
    </div>
  );
}
