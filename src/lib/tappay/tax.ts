/** 含稅總額拆成應稅銷售額與稅額（稅率 5%）。 */
export function splitInclusiveTax(totalAmount: number) {
  const total = Math.round(totalAmount);
  const salesAmount = Math.round(total / 1.05);
  const taxAmount = total - salesAmount;
  return {
    salesAmount,
    taxAmount,
    totalAmount: total,
  };
}
