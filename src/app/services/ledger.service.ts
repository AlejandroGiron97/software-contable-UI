import { Injectable, signal, computed, effect } from '@angular/core';
import { Period, PeriodItem, AlertCode } from '../models/period.model';
import { DEBT_RATIO_WARNING_PCT, DEBT_RATIO_CRITICAL_PCT, LOW_CASH_BUFFER_RATIO } from '../models/alert-thresholds.const';
import { comparePeriods } from '../core/utils/period-order.util';
import { generateId } from '../core/utils/id-generator.util';
import { STORAGE_KEYS } from '../core/persistence/storage-keys.const';
import { loadFromStorage, saveToStorage } from '../core/persistence/local-storage.util';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  readonly periods = signal<Period[]>([]);

  constructor() {
    this.periods.set(this.sortPeriods(loadFromStorage<Period[]>(STORAGE_KEYS.periods, [])));
    effect(() => saveToStorage(STORAGE_KEYS.periods, this.periods()));
  }

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
    if (cash < 0 || ratio > DEBT_RATIO_CRITICAL_PCT / 100) return 3;
    if (ratio > DEBT_RATIO_WARNING_PCT / 100 || (income > 0 && cash < income * LOW_CASH_BUFFER_RATIO)) return 2;
    return 1;
  }

  computeTotals(items: PeriodItem[]): Omit<Period, 'year' | 'month' | 'items'> {
    const income = items
      .filter(i => i.type === 'ingreso')
      .reduce((s, i) => s + i.amount, 0);
    const expenses = items
      .filter(i => i.type === 'egreso' && !i.fundedBySource)
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
    const newPeriod: Period = { year, month, items, ...this.computeTotals(items) };
    this.periods.update(ps => this.sortPeriods([...ps, newPeriod]));
    return true;
  }

  updateItems(year: number, month: string, items: PeriodItem[]): void {
    const totals = this.computeTotals(items);
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

  moveItemToPeriod(item: PeriodItem, year: number, month: string): void {
    if (!this.getPeriod(year, month)) this.addMonth(year, month);
    const target = this.getPeriod(year, month)!;
    this.updateItems(year, month, [...target.items, item]);
  }

  getPeriod(year: number, month: string): Period | undefined {
    return this.periods().find(p => p.year === year && p.month === month);
  }

  loadPeriods(periods: Period[]): void {
    this.periods.set(this.sortPeriods(periods));
  }

  generateId(): string {
    return generateId();
  }

  private sortPeriods(periods: Period[]): Period[] {
    return [...periods].sort(comparePeriods);
  }
}
