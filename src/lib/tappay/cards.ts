import { logApp, logAppError } from "@/lib/log";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getPublicAppUrl, getTapPayServerConfig } from "@/lib/tappay/env";
import type { TapPayChargeResult } from "@/lib/tappay/client";

export type PublicSavedCard = {
  id: string;
  last_four: string;
  brand: string | null;
  expiry_month: string | null;
  expiry_year: string | null;
};

function client() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

function brandFromType(type: unknown): string | null {
  const map: Record<number, string> = {
    1: "VISA",
    2: "Mastercard",
    3: "JCB",
    4: "Union Pay",
    5: "AMEX",
  };
  const n = Number(type);
  return map[n] || null;
}

function makeBindOrderNumber() {
  // 與 CANET 一致用 BIND_ 前綴，方便辨識與對帳
  return `BIND_${Date.now().toString(36)}`.slice(0, 20);
}

function generateBankTransactionId() {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const date =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = pad(Math.floor(Math.random() * 100));
  return `ESUN${date}${rand}`;
}

function parseExpiry(expiryDate: unknown): { month: string | null; year: string | null } {
  const raw = String(expiryDate || "");
  // TapPay 常見格式 YYYYMM（與 CANET 相同）
  if (raw.length >= 6) {
    return { year: raw.slice(2, 4), month: raw.slice(4, 6) };
  }
  if (raw.length >= 4) {
    return { month: raw.slice(0, 2), year: raw.slice(2, 4) };
  }
  return { month: null, year: null };
}

