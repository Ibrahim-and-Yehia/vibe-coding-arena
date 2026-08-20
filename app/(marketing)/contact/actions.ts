"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/action-result";

export async function submitContact(input: {
  name: string;
  email: string;
  businessName: string;
  message: string;
}): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    business_name: input.businessName || null,
    message: input.message,
  });
  if (error) return { error: error.message };
  return {};
}
