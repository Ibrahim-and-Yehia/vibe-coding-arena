"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, X } from "lucide-react";
import { uploadMenuItemImage } from "@/app/dashboard/menu/actions";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * A photo placeholder that IS the upload control — click it (or press
 * Enter/Space) to open the file picker, no separate "choose file" input.
 * Uploads straight to Cloudinary via a signed server action.
 */
export function ImagePicker({
  value,
  onChange,
  size = "size-20",
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  size?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadMenuItemImage(formData);
    setUploading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    onChange(result.url!);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={value ? "Change photo" : "Add photo"}
      onClick={() => !uploading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (uploading) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "group relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size,
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="size-full object-cover" />
      ) : (
        <Camera className="size-5 text-muted-foreground" />
      )}

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100",
          uploading && "opacity-100"
        )}
      >
        {uploading ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
      </div>

      {value && !uploading && (
        <button
          type="button"
          aria-label="Remove photo"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
          }}
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
