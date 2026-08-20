"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MailCheck } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(1, "Enter your name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    // Email confirmation is required on this project — no session yet.
    setPendingConfirmation(true);
  }

  if (pendingConfirmation) {
    return (
      <Alert>
        <MailCheck className="size-4" />
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>
          We sent a confirmation link to finish setting up your account. Once confirmed, sign in to
          continue to onboarding.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="fullName">Your name</FieldLabel>
          <Input id="fullName" autoComplete="name" placeholder="Jamie Rivera" {...register("fullName")} />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" placeholder="you@venue.com" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          <FieldError errors={[errors.password]} />
        </Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Create account
        </Button>
      </FieldGroup>
    </form>
  );
}
