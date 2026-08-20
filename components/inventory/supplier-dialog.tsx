"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { upsertSupplier } from "@/app/dashboard/inventory/actions";
import type { SupplierRow } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Required"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierRow | null;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: supplier?.name ?? "",
      contact_name: supplier?.contact_name ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
    });
  }, [open, supplier, reset]);

  async function onSubmit(values: FormValues) {
    const result = await upsertSupplier({
      id: supplier?.id,
      name: values.name,
      contact_name: values.contact_name || null,
      phone: values.phone || null,
      email: values.email || null,
    });
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Saved");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
          <DialogDescription>Who you order ingredients from.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="s-name">Name</FieldLabel>
              <Input id="s-name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="s-contact">Contact name</FieldLabel>
              <Input id="s-contact" {...register("contact_name")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="s-phone">Phone</FieldLabel>
                <Input id="s-phone" {...register("phone")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="s-email">Email</FieldLabel>
                <Input id="s-email" type="email" {...register("email")} />
              </Field>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
