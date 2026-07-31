import { FundBase } from '../../models/fund.model';

export interface FundTimelinePoint {
  date: string;
  balance: number;
}

export function buildFundTimeline(fund: FundBase): FundTimelinePoint[] {
  const events = [
    ...fund.contributions.map(c => ({ date: c.date, delta: c.amount })),
    ...fund.withdrawals.map(w => ({ date: w.date, delta: -w.amount })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  return events.map(e => ({ date: e.date, balance: (running += e.delta) }));
}
