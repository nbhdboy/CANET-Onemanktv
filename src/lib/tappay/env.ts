export function getPublicAppUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function paymentMode(): "MOCK" | "LIVE" {
  const mode = (process.env.PAYMENT_MODE || "MOCK").toUpperCase();
  return mode === "LIVE" ? "LIVE" : "MOCK";
}

export function isLivePayment() {
  return paymentMode() === "LIVE";
}

export function getTapPayServerConfig() {
  const partnerKey = process.env.TAPPAY_PARTNER_KEY?.trim();
  const merchantId = process.env.TAPPAY_MERCHANT_ID?.trim();
  const merchantIdLinePay =
    process.env.TAPPAY_MERCHANT_ID_LINEPAY?.trim() || merchantId || "";
  const tappayEnv = (process.env.NEXT_PUBLIC_TAPPAY_ENV || "sandbox").toLowerCase();
  const isProd = tappayEnv === "production" || tappayEnv === "prod";

  const payByPrimeUrl = (
    process.env.TAPPAY_PAY_BY_PRIME_URL ||
    (isProd
      ? "https://prod.tappaysdk.com/tpc/payment/pay-by-prime"
      : "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime")
  ).trim();
  const payByTokenUrl = (
    process.env.TAPPAY_PAY_BY_TOKEN_URL ||
    (isProd
      ? "https://prod.tappaysdk.com/tpc/payment/pay-by-token"
      : "https://sandbox.tappaysdk.com/tpc/payment/pay-by-token")
  ).trim();
  const bindCardUrl = (
    process.env.TAPPAY_BIND_CARD_URL ||
    (isProd
      ? "https://prod.tappaysdk.com/tpc/card/bind"
      : "https://sandbox.tappaysdk.com/tpc/card/bind")
  ).trim();
  const removeCardUrl = (
    process.env.TAPPAY_REMOVE_CARD_URL ||
    (isProd
      ? "https://prod.tappaysdk.com/tpc/card/remove"
      : "https://sandbox.tappaysdk.com/tpc/card/remove")
  ).trim();
  const invoiceApiUrl = (
    process.env.TAPPAY_INVOICE_API_URL ||
    (isProd
      ? "https://invoice.tappaysdk.com/einvoice/issue"
      : "https://sandbox-invoice.tappaysdk.com/einvoice/issue")
  ).trim();
  const sellerIdentifier = process.env.SELLER_IDENTIFIER?.trim() || "";
  const sellerName = process.env.SELLER_NAME?.trim() || "K歌+1";

  if (!partnerKey || !merchantId) {
    throw new Error("尚未設定 TapPay 伺服器金鑰（TAPPAY_PARTNER_KEY / TAPPAY_MERCHANT_ID）。");
  }

  // 常見誤設：正式前端卻打 sandbox API（或反過來）
  const hosts = [payByPrimeUrl, payByTokenUrl, bindCardUrl, removeCardUrl];
  for (const u of hosts) {
    const sandboxHost = u.includes("sandbox.tappaysdk.com");
    const prodHost = u.includes("prod.tappaysdk.com");
    if (isProd && sandboxHost) {
      throw new Error(
        `NEXT_PUBLIC_TAPPAY_ENV=production，但 API URL 仍是 sandbox（${u}）。請改成 prod.tappaysdk.com。`,
      );
    }
    if (!isProd && prodHost) {
      throw new Error(
        `NEXT_PUBLIC_TAPPAY_ENV=sandbox，但 API URL 是 production（${u}）。請改成 sandbox.tappaysdk.com。`,
      );
    }
  }

  return {
    partnerKey,
    merchantId,
    merchantIdLinePay,
    payByPrimeUrl,
    payByTokenUrl,
    bindCardUrl,
    removeCardUrl,
    invoiceApiUrl,
    sellerIdentifier,
    sellerName,
  };
}

export function getTapPayPublicConfig() {
  const appId = process.env.NEXT_PUBLIC_TAPPAY_APP_ID || "";
  const appKey = process.env.NEXT_PUBLIC_TAPPAY_APP_KEY || "";
  const env = process.env.NEXT_PUBLIC_TAPPAY_ENV || "sandbox";
  return { appId, appKey, env };
}
