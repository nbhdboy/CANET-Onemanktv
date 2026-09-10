import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getSupabaseBrowserConfig } from "@/lib/supabase/env";
import { isManagedAvatarUrl, storagePathFromPublicUrl } from "@/lib/avatar";
import { logApp, logAppError } from "@/lib/log";
import { useSupabaseApp } from "@/lib/runtime";

const BUCKET = "avatars";

export async function saveAvatarImage(input: {
  userId: string;
  bytes: Buffer;
  contentType: string;
  previousUrl?: string | null;
}) {
  const ext =
    input.contentType.includes("png")
      ? "png"
      : input.contentType.includes("webp")
        ? "webp"
        : "jpg";
  const objectPath = `${input.userId}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  let publicUrl: string;

  if (useSupabaseApp()) {
    const client = createSupabaseServiceClient();
    const config = getSupabaseBrowserConfig();
    if (!client || !config) throw new Error("尚未設定 Supabase Storage。");

    const { error } = await client.storage.from(BUCKET).upload(objectPath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });
    if (error) {
      logAppError("avatar.upload_failed", { userId: input.userId, message: error.message });
      throw new Error(error.message);
    }
    const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
    publicUrl = data.publicUrl;
  } else {
    const dir = path.join(process.cwd(), "public", "uploads", "avatars", input.userId);
    await mkdir(dir, { recursive: true });
    const filename = path.basename(objectPath);
    await writeFile(path.join(dir, filename), input.bytes);
    publicUrl = `/uploads/avatars/${input.userId}/${filename}`;
  }

  if (input.previousUrl && isManagedAvatarUrl(input.previousUrl)) {
    await deleteAvatarImage(input.previousUrl).catch((e) => {
      logAppError("avatar.delete_old_failed", {
        userId: input.userId,
        message: e instanceof Error ? e.message : String(e),
      });
    });
  }

  logApp("avatar.saved", { userId: input.userId, url: publicUrl });
  return publicUrl;
}

export async function deleteAvatarImage(url: string) {
  const objectPath = storagePathFromPublicUrl(url);
  if (!objectPath) return;

  if (url.startsWith("/uploads/avatars/")) {
    const file = path.join(process.cwd(), "public", "uploads", "avatars", objectPath);
    await unlink(file).catch(() => undefined);
    return;
  }

  const client = createSupabaseServiceClient();
  if (!client) return;
  const { error } = await client.storage.from(BUCKET).remove([objectPath]);
  if (error) throw new Error(error.message);
}
