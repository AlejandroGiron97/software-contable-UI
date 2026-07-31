import { Component, Input } from '@angular/core';
import { Period } from '../../models/period.model';
import { comparePeriods, monthIndex } from '../../core/utils/period-order.util';

type Trend = 'up' | 'down' | 'flat' | 'new' | 'none';

interface ComparisonMetric {
  label: string;
  pctText: string;
  trend: Trend;
  good: boolean;
}

@Component({
  selector: 'app-period-comparison',
  standalone: true,
  templateUrl: './period-comparison.component.html',
  styleUrl: './period-comparison.component.scss',
})
export class PeriodComparisonComponent {
  @Input({ required: true }) periods: Period[] = [];
  @Input({ required: true }) current!: Period;

  get previous(): Period | null {
    const sorted = [...this.periods].sort(comparePeriods);
    const idx = sorted.findIndex(p => p.year === this.current.year && p.month === this.current.month);
    return idx > 0 ? sorted[idx - 1] : null;
  }

  get isConsecutive(): boolean {
    const prev = this.previous;
    if (!prev) return true;
    const prevAbsMonth = prev.year * 12 + monthIndex(prev.month);
    const currAbsMonth = this.current.year * 12 + monthIndex(this.current.month);
    return currAbsMonth - prevAbsMonth === 1;
  }

  get metrics(): ComparisonMetric[] {
    const prev = this.previous;
    if (!prev) return [];
    return [
      this.buildMetric('Ingresos', prev.income, this.current.income, true),
      this.buildMetric('Egresos', prev.expenses, this.current.expenses, false),
      this.buildMetric('Caja', prev.cash, this.current.cash, true),
    ];
  }

  private buildMetric(label: string, prevValue: number, currValue: number, upIsGood: boolean): ComparisonMetric {
    if (prevValue === 0) {
      if (currValue === 0) return { label, pctText: '—', trend: 'none', good: true };
      return { label, pctText: 'Nuevo', trend: 'new', good: upIsGood ? currValue > 0 : currValue <= 0 };
    }
    const pct = ((currValue - prevValue) / Math.abs(prevValue)) * 100;
    if (Math.abs(pct) < 0.05) return { label, pctText: '0.0%', trend: 'flat', good: true };
    const trend: Trend = pct > 0 ? 'up' : 'down';
    const good = trend === 'up' ? upIsGood : !upIsGood;
    return { label, pctText: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, trend, good };
  }
}
