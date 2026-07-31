import { Component, Input } from '@angular/core';
import { FundTimelinePoint } from '../../core/utils/fund-timeline.util';
import { makeTicks, Tick } from '../../core/utils/chart-ticks.util';
import { formatCurrencyShort } from '../../core/utils/currency-formatter.util';

interface LinePoint { x: number; y: number; }
interface XLabel { x: number; text: string; }

@Component({
  selector: 'app-evolution-chart',
  standalone: true,
  templateUrl: './evolution-chart.component.html',
  styleUrl: './evolution-chart.component.scss',
})
export class EvolutionChartComponent {
  @Input() set points(val: FundTimelinePoint[]) {
    this._points = val;
    this.recalculate();
  }
  get points(): FundTimelinePoint[] { return this._points; }
  private _points: FundTimelinePoint[] = [];

  @Input() color = '#2563eb';

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
  xLabels: XLabel[] = [];
  linePts = '';
  areaPts = '';
  zeroLineY: number | null = null;

  private recalculate(): void {
    const pts = this._points;
    if (!pts.length) {
      this.yTicks = [];
      this.xLabels = [];
      this.linePts = '';
      this.areaPts = '';
      this.zeroLineY = null;
      return;
    }

    const values = pts.map(p => p.balance);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const range = max - min || 1;

    this.yTicks = makeTicks(min, max, 4, this.geometry, formatCurrencyShort);

    const n = pts.length;
    const stepX = n > 1 ? this.chartW / (n - 1) : this.chartW / 2;
    const startX = n === 1 ? this.PL + this.chartW / 2 : this.PL;

    const linePoints: LinePoint[] = pts.map((p, i) => ({
      x: startX + i * stepX,
      y: this.PT + (1 - (p.balance - min) / range) * this.chartH,
    }));

    const labelStep = Math.max(1, Math.ceil(n / 8));
    this.xLabels = pts
      .map((p, i) => ({ i, x: startX + i * stepX, text: this.formatDateShort(p.date) }))
      .filter(l => l.i % labelStep === 0 || l.i === n - 1)
      .map(l => ({ x: l.x, text: l.text }));

    this.linePts = linePoints.map(pt => `${pt.x},${pt.y}`).join(' ');

    if (linePoints.length > 1) {
      const bot = this.H - this.PB;
      const first = `${linePoints[0].x},${bot}`;
      const last = `${linePoints[linePoints.length - 1].x},${bot}`;
      this.areaPts = `${first} ${this.linePts} ${last}`;
    } else {
      this.areaPts = '';
    }

    this.zeroLineY = min < 0 && max > 0 ? this.PT + (1 - (0 - min) / range) * this.chartH : null;
  }

  private formatDateShort(date: string): string {
    const parts = date.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
  }
}
