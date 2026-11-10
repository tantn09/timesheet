import { describe, expect, it } from 'vitest';
import { groupIntoLines, selectRate, sumTotals } from './invoicing.js';

describe('selectRate', () => {
  const rates = [
    { hourlyRateGbp: 50, effectiveFrom: new Date('2026-01-01'), effectiveTo: new Date('2026-06-30') },
    { hourlyRateGbp: 60, effectiveFrom: new Date('2026-07-01'), effectiveTo: null },
  ];

  it('picks the rate whose window covers the work date', () => {
    expect(selectRate(rates, new Date('2026-03-15'))).toBe(50);
  });

  it('picks the open-ended rate after its range window', () => {
    expect(selectRate(rates, new Date('2026-09-01'))).toBe(60);
  });

  it('returns null when no rate covers the date', () => {
    expect(selectRate(rates, new Date('2025-12-31'))).toBeNull();
  });
});

describe('groupIntoLines', () => {
  it('sums minutes for the same project and rate into one line', () => {
    const lines = groupIntoLines([
      { projectId: 'p1', projectName: 'Alpha', minutes: 120, hourlyRateGbp: 50 },
      { projectId: 'p1', projectName: 'Alpha', minutes: 60, hourlyRateGbp: 50 },
    ]);
    expect(lines).toEqual([{ description: 'Alpha', minutes: 180, hourlyRateGbp: 50, amountGbp: 150 }]);
  });

  it('keeps separate lines when the rate differs within the same project', () => {
    const lines = groupIntoLines([
      { projectId: 'p1', projectName: 'Alpha', minutes: 60, hourlyRateGbp: 50 },
      { projectId: 'p1', projectName: 'Alpha', minutes: 60, hourlyRateGbp: 60 },
    ]);
    expect(lines).toHaveLength(2);
  });

  it('rounds the amount to two decimal places', () => {
    const lines = groupIntoLines([{ projectId: 'p1', projectName: 'Alpha', minutes: 50, hourlyRateGbp: 33.33 }]);
    expect(lines[0].amountGbp).toBe(27.78);
  });
});

describe('sumTotals', () => {
  it('applies discount and tax to the subtotal', () => {
    const lines = groupIntoLines([{ projectId: 'p1', projectName: 'Alpha', minutes: 600, hourlyRateGbp: 50 }]);
    expect(sumTotals(lines, 10, 5)).toEqual({ subtotalGbp: 500, totalGbp: 495 });
  });

  it('defaults discount and tax to zero', () => {
    const lines = groupIntoLines([{ projectId: 'p1', projectName: 'Alpha', minutes: 60, hourlyRateGbp: 50 }]);
    expect(sumTotals(lines)).toEqual({ subtotalGbp: 50, totalGbp: 50 });
  });
});
