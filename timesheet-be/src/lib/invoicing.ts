export const round2 = (value: number) => Math.round(value * 100) / 100;

export type RateWindow = { hourlyRateGbp: number; effectiveFrom: Date; effectiveTo: Date | null };

export function selectRate(rates: RateWindow[], workDate: Date): number | null {
  const match = rates.find((rate) => rate.effectiveFrom <= workDate && (rate.effectiveTo === null || workDate <= rate.effectiveTo));
  return match ? match.hourlyRateGbp : null;
}

export type BillableEntry = { projectId: string; projectName: string; minutes: number; hourlyRateGbp: number };
export type InvoiceLineDraft = { description: string; minutes: number; hourlyRateGbp: number; amountGbp: number };

export function groupIntoLines(entries: BillableEntry[]): InvoiceLineDraft[] {
  const groups = new Map<string, InvoiceLineDraft>();
  for (const entry of entries) {
    const key = `${entry.projectId}:${entry.hourlyRateGbp}`;
    const existing = groups.get(key);
    if (existing) existing.minutes += entry.minutes;
    else groups.set(key, { description: entry.projectName, minutes: entry.minutes, hourlyRateGbp: entry.hourlyRateGbp, amountGbp: 0 });
  }
  for (const line of groups.values()) line.amountGbp = round2((line.minutes / 60) * line.hourlyRateGbp);
  return [...groups.values()];
}

export function sumTotals(lines: InvoiceLineDraft[], discountGbp = 0, taxGbp = 0) {
  const subtotalGbp = round2(lines.reduce((sum, line) => sum + line.amountGbp, 0));
  const totalGbp = round2(subtotalGbp - discountGbp + taxGbp);
  return { subtotalGbp, totalGbp };
}
