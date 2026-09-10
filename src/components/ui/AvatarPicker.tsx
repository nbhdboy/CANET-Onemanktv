"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AVATAR_PRESETS } from "@/lib/constants";
import { isPhotoAvatar } from "@/lib/avatar";
import { Avatar } from "@/components/ui/Avatar";

async function cropToBlob(
  imageSrc: string,
  crop: Area,
  mime: "image/jpeg" | "image/webp" = "image/jpeg",
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法讀取圖片"));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法處理圖片");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, 0.82),
  );
  if (!blob) throw new Error("壓縮失敗");
  return blob;
}

export function AvatarPicker({
  value,
  onChange,
  tone = "light",
}: {
  value: string;
  onChange: (next: string) => void;
  tone?: "light" | "onDark";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const labelCls = tone === "onDark" ? "text-sm font-medium text-white" : "text-sm font-medium";
  const helpCls = tone === "onDark" ? "text-xs text-white/70" : "text-xs text-[var(--muted)]";

  const onCropComplete = useCallback((_: Area, area: Area) => {
    setCroppedArea(area);
  }, []);

  function pickFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("僅支援 JPG／PNG／WebP");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("原圖請小於 8MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setRawSrc(url);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  async function confirmCrop() {
    if (!rawSrc || !croppedArea || pending) return;
    setPending(true);
    setError(null);
    try {
      const blob = await cropToBlob(rawSrc, croppedArea);
      const body = new FormData();
      body.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/avatars/upload", { method: "POST", body });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || "上傳失敗");
      }
      onChange(data.url);
      URL.revokeObjectURL(rawSrc);
      setRawSrc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
    } finally {
      setPending(false);
    }
  }

  function cancelCrop() {
    if (rawSrc) URL.revokeObjectURL(rawSrc);
    setRawSrc(null);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar presetId={value} nickname="預覽" size={72} />
        <div className="space-y-1">
          <p className={labelCls}>頭像</p>
          <p className={helpCls}>可選貼圖，或上傳照片（會裁成正方形並壓縮）</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {AVATAR_PRESETS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={`h-12 w-12 rounded-full text-xl ${
              value === a.id && !isPhotoAvatar(value) ? "ring-2 ring-purple-700 ring-offset-2" : ""
            }`}
            style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
            aria-label={a.id}
          >
            {a.emoji}
          </button>
        ))}
      </div>

      <label className={tone === "onDark" ? `${helpCls} inline-flex cursor-pointer` : "inline-flex cursor-pointer"}>
        <span
          className={
            tone === "onDark"
              ? "inline-flex h-11 items-center border border-white px-4 text-sm font-semibold text-white"
              : "inline-flex h-11 items-center rounded-2xl border px-4 text-sm font-semibold"
          }
        >
          上傳照片
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] || null)}
        />
      </label>

      {error ? (
        <p className={tone === "onDark" ? "text-sm text-amber-100" : "text-sm text-rose-600"}>{error}</p>
      ) : null}

      {rawSrc ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-5 text-[#1a1040]">
            <p className="font-semibold">裁切頭像</p>
            <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-black">
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="block text-sm">
              縮放
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={cancelCrop}
                className="h-11 flex-1 rounded-2xl border font-semibold disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmCrop}
                className="h-11 flex-1 rounded-2xl neon-gradient font-semibold text-white disabled:opacity-60"
              >
                {pending ? "上傳中…" : "使用此照片"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
