import { Injectable, signal, computed } from '@angular/core';
import { Period, PeriodItem, AlertCode } from '../models/period.model';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  readonly periods = signal<Period[]>([]);

  readonly totalIncome = computed(() =>
    this.periods().reduce((s, p) => s + p.income, 0)
  );
  readonly totalExpenses = computed(() =>
    this.periods().reduce((s, p) => s + p.expenses, 0)
  );
  readonly totalSavings = computed(() =>
    this.periods().reduce((s, p) => s + p.savings, 0)
  );
  readonly finalCash = computed(() =>
    this.periods().reduce((s, p) => s + p.cash, 0)
  );
  readonly overallDebtRatio = computed(() =>
    this.totalIncome() > 0 ? (this.totalExpenses() / this.totalIncome()) * 100 : 0
  );
  readonly overallAlert = computed<AlertCode>(() =>
    this.calculateAlert(this.totalExpenses(), this.totalIncome(), this.finalCash())
  );

  calculateAlert(expenses: number, income: number, cash: number): AlertCode {
    const ratio = income > 0 ? expenses / income : 1;
    if (cash < 0 || ratio > 0.9) return 3;
    if (ratio > 0.7 || (income > 0 && cash < income * 0.05)) return 2;
    return 1;
  }

  private recalculate(items: PeriodItem[]): Omit<Period, 'year' | 'month' | 'items'> {
    const income = items
      .filter(i => i.type === 'ingreso')
      .reduce((s, i) => s + i.amount, 0);
    const expenses = items
      .filter(i => i.type === 'egreso')
      .reduce((s, i) => s + i.amount, 0);
    const savings = items
      .filter(i => i.type === 'ahorro')
      .reduce((s, i) => s + i.amount, 0);
    const cash = income - expenses - savings;
    const debtRatio = income > 0 ? (expenses / income) * 100 : 0;
    const alert = this.calculateAlert(expenses, income, cash);
    return { income, expenses, savings, cash, alert, debtRatio };
  }

  addMonth(year: number, month: string): boolean {
    if (this.getPeriod(year, month)) return false;
    const items: PeriodItem[] = [];
    this.periods.update(ps => [
      ...ps,
      { year, month, items, ...this.recalculate(items) },
    ]);
    return true;
  }

  updateItems(year: number, month: string, items: PeriodItem[]): void {
    const totals = this.recalculate(items);
    this.periods.update(ps =>
      ps.map(p =>
        p.year === year && p.month === month
          ? { ...p, items: [...items], ...totals }
          : p
      )
    );
  }

  updateNote(year: number, month: string, note: string): void {
    this.periods.update(ps =>
      ps.map(p =>
        p.year === year && p.month === month ? { ...p, note } : p
      )
    );
  }

  removeMonth(year: number, month: string): void {
    this.periods.update(ps =>
      ps.filter(p => !(p.year === year && p.month === month))
    );
  }

  getPeriod(year: number, month: string): Period | undefined {
    return this.periods().find(p => p.year === year && p.month === month);
  }

  loadPeriods(periods: Period[]): void {
    this.periods.set(periods);
  }

  generateId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