export async function getPublicSavedCard(userId: string): Promise<PublicSavedCard | null> {
  const supabase = client();
  const { data, error } = await supabase
    .from("user_cards")
    .select("id, last_four, brand, expiry_month, expiry_year, card_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.card_token || !data.last_four) return null;
  return {
    id: String(data.id),
    last_four: String(data.last_four),
    brand: data.brand ? String(data.brand) : null,
    expiry_month: data.expiry_month ? String(data.expiry_month) : null,
    expiry_year: data.expiry_year ? String(data.expiry_year) : null,
  };
}

async function upsertUserCard(input: {
  userId: string;
  cardKey: string;
  cardToken: string;
  lastFour?: string | null;
  brand?: string | null;
  expiryMonth?: string | null;
  expiryYear?: string | null;
}) {
  const supabase = client();
  const now = new Date().toISOString();
  const { error } = await supabase.from("user_cards").upsert(
    {
      user_id: input.userId,
      card_key: input.cardKey,
      card_token: input.cardToken,
      last_four: input.lastFour ?? null,
      brand: input.brand ?? null,
      expiry_month: input.expiryMonth ?? null,
      expiry_year: input.expiryYear ?? null,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export function extractCardSecret(raw: Record<string, unknown>) {
  const secret = (raw.card_secret || {}) as Record<string, unknown>;
  const info = (raw.card_info || {}) as Record<string, unknown>;
  const expiry = parseExpiry(info.expiry_date);
  return {
    cardKey: typeof secret.card_key === "string" ? secret.card_key : null,
    cardToken: typeof secret.card_token === "string" ? secret.card_token : null,
    lastFour: typeof info.last_four === "string" ? info.last_four : null,
    brand: brandFromType(info.type),
    expiryMonth: expiry.month,
    expiryYear: expiry.year,
  };
}

/** 付款成功後把 TapPay card_secret 寫入一人一卡。 */
export async function persistSavedCardForUser(input: {
  userId: string;
  replaceExisting?: boolean;
  cardKey: string;
  cardToken: string;
  lastFour?: string | null;
  brand?: string | null;
  expiryMonth?: string | null;
  expiryYear?: string | null;
}) {
  const existing = await getPublicSavedCard(input.userId);
  if (existing && !input.replaceExisting) {
    throw new Error("你已有一張存卡，請先刪除或選擇覆蓋。");
  }
  if (existing && input.replaceExisting) {
    await removeSavedCard(input.userId);
  }
  await upsertUserCard({
    userId: input.userId,
    cardKey: input.cardKey,
    cardToken: input.cardToken,
    lastFour: input.lastFour,
    brand: input.brand,
    expiryMonth: input.expiryMonth,
    expiryYear: input.expiryYear,
  });
}

export async function bindTapPayCard(input: {
  userId: string;
  prime: string;
  email?: string;
  name?: string;
  replaceExisting?: boolean;
}) {
  const existing = await getPublicSavedCard(input.userId);
  if (existing && !input.replaceExisting) {
    throw new Error("你已有一張存卡，請先刪除後再新增。");
  }
  if (existing && input.replaceExisting) {
    await removeSavedCard(input.userId);
  }

  const cfg = getTapPayServerConfig();
  const appUrl = getPublicAppUrl();
  const orderNumber = makeBindOrderNumber();

  const resp = await fetch(cfg.bindCardUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.partnerKey,
    },
    body: JSON.stringify({
      prime: input.prime,
      partner_key: cfg.partnerKey,
      merchant_id: cfg.merchantId,
      amount: 0,
      currency: "TWD",
      order_number: orderNumber,
      remember: true,
      three_domain_secure: true,
      cardholder: {
        phone_number: "",
        name: input.name || "",
        email: input.email || "",
      },
      result_url: {
        frontend_redirect_url: `${appUrl}/settings/cards/return?order=${orderNumber}`,
        backend_notify_url: `${appUrl}/api/payments/tappay/notify`,
      },
    }),
  });

  const text = await resp.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }

  if (Number(json.status) !== 0) {
    throw new Error(typeof json.msg === "string" ? json.msg : "綁卡失敗");
  }

  const card = extractCardSecret(json);
  const supabase = client();

  if (json.payment_url) {
    logApp("tappay.bind_card_3ds", {
      userId: input.userId,
      orderNumber,
      hasCardSecret: Boolean(card.cardKey && card.cardToken),
      lastFour: card.lastFour,
    });
    const { error } = await supabase.from("bind_card_temp_orders").upsert(
      {
        order_number: orderNumber,
        user_id: input.userId,
        status: "pending_3d",
        rec_trade_id: typeof json.rec_trade_id === "string" ? json.rec_trade_id : null,
        bank_transaction_id:
          typeof json.bank_transaction_id === "string" ? json.bank_transaction_id : null,
        card_key: card.cardKey,
        card_token: card.cardToken,
        last_four: card.lastFour,
        brand: card.brand,
        expiry_month: card.expiryMonth,
        expiry_year: card.expiryYear,
        tappay_status: Number(json.status),
        tappay_msg: typeof json.msg === "string" ? json.msg : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_number" },
    );
    if (error) throw new Error(error.message);
    return {
      ok: true as const,
      paymentUrl: String(json.payment_url),
      orderNumber,
    };
  }

  if (!card.cardKey || !card.cardToken) {
    throw new Error("綁卡成功但未取得卡片憑證");
  }

  await upsertUserCard({
    userId: input.userId,
    cardKey: card.cardKey,
    cardToken: card.cardToken,
    lastFour: card.lastFour,
    brand: card.brand,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
  });

  logApp("tappay.bind_card_saved", { userId: input.userId, orderNumber });
  return { ok: true as const, orderNumber };
}

export async function settleBindCardNotify(body: {
  status?: number | string;
  order_number?: string;
  rec_trade_id?: string;
  msg?: string;
  card_secret?: Record<string, unknown>;
  card_info?: Record<string, unknown>;
}) {
  const orderNumber = body.order_number?.trim();
  const recTradeId = body.rec_trade_id?.trim();
  const isBindOrder = Boolean(orderNumber?.startsWith("BIND"));

  const supabase = client();
  let temp: Record<string, unknown> | null = null;

  if (isBindOrder && orderNumber) {
    const { data, error } = await supabase
      .from("bind_card_temp_orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    temp = data as Record<string, unknown> | null;
  }

  if (!temp && recTradeId) {
    const { data, error } = await supabase
      .from("bind_card_temp_orders")
      .select("*")
      .eq("rec_trade_id", recTradeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    temp = data as Record<string, unknown> | null;
  }

  if (!temp) {
    if (!isBindOrder) {
      return { ok: false as const, ignored: true as const };
    }
    logAppError("tappay.bind_notify_unknown", { orderNumber, recTradeId });
    return { ok: false as const, error: "bind temp not found" };
  }

  if (Number(body.status) !== 0) {
    await supabase
      .from("bind_card_temp_orders")
      .update({
        status: "failed",
        tappay_status: Number(body.status),
        tappay_msg: body.msg || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", temp.id);
    return { ok: true as const, ignored: true as const };
  }

  const fromNotify = extractCardSecret(body as Record<string, unknown>);
  const cardKey = fromNotify.cardKey || (temp.card_key ? String(temp.card_key) : null);
  const cardToken = fromNotify.cardToken || (temp.card_token ? String(temp.card_token) : null);
  if (!cardKey || !cardToken) {
    logAppError("tappay.bind_notify_missing_secret", {
      orderNumber: temp.order_number,
      recTradeId,
      hasTempKey: Boolean(temp.card_key),
      hasNotifySecret: Boolean(body.card_secret),
    });
    return { ok: false as const, error: "missing card secret" };
  }

  await upsertUserCard({
    userId: String(temp.user_id),
    cardKey,
    cardToken,
    lastFour: fromNotify.lastFour || (temp.last_four ? String(temp.last_four) : null),
    brand: fromNotify.brand || (temp.brand ? String(temp.brand) : null),
    expiryMonth:
      fromNotify.expiryMonth || (temp.expiry_month ? String(temp.expiry_month) : null),
    expiryYear: fromNotify.expiryYear || (temp.expiry_year ? String(temp.expiry_year) : null),
  });

  await supabase
    .from("bind_card_temp_orders")
    .update({
      status: "paid",
      rec_trade_id: recTradeId || temp.rec_trade_id,
      card_key: cardKey,
      card_token: cardToken,
      tappay_status: 0,
      tappay_msg: body.msg || "Success",
      updated_at: new Date().toISOString(),
    })
    .eq("id", temp.id);

  logApp("tappay.bind_card_notify_saved", {
    userId: temp.user_id,
    orderNumber: temp.order_number,
  });
  return { ok: true as const, userId: String(temp.user_id) };
}

/**
 * 3DS frontend redirect 成功時補完綁卡（不等 notify，或 notify 漏送時）。
 * 安全：僅允許該 user 自己的 order，且 status 必須為 0。
 */
export async function completeBindFromRedirect(input: {
  userId: string;
  orderNumber: string;
  recTradeId?: string | null;
  status?: string | number | null;
}) {
  if (Number(input.status) !== 0) {
    return { ok: false as const, error: "綁卡未成功" };
  }

  const existing = await getPublicSavedCard(input.userId);
  if (existing) {
    return { ok: true as const, already: true as const };
  }

  const supabase = client();
  let query = supabase
    .from("bind_card_temp_orders")
    .select("*")
    .eq("user_id", input.userId)
    .eq("order_number", input.orderNumber);

  const { data: temp, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!temp) {
    return { ok: false as const, error: "找不到綁卡暫存" };
  }

  if (temp.status === "paid" && temp.card_key && temp.card_token) {
    await upsertUserCard({
      userId: input.userId,
      cardKey: String(temp.card_key),
      cardToken: String(temp.card_token),
      lastFour: temp.last_four ? String(temp.last_four) : null,
      brand: temp.brand ? String(temp.brand) : null,
      expiryMonth: temp.expiry_month ? String(temp.expiry_month) : null,
      expiryYear: temp.expiry_year ? String(temp.expiry_year) : null,
    });
    return { ok: true as const };
  }

  if (!temp.card_key || !temp.card_token) {
    logAppError("tappay.bind_redirect_missing_secret", {
      orderNumber: input.orderNumber,
      recTradeId: input.recTradeId,
    });
    return {
      ok: false as const,
      error: "暫存缺少卡片憑證，請確認綁卡 API 是否回傳 card_secret",
    };
  }

  await upsertUserCard({
    userId: input.userId,
    cardKey: String(temp.card_key),
    cardToken: String(temp.card_token),
    lastFour: temp.last_four ? String(temp.last_four) : null,
    brand: temp.brand ? String(temp.brand) : null,
    expiryMonth: temp.expiry_month ? String(temp.expiry_month) : null,
    expiryYear: temp.expiry_year ? String(temp.expiry_year) : null,
  });

  await supabase
    .from("bind_card_temp_orders")
    .update({
      status: "paid",
      rec_trade_id: input.recTradeId || temp.rec_trade_id,
      tappay_status: 0,
      tappay_msg: "frontend_redirect",
      updated_at: new Date().toISOString(),
    })
    .eq("id", temp.id);

  logApp("tappay.bind_card_redirect_saved", {
    userId: input.userId,
    orderNumber: input.orderNumber,
  });
  return { ok: true as const };
}

export async function removeSavedCard(userId: string) {
  const supabase = client();
  const { data: card, error } = await supabase
    .from("user_cards")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!card?.card_key || !card?.card_token) {
    return { ok: true as const, message: "卡片已不存在" };
  }

  const cfg = getTapPayServerConfig();
  const resp = await fetch(cfg.removeCardUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.partnerKey,
    },
    body: JSON.stringify({
      partner_key: cfg.partnerKey,
      card_key: card.card_key,
      card_token: card.card_token,
    }),
  });
  const json = (await resp.json()) as { status?: number; msg?: string };
  if (Number(json.status) !== 0) {
    throw new Error(json.msg || "移除卡片失敗");
  }

  const { error: delError } = await supabase.from("user_cards").delete().eq("user_id", userId);
  if (delError) throw new Error(delError.message);

  logApp("tappay.card_removed", { userId });
  return { ok: true as const };
}

export async function getSavedCardSecrets(userId: string, cardId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("user_cards")
    .select("id, card_key, card_token")
    .eq("user_id", userId)
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.card_key || !data?.card_token) return null;
  return {
    id: String(data.id),
    cardKey: String(data.card_key),
    cardToken: String(data.card_token),
  };
}

export async function tapPayPayByToken(input: {
  cardKey: string;
  cardToken: string;
  amount: number;
  orderNumber: string;
  details: string;
  cardholder: { phone_number?: string; name?: string; email?: string };
  frontendRedirectUrl: string;
  backendNotifyUrl: string;
}): Promise<TapPayChargeResult> {
  const cfg = getTapPayServerConfig();
  const body = {
    card_key: input.cardKey,
    card_token: input.cardToken,
    partner_key: cfg.partnerKey,
    merchant_id: cfg.merchantId,
    amount: input.amount,
    currency: "TWD",
    details: input.details,
    remember: true,
    three_domain_secure: true,
    bank_transaction_id: generateBankTransactionId(),
    order_number: input.orderNumber,
    cardholder: {
      phone_number: input.cardholder.phone_number || "",
      name: input.cardholder.name || "",
      email: input.cardholder.email || "",
    },
    result_url: {
      frontend_redirect_url: input.frontendRedirectUrl,
      backend_notify_url: input.backendNotifyUrl,
    },
  };

  const resp = await fetch(cfg.payByTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.partnerKey,
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }

  logApp("tappay.pay_by_token_response", {
    httpStatus: resp.status,
    status: json.status,
    orderNumber: input.orderNumber,
    hasPaymentUrl: Boolean(json.payment_url),
  });

  return {
    status: Number(json.status ?? -1),
    msg: typeof json.msg === "string" ? json.msg : undefined,
    rec_trade_id: typeof json.rec_trade_id === "string" ? json.rec_trade_id : undefined,
    order_number: typeof json.order_number === "string" ? json.order_number : input.orderNumber,
    bank_transaction_id:
      typeof json.bank_transaction_id === "string" ? json.bank_transaction_id : undefined,
    payment_url: typeof json.payment_url === "string" ? json.payment_url : undefined,
    raw: json,
  };
}

export async function getBindTempStatus(userId: string, orderNumber: string) {
  const supabase = client();
  const { data } = await supabase
    .from("bind_card_temp_orders")
    .select("status, order_number")
    .eq("user_id", userId)
    .eq("order_number", orderNumber)
    .maybeSingle();
  return data;
}
