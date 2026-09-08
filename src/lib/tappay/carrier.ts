export type InvoiceCarrier =
  | { type: 0 }
  | { type: 1; number: string }
  | { type: 2; number: string };

/** 手機條碼 / 自然人憑證 / 否則會員載具。 */
export function resolveCarrier(raw?: string | null): InvoiceCarrier {
  const value = (raw || "").trim().toUpperCase();
  if (/^\/[A-Z0-9.+\-]{7}$/.test(value)) {
    return { type: 1, number: value };
  }
  if (/^[A-Z]{2}[0-9]{14}$/.test(value)) {
    return { type: 2, number: value };
  }
  return { type: 0 };
}
