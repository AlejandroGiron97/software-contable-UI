import { FundContribution } from '../../models/fund.model';
import { MONTHS } from './period-order.util';

export interface MonthlyTotal {
  key: string;    // 'YYYY-MM'
  label: string;  // 'Julio 2026'
  amount: number;
}

export function groupContributionsByMonth(contributions: FundContribution[]): MonthlyTotal[] {
  const totals = new Map<string, number>();
  contributions.forEach(c => {
    if (!c.date) return;
    const key = c.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + c.amount);
  });
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ key, label: monthLabel(key), amount }));
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = Math.max(0, Math.min(11, +month - 1));
  return `${MONTHS[idx]} ${year}`;
}
