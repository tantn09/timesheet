import { describe, expect, it } from 'vitest';
import { summarize } from './timesheetSummary';

describe('summarize', () => {
  it('sums minutes for the same user and project', () => {
    const rows = summarize([
      { minutes: 60, project: { name: 'Alpha' }, user: { name: 'Ann' } },
      { minutes: 120, project: { name: 'Alpha' }, user: { name: 'Ann' } },
    ]);
    expect(rows).toEqual([{ user: 'Ann', project: 'Alpha', minutes: 180 }]);
  });

  it('keeps separate rows for different users or projects', () => {
    const rows = summarize([
      { minutes: 60, project: { name: 'Alpha' }, user: { name: 'Ann' } },
      { minutes: 60, project: { name: 'Beta' }, user: { name: 'Ann' } },
      { minutes: 60, project: { name: 'Alpha' }, user: { name: 'Bob' } },
    ]);
    expect(rows).toHaveLength(3);
  });

  it('sorts by user then project', () => {
    const rows = summarize([
      { minutes: 60, project: { name: 'Beta' }, user: { name: 'Bob' } },
      { minutes: 60, project: { name: 'Alpha' }, user: { name: 'Ann' } },
    ]);
    expect(rows.map((r) => r.user)).toEqual(['Ann', 'Bob']);
  });

  it('returns an empty array for no entries', () => {
    expect(summarize([])).toEqual([]);
  });
});
