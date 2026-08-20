"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { submitContact } from "@/app/(marketing)/contact/actions";

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  businessName: z.string().optional(),
  message: z.string().min(1, "Tell us a little about your venue"),
});
type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await submitContact({
      name: values.name,
      email: values.email,
      businessName: values.businessName ?? "",
      message: values.message,
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Alert>
        <MailCheck className="size-4" />
        <AlertTitle>Thanks — we&apos;ve got it</AlertTitle>
        <AlertDescription>We&apos;ll be in touch at the address you gave us.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input id="name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="businessName">Venue name (optional)</FieldLabel>
          <Input id="businessName" {...register("businessName")} />
        </Field>
        <Field data-invalid={!!errors.message}>
          <FieldLabel htmlFor="message">What would you like to know?</FieldLabel>
          <Textarea id="message" rows={5} {...register("message")} />
          <FieldError errors={[errors.message]} />
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Send message
        </Button>
      </FieldGroup>
    </form>
  );
}
