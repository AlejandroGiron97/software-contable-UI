export interface ChartGeometry {
  PT: number;
  PB: number;
  H: number;
  chartH: number;
}

export interface Tick {
  y: number;
  label: string;
}

export function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const mag = Math.pow(10, exp);
  const norm = rough / mag;
  if (norm < 1.5) return mag;
  if (norm < 3.5) return 2 * mag;
  if (norm < 7.5) return 5 * mag;
  return 10 * mag;
}

export function makeTicks(min: number, max: number, count: number, geo: ChartGeometry, formatLabel: (v: number) => string): Tick[] {
  const step = niceStep((max - min) / count || max / count || 1);
  const start = Math.floor(min / step) * step;
  const ticks: Tick[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) {
    const y = geo.PT + (1 - (v - min) / Math.max(max - min, 1)) * geo.chartH;
    if (y < geo.PT - 4 || y > geo.H - geo.PB + 4) continue;
    ticks.push({ y, label: formatLabel(v) });
  }
  return ticks;
}
