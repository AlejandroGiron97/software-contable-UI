import { Component, Input } from '@angular/core';
import { Periodo } from '../../models/periodo.model';

interface BarRect {
  x: number; y: number; w: number; h: number; fill: string; key: string;
}
interface Tick { y: number; label: string; }
interface XLabel { x: number; text: string; }
interface CajaPoint { x: number; y: number; alerta: number; val: number; }

@Component({
  selector: 'app-graficas',
  standalone: true,
  template: `
    <div class="charts-grid">

      <!-- Ingresos vs Egresos -->
      <div class="chart-card">
        <div class="chart-title">
          <span>Evolución: Ingresos vs Egresos vs Ahorro</span>
          <div class="legend">
            <span class="leg-item"><span class="leg-dot" style="background:#16a34a"></span>Ingresos</span>
            <span class="leg-item"><span class="leg-dot" style="background:#dc2626"></span>Egresos</span>
            <span class="leg-item"><span class="leg-dot" style="background:#2563eb"></span>Ahorro</span>
          </div>
        </div>
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="svg-chart">
          @for (t of yTicks; track t.y) {
            <line [attr.x1]="PL" [attr.y1]="t.y" [attr.x2]="W - PR" [attr.y2]="t.y"
                  stroke="#f1f5f9" stroke-width="1" />
            <text [attr.x]="PL - 5" [attr.y]="t.y + 4" text-anchor="end" class="axis-txt">
              {{ t.label }}
            </text>
          }
          @for (b of bars; track b.key) {
            <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h"
                  [attr.fill]="b.fill" rx="3" />
          }
          @for (lbl of xLabels; track lbl.x) {
            <text [attr.x]="lbl.x" [attr.y]="H - PB + 14" text-anchor="middle" class="axis-txt">
              {{ lbl.text }}
            </text>
          }
          <line [attr.x1]="PL" [attr.y1]="H - PB" [attr.x2]="W - PR" [attr.y2]="H - PB"
                stroke="#e2e8f0" stroke-width="1.5" />
          <line [attr.x1]="PL" [attr.y1]="PT" [attr.x2]="PL" [attr.y2]="H - PB"
                stroke="#e2e8f0" stroke-width="1.5" />
        </svg>
      </div>

      <!-- Caja Restante -->
      <div class="chart-card">
        <div class="chart-title">
          <span>Evolución de Caja Restante</span>
        </div>
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="svg-chart">
          @for (t of cajaTicks; track t.y) {
            <line [attr.x1]="PL" [attr.y1]="t.y" [attr.x2]="W - PR" [attr.y2]="t.y"
                  stroke="#f1f5f9" stroke-width="1" />
            <text [attr.x]="PL - 5" [attr.y]="t.y + 4" text-anchor="end" class="axis-txt">
              {{ t.label }}
            </text>
          }
          @if (zeroLineY !== null) {
            <line [attr.x1]="PL" [attr.y1]="zeroLineY" [attr.x2]="W - PR" [attr.y2]="zeroLineY"
                  stroke="#94a3b8" stroke-width="1" stroke-dasharray="5,4" />
            <text [attr.x]="PL - 5" [attr.y]="zeroLineY + 3" text-anchor="end"
                  class="axis-txt zero-lbl">$0</text>
          }
          @if (cajaPoints.length > 1) {
            <polygon [attr.points]="cajaAreaPts" class="area-fill" />
            <polyline [attr.points]="cajaLinePts" fill="none" stroke="#2563eb"
                      stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          }
          @for (pt of cajaPoints; track pt.x) {
            <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5"
                    [attr.fill]="pt.alerta === 3 ? '#dc2626' : pt.alerta === 2 ? '#d97706' : '#16a34a'"
                    stroke="white" stroke-width="2" />
          }
          @for (lbl of xLabels; track lbl.x) {
            <text [attr.x]="lbl.x" [attr.y]="H - PB + 14" text-anchor="middle" class="axis-txt">
              {{ lbl.text }}
            </text>
          }
          <line [attr.x1]="PL" [attr.y1]="H - PB" [attr.x2]="W - PR" [attr.y2]="H - PB"
                stroke="#e2e8f0" stroke-width="1.5" />
          <line [attr.x1]="PL" [attr.y1]="PT" [attr.x2]="PL" [attr.y2]="H - PB"
                stroke="#e2e8f0" stroke-width="1.5" />
        </svg>
      </div>

    </div>
  `,
  styles: [`
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 900px) {
      .charts-grid { grid-template-columns: 1fr; }
    }
    .chart-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.25rem;
    }
    .chart-title {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: .75rem; flex-wrap: wrap; gap: .5rem;
    }
    .chart-title > span { font-size: .875rem; font-weight: 700; color: #0f172a; }
    .legend { display: flex; gap: .75rem; }
    .leg-item { display: flex; align-items: center; gap: .3rem; font-size: .75rem; color: #64748b; }
    .leg-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .svg-chart { width: 100%; display: block; }
    .axis-txt { font-size: 9px; fill: #94a3b8; font-family: -apple-system, sans-serif; }
    .zero-lbl { fill: #64748b; font-weight: 600; }
    .area-fill { fill: rgba(37,99,235,.07); }
  `],
})
export class GraficasComponent {
  @Input() set periodos(val: Periodo[]) {
    this._periodos = val;
    this.recalcular();
  }
  get periodos(): Periodo[] { return this._periodos; }

