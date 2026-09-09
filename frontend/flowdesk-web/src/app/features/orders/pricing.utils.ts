export interface ItemPricingPreview {
  gross: number;
  discount: number;
  total: number;
}

export function calculateItemPricing(
  quantity: number,
  unitPrice: number,
  discountAmount: number
): ItemPricingPreview {
  const safeQuantity = Math.max(0, Number(quantity) || 0);
  const safeUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const gross = roundMoney(safeQuantity * safeUnitPrice);
  const total = roundMoney(Math.max(0, gross - discount));

  return { gross, discount, total };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
