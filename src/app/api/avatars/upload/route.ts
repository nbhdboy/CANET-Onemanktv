import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadProfile, updatePublicProfileApp } from "@/lib/app-data";
import { saveAvatarImage } from "@/lib/avatars/store";
import { useSupabaseApp } from "@/lib/runtime";
import { updateSupabaseProfile } from "@/lib/supabase/profiles";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "請先登入" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "請選擇圖片" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ ok: false, error: "僅支援 JPG／PNG／WebP" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "圖片請小於 5MB" }, { status: 400 });
    }

    const profile = await loadProfile(session.id);
    const bytes = Buffer.from(await file.arrayBuffer());
    const url = await saveAvatarImage({
      userId: session.id,
      bytes,
      contentType: file.type,
      previousUrl: profile?.avatar_url,
    });

    if (useSupabaseApp()) {
      await updateSupabaseProfile(session.id, { avatar_url: url });
    } else {
      await updatePublicProfileApp(session.id, {
        nickname: profile?.nickname || "歌友",
        avatar_url: url,
      });
    }

    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "上傳失敗" },
      { status: 500 },
    );
  }
}
