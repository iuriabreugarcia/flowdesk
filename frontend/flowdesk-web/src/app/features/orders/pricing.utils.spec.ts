import { calculateItemPricing } from './pricing.utils';

describe('calculateItemPricing', () => {
  it('calculates gross, discount and total', () => {
    expect(calculateItemPricing(2, 289.9, 10)).toEqual({
      gross: 579.8,
      discount: 10,
      total: 569.8
    });
  });

  it('never returns a negative total', () => {
    expect(calculateItemPricing(1, 100, 150).total).toBe(0);
  });

  it('normalizes invalid negative inputs', () => {
    expect(calculateItemPricing(-2, -10, -1)).toEqual({
      gross: 0,
      discount: 0,
      total: 0
    });
  });
});