  private _periodos: Periodo[] = [];

  readonly W = 660;
  readonly H = 220;
  readonly PL = 64;
  readonly PR = 12;
  readonly PT = 14;
  readonly PB = 36;

  get chartW() { return this.W - this.PL - this.PR; }
  get chartH() { return this.H - this.PT - this.PB; }

  yTicks: Tick[] = [];
  cajaTicks: Tick[] = [];
  bars: BarRect[] = [];
  xLabels: XLabel[] = [];
  cajaPoints: CajaPoint[] = [];
  cajaLinePts = '';
  cajaAreaPts = '';
  zeroLineY: number | null = null;

  private recalcular(): void {
    const ps = this._periodos;
    if (!ps.length) {
      this.yTicks = [];
      this.cajaTicks = [];
      this.bars = [];
      this.xLabels = [];
      this.cajaPoints = [];
      this.cajaLinePts = '';
      this.cajaAreaPts = '';
      this.zeroLineY = null;
      return;
    }

    const n = ps.length;
    const groupW = this.chartW / n;
    const bw = Math.min(16, Math.max(3, (groupW - 6) / 4));

    // X labels
    this.xLabels = ps.map((p, i) => ({
      x: this.PL + i * groupW + groupW / 2,
      text: `${p.mes.substring(0, 3)} ${String(p.anio).substring(2)}`,
    }));

    // Bar chart
    const maxVal = Math.max(...ps.map(p => Math.max(p.ingresos, p.egresos, p.ahorro)), 1);
    this.yTicks = this.makeTicks(0, maxVal, 4);
    this.bars = [];
    ps.forEach((p, i) => {
      const gx = this.PL + i * groupW;
      const gap = (groupW - 3 * bw) / 4;
      const vals = [
        { v: p.ingresos, fill: '#16a34a' },
        { v: p.egresos, fill: '#dc2626' },
        { v: p.ahorro, fill: '#2563eb' },
      ];
      vals.forEach((d, j) => {
        const bx = gx + gap * (j + 1) + bw * j;
        const h = Math.max((d.v / maxVal) * this.chartH, 1);
        this.bars.push({
          x: bx, y: this.PT + this.chartH - h,
          w: bw, h,
          fill: d.fill,
          key: `${i}-${j}`,
        });
      });
    });

    // Caja line chart
    const cajaVals = ps.map(p => p.caja);
    const cajaMin = Math.min(...cajaVals);
    const cajaMax = Math.max(...cajaVals);
    const cajaRange = cajaMax - cajaMin || 1;

    this.cajaTicks = this.makeTicks(cajaMin, cajaMax, 4);

    const stepX = n > 1 ? this.chartW / (n - 1) : this.chartW / 2;
    const startX = n === 1 ? this.PL + this.chartW / 2 : this.PL;

    this.cajaPoints = ps.map((p, i) => ({
      x: startX + i * stepX,
      y: this.PT + (1 - (p.caja - cajaMin) / cajaRange) * this.chartH,
      alerta: p.alerta,
      val: p.caja,
    }));

    this.cajaLinePts = this.cajaPoints.map(pt => `${pt.x},${pt.y}`).join(' ');

    if (this.cajaPoints.length > 1) {
      const bot = this.H - this.PB;
      const first = `${this.cajaPoints[0].x},${bot}`;
      const last = `${this.cajaPoints[this.cajaPoints.length - 1].x},${bot}`;
      this.cajaAreaPts = `${first} ${this.cajaLinePts} ${last}`;
    } else {
      this.cajaAreaPts = '';
    }

    if (cajaMin < 0 && cajaMax > 0) {
      this.zeroLineY = this.PT + (1 - (0 - cajaMin) / cajaRange) * this.chartH;
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
      ticks.push({ y, label: this.shortFmt(v) });
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

  private shortFmt(v: number): string {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  }
}
