import { FundContribution } from '../../models/fund.model';
import { monthIndex } from './period-order.util';

export function periodKey(year: number, month: string): string {
  return `${year}-${String(monthIndex(month) + 1).padStart(2, '0')}`;
}

export function sumContributionsForPeriod(contributions: FundContribution[], year: number, month: string): number {
  const key = periodKey(year, month);
  return contributions
    .filter(c => c.date && c.date.slice(0, 7) === key)
    .reduce((s, c) => s + c.amount, 0);
}
