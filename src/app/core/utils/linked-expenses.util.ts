import { Period, PeriodItem } from '../../models/period.model';

export interface LinkedExpense {
  year: number;
  month: string;
  date?: string;
  concept: string;
  amount: number;
}

export function findLinkedExpenses(periods: Period[], predicate: (item: PeriodItem) => boolean): LinkedExpense[] {
  return periods.flatMap(p =>
    p.items
      .filter(predicate)
      .map(i => ({ year: p.year, month: p.month, date: i.date, concept: i.concept, amount: i.amount }))
  );
}
