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
  return `BIND${Date.now().toString(36)}`.slice(0, 20);
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

function extractCardSecret(raw: Record<string, unknown>) {
  const secret = (raw.card_secret || {}) as Record<string, unknown>;
  const info = (raw.card_info || {}) as Record<string, unknown>;
  return {
    cardKey: typeof secret.card_key === "string" ? secret.card_key : null,
    cardToken: typeof secret.card_token === "string" ? secret.card_token : null,
    lastFour: typeof info.last_four === "string" ? info.last_four : null,
    brand: brandFromType(info.type),
    expiryMonth:
      info.expiry_date && String(info.expiry_date).length >= 4
        ? String(info.expiry_date).slice(0, 2)
        : null,
    expiryYear:
      info.expiry_date && String(info.expiry_date).length >= 4
        ? String(info.expiry_date).slice(2, 4)
        : null,
  };
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
  if (!orderNumber?.startsWith("BIND")) {
    return { ok: false as const, ignored: true as const };
  }

  const supabase = client();
  const { data: temp, error } = await supabase
    .from("bind_card_temp_orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!temp) {
    logAppError("tappay.bind_notify_unknown", { orderNumber });
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
    logAppError("tappay.bind_notify_missing_secret", { orderNumber });
    return { ok: false as const, error: "missing card secret" };
  }

  await upsertUserCard({
    userId: String(temp.user_id),
    cardKey,
    cardToken,
    lastFour: fromNotify.lastFour || temp.last_four,
    brand: fromNotify.brand || temp.brand,
    expiryMonth: fromNotify.expiryMonth || temp.expiry_month,
    expiryYear: fromNotify.expiryYear || temp.expiry_year,
  });

  await supabase
    .from("bind_card_temp_orders")
    .update({
      status: "paid",
      rec_trade_id: body.rec_trade_id || temp.rec_trade_id,
      card_key: cardKey,
      card_token: cardToken,
      tappay_status: 0,
      tappay_msg: body.msg || "Success",
      updated_at: new Date().toISOString(),
    })
    .eq("id", temp.id);

  logApp("tappay.bind_card_notify_saved", {
    userId: temp.user_id,
    orderNumber,
  });
  return { ok: true as const, userId: String(temp.user_id) };
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
