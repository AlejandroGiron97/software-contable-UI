export const MONTHS: readonly string[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function monthIndex(month: string): number {
  const idx = MONTHS.indexOf(month);
  return idx === -1 ? 0 : idx;
}

export function comparePeriods(a: { year: number; month: string }, b: { year: number; month: string }): number {
  return a.year - b.year || monthIndex(a.month) - monthIndex(b.month);
}
