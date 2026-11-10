export function rangesOverlap(aFrom: Date, aTo: Date | null, bFrom: Date, bTo: Date | null) {
  const aEnd = aTo ?? new Date(8640000000000000);
  const bEnd = bTo ?? new Date(8640000000000000);
  return aFrom <= bEnd && bFrom <= aEnd;
}
