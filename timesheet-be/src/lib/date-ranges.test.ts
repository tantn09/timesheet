import { describe, expect, it } from 'vitest';
import { rangesOverlap } from './date-ranges.js';

describe('rangesOverlap', () => {
  it('detects overlap between two closed ranges', () => {
    expect(rangesOverlap(new Date('2026-01-01'), new Date('2026-03-01'), new Date('2026-02-01'), new Date('2026-04-01'))).toBe(true);
  });

  it('detects no overlap when ranges are disjoint', () => {
    expect(rangesOverlap(new Date('2026-01-01'), new Date('2026-02-01'), new Date('2026-03-01'), new Date('2026-04-01'))).toBe(false);
  });

  it('treats a null end as open-ended and overlapping anything after it starts', () => {
    expect(rangesOverlap(new Date('2026-01-01'), null, new Date('2030-01-01'), new Date('2031-01-01'))).toBe(true);
  });

  it('treats two null ends as always overlapping', () => {
    expect(rangesOverlap(new Date('2026-01-01'), null, new Date('2027-01-01'), null)).toBe(true);
  });

  it('does not overlap when one range ends exactly before the other starts minus a day', () => {
    expect(rangesOverlap(new Date('2026-01-01'), new Date('2026-01-10'), new Date('2026-01-11'), null)).toBe(false);
  });
});
