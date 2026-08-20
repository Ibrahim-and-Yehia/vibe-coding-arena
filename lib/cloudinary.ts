import "server-only";
import crypto from "node:crypto";

// Signed upload, server-side only — the API secret never reaches the
// browser. A signature is required parameters (alphabetical, excluding
// file/api_key/signature/resource_type) + the secret, SHA-1 hex-digested.
// See: https://cloudinary.com/documentation/authentication_signatures

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadImageToCloudinary(file: File, folder: string): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error("Cloudinary is not configured — check CLOUDINARY_* env vars.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + API_SECRET)
    .digest("hex");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data: { secure_url?: string; error?: { message?: string } } = await res.json();

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "Image upload failed");
  }
  return data.secure_url;
}
