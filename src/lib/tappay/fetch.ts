import { logAppError } from "@/lib/log";

/** 對 TapPay 發出請求；把 Node fetch failed 轉成可讀錯誤（含 host／cause）。 */
export async function tapPayFetch(url: string, init: RequestInit): Promise<Response> {
  const trimmed = url.trim();
  let host = trimmed;
  try {
    host = new URL(trimmed).host;
  } catch {
    throw new Error(`TapPay API 網址格式錯誤：${trimmed || "(空)"}`);
  }

  try {
    return await fetch(trimmed, init);
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const causeCode = err.cause?.code || "";
    const causeMsg = err.cause?.message || err.message || "fetch failed";
    logAppError("tappay.fetch_failed", {
      host,
      url: trimmed,
      causeCode,
      causeMsg,
    });
    throw new Error(
      `無法連線 TapPay（${host}）${causeCode ? ` [${causeCode}]` : ""}：${causeMsg}。請確認 Vercel 的 TAPPAY_*_URL 與 NEXT_PUBLIC_TAPPAY_ENV 是否同為 sandbox 或 production。`,
    );
  }
}
