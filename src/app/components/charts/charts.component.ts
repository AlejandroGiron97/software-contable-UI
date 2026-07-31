import { Component, Input } from '@angular/core';
import { Period } from '../../models/period.model';
import { formatCurrencyShort } from '../../core/utils/currency-formatter.util';
import { makeTicks, Tick } from '../../core/utils/chart-ticks.util';

interface BarRect {
  x: number; y: number; w: number; h: number; fill: string; key: string;
}
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
  private get geometry() { return { PT: this.PT, PB: this.PB, H: this.H, chartH: this.chartH }; }

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
    this.yTicks = makeTicks(0, maxValue, 4, this.geometry, formatCurrencyShort);
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

    this.cashTicks = makeTicks(cashMin, cashMax, 4, this.geometry, formatCurrencyShort);

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
}
