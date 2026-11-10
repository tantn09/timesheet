export type SummarizableEntry = { minutes: number; project: { name: string }; user: { name: string } };
export type SummaryRow = { user: string; project: string; minutes: number };

export function summarize(entries: SummarizableEntry[]): SummaryRow[] {
  const totals = new Map<string, SummaryRow>();
  for (const e of entries) {
    const key = `${e.user.name}::${e.project.name}`;
    const existing = totals.get(key);
    if (existing) existing.minutes += e.minutes;
    else totals.set(key, { user: e.user.name, project: e.project.name, minutes: e.minutes });
  }
  return [...totals.values()].sort((a, b) => a.user.localeCompare(b.user) || a.project.localeCompare(b.project));
}
