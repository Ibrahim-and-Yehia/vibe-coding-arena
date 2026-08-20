"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CURRENCIES } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VenueRow } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Required"),
  kitchen_label: z.string().min(1, "Required"),
  currency: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export function SettingsForm({ venue }: { venue: VenueRow }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: venue.name, kitchen_label: venue.kitchen_label, currency: venue.currency },
  });

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { error } = await supabase.from("venues").update(values).eq("id", venue.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Venue name</FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.kitchen_label}>
          <FieldLabel htmlFor="kitchen_label">Prep station label</FieldLabel>
          <Input id="kitchen_label" {...register("kitchen_label")} />
          <FieldDescription>Shown on the kitchen display — &quot;Kitchen&quot;, &quot;Bar&quot;, whatever fits.</FieldDescription>
          <FieldError errors={[errors.kitchen_label]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="currency">Currency</FieldLabel>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Field>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
