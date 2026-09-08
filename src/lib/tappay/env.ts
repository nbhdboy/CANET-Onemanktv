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
  const partnerKey = process.env.TAPPAY_PARTNER_KEY;
  const merchantId = process.env.TAPPAY_MERCHANT_ID;
  const payByPrimeUrl =
    process.env.TAPPAY_PAY_BY_PRIME_URL ||
    "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime";
  const invoiceApiUrl =
    process.env.TAPPAY_INVOICE_API_URL ||
    "https://sandbox-invoice.tappaysdk.com/einvoice/issue";
  const sellerIdentifier = process.env.SELLER_IDENTIFIER || "";
  const sellerName = process.env.SELLER_NAME || "K歌+1";

  if (!partnerKey || !merchantId) {
    throw new Error("尚未設定 TapPay 伺服器金鑰（TAPPAY_PARTNER_KEY / TAPPAY_MERCHANT_ID）。");
  }

  return {
    partnerKey,
    merchantId,
    payByPrimeUrl,
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
