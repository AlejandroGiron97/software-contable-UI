import { Component, Input } from '@angular/core';
import { Period } from '../../models/period.model';
import { formatCurrencyShort } from '../../core/utils/currency-formatter.util';

interface BarRect {
  x: number; y: number; w: number; h: number; fill: string; key: string;
}
interface Tick { y: number; label: string; }
interface XLabel { x: number; text: string; }
interface CashPoint { x: number; y: number; alert: number; val: number; }

@Component({
  selector: 'app-charts',
  standalone: true,
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss',
})
export class ChartsComponent {
  @Input() set periods(val: Period[]) {
    this._periods = val;
    this.recalculate();
  }
  get periods(): Period[] { return this._periods; }

  private _periods: Period[] = [];

  readonly W = 660;
  readonly H = 220;
  readonly PL = 64;
  readonly PR = 12;
  readonly PT = 14;
  readonly PB = 36;

  get chartW() { return this.W - this.PL - this.PR; }
  get chartH() { return this.H - this.PT - this.PB; }

  yTicks: Tick[] = [];
  cashTicks: Tick[] = [];
  bars: BarRect[] = [];
  xLabels: XLabel[] = [];
  cashPoints: CashPoint[] = [];
  cashLinePts = '';
  cashAreaPts = '';
  zeroLineY: number | null = null;

  private recalculate(): void {
    const ps = this._periods;
    if (!ps.length) {
      this.yTicks = [];
      this.cashTicks = [];
      this.bars = [];
      this.xLabels = [];
      this.cashPoints = [];
      this.cashLinePts = '';
      this.cashAreaPts = '';
      this.zeroLineY = null;
      return;
    }

    const n = ps.length;
    const groupW = this.chartW / n;
    const bw = Math.min(16, Math.max(3, (groupW - 6) / 4));

    // X labels
    this.xLabels = ps.map((p, i) => ({
      x: this.PL + i * groupW + groupW / 2,
      text: `${p.month.substring(0, 3)} ${String(p.year).substring(2)}`,
    }));

    // Bar chart
    const maxValue = Math.max(...ps.map(p => Math.max(p.income, p.expenses, p.savings)), 1);
    this.yTicks = this.makeTicks(0, maxValue, 4);
    this.bars = [];
    ps.forEach((p, i) => {
      const gx = this.PL + i * groupW;
      const gap = (groupW - 3 * bw) / 4;
      const vals = [
        { v: p.income, fill: '#16a34a' },
        { v: p.expenses, fill: '#dc2626' },
        { v: p.savings, fill: '#2563eb' },
      ];
      vals.forEach((d, j) => {
        const bx = gx + gap * (j + 1) + bw * j;
        const h = Math.max((d.v / maxValue) * this.chartH, 1);
        this.bars.push({
          x: bx, y: this.PT + this.chartH - h,
          w: bw, h,
          fill: d.fill,
          key: `${i}-${j}`,
        });
      });
    });

    // Cash line chart
    const cashValues = ps.map(p => p.cash);
    const cashMin = Math.min(...cashValues);
    const cashMax = Math.max(...cashValues);
    const cashRange = cashMax - cashMin || 1;

    this.cashTicks = this.makeTicks(cashMin, cashMax, 4);

    const stepX = n > 1 ? this.chartW / (n - 1) : this.chartW / 2;
    const startX = n === 1 ? this.PL + this.chartW / 2 : this.PL;

    this.cashPoints = ps.map((p, i) => ({
      x: startX + i * stepX,
      y: this.PT + (1 - (p.cash - cashMin) / cashRange) * this.chartH,
      alert: p.alert,
      val: p.cash,
    }));

    this.cashLinePts = this.cashPoints.map(pt => `${pt.x},${pt.y}`).join(' ');

    if (this.cashPoints.length > 1) {
      const bot = this.H - this.PB;
      const first = `${this.cashPoints[0].x},${bot}`;
      const last = `${this.cashPoints[this.cashPoints.length - 1].x},${bot}`;
      this.cashAreaPts = `${first} ${this.cashLinePts} ${last}`;
    } else {
      this.cashAreaPts = '';
    }

    if (cashMin < 0 && cashMax > 0) {
      this.zeroLineY = this.PT + (1 - (0 - cashMin) / cashRange) * this.chartH;
    } else {
      this.zeroLineY = null;
    }
  }

  private makeTicks(min: number, max: number, count: number): Tick[] {
    const step = this.niceStep((max - min) / count || max / count || 1);
    const start = Math.floor(min / step) * step;
    const ticks: Tick[] = [];
    for (let v = start; v <= max + step * 0.5; v += step) {
      const y = this.PT + (1 - (v - min) / Math.max(max - min, 1)) * this.chartH;
      if (y < this.PT - 4 || y > this.H - this.PB + 4) continue;
      ticks.push({ y, label: formatCurrencyShort(v) });
    }
    return ticks;
  }

  private niceStep(rough: number): number {
    if (rough <= 0) return 1;
    const exp = Math.floor(Math.log10(rough));
    const mag = Math.pow(10, exp);
    const norm = rough / mag;
    if (norm < 1.5) return mag;
    if (norm < 3.5) return 2 * mag;
    if (norm < 7.5) return 5 * mag;
    return 10 * mag;
  }
}
