import { createClient } from "@/lib/supabase/client";

const BUCKET = "serva-media";

export async function uploadMedia(file: File, folder: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
