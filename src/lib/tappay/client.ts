import { logApp, logAppError } from "@/lib/log";
import { resolveCarrier, type InvoiceCarrier } from "@/lib/tappay/carrier";
import { getPublicAppUrl, getTapPayServerConfig } from "@/lib/tappay/env";
import { splitInclusiveTax } from "@/lib/tappay/tax";

export type TapPayChargeResult = {
  status: number;
  msg?: string;
  rec_trade_id?: string;
  order_number?: string;
  bank_transaction_id?: string;
  payment_url?: string;
  raw: Record<string, unknown>;
};

function generateBankTransactionId() {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const date =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = pad(Math.floor(Math.random() * 100));
  return `ESUN${date}${rand}`;
}

export async function tapPayPayByPrime(input: {
  prime: string;
  amount: number;
  orderNumber: string;
  details: string;
  cardholder: { phone_number?: string; name?: string; email?: string };
  frontendRedirectUrl: string;
  backendNotifyUrl: string;
  threeDomainSecure?: boolean;
}): Promise<TapPayChargeResult> {
  const cfg = getTapPayServerConfig();
  const body = {
    prime: input.prime,
    partner_key: cfg.partnerKey,
    merchant_id: cfg.merchantId,
    amount: input.amount,
    currency: "TWD",
    details: input.details,
    cardholder: {
      phone_number: input.cardholder.phone_number || "",
      name: input.cardholder.name || "",
      email: input.cardholder.email || "",
    },
    order_number: input.orderNumber,
    bank_transaction_id: generateBankTransactionId(),
    three_domain_secure: input.threeDomainSecure !== false,
    result_url: {
      frontend_redirect_url: input.frontendRedirectUrl,
      backend_notify_url: input.backendNotifyUrl,
    },
  };

  const resp = await fetch(cfg.payByPrimeUrl, {
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

  logApp("tappay.pay_by_prime_response", {
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

export async function tapPayIssueTaxableInvoice(input: {
  orderNumber: string;
  totalAmount: number;
  buyerEmail: string;
  buyerName?: string | null;
  buyerIdentifier?: string | null;
  carrier?: InvoiceCarrier | string | null;
  description?: string;
}): Promise<{
  ok: boolean;
  rec_invoice_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  invoice_time?: string;
  error?: string;
  raw?: Record<string, unknown>;
}> {
  const cfg = getTapPayServerConfig();
  if (!cfg.sellerIdentifier) {
    return { ok: false, error: "尚未設定 SELLER_IDENTIFIER" };
  }

  const { salesAmount, taxAmount, totalAmount } = splitInclusiveTax(input.totalAmount);
  const carrier =
    typeof input.carrier === "string" || input.carrier == null
      ? resolveCarrier(input.carrier)
      : input.carrier;
  const orderDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const notifyUrl = `${getPublicAppUrl()}/api/payments/invoice/notify`;

  const body: Record<string, unknown> = {
    partner_key: cfg.partnerKey,
    order_number: input.orderNumber,
    order_date: orderDate,
    seller_name: cfg.sellerName,
    seller_identifier: cfg.sellerIdentifier,
    buyer_email: input.buyerEmail,
    currency: "TWD",
    invoice_type: 1,
    sales_amount: salesAmount,
    zero_tax_sales_amount: 0,
    free_tax_sales_amount: 0,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    customs_clearance_mark_enum: 1,
    zero_tax_rate_reason_enum: 0,
    details: [
      {
        sequence_id: "001",
        quantity: 1,
        unit_price: salesAmount,
        sub_amount: salesAmount,
        description: input.description || "K歌+1 媒合服務費",
        tax_type: 1,
      },
    ],
    notify_url: notifyUrl,
    carrier,
    issue_notify_email: "AUTO",
  };

  if (input.buyerIdentifier) {
    body.buyer_identifier = input.buyerIdentifier;
    if (input.buyerName) body.buyer_name = input.buyerName;
  }

  try {
    const resp = await fetch(cfg.invoiceApiUrl, {
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

    if (resp.ok && Number(json.status) === 0) {
      logApp("tappay.invoice_issued", {
        orderNumber: input.orderNumber,
        invoiceNumber: json.invoice_number,
      });
      return {
        ok: true,
        rec_invoice_id: typeof json.rec_invoice_id === "string" ? json.rec_invoice_id : undefined,
        invoice_number: typeof json.invoice_number === "string" ? json.invoice_number : undefined,
        invoice_date: typeof json.invoice_date === "string" ? json.invoice_date : undefined,
        invoice_time: typeof json.invoice_time === "string" ? json.invoice_time : undefined,
        raw: json,
      };
    }

    logAppError("tappay.invoice_failed", {
      orderNumber: input.orderNumber,
      status: json.status,
      msg: json.msg,
    });
    return {
      ok: false,
      error: typeof json.msg === "string" ? json.msg : "開立發票失敗",
      raw: json,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logAppError("tappay.invoice_exception", { orderNumber: input.orderNumber, message });
    return { ok: false, error: message };
  }
}
