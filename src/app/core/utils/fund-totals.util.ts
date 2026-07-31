import { FundBase, FundTotals } from '../../models/fund.model';

export function computeFundTotals(fund: FundBase): FundTotals {
  const collected = fund.contributions.reduce((s, c) => s + c.amount, 0);
  const withdrawn = fund.withdrawals.reduce((s, w) => s + w.amount, 0);
  return { collected, withdrawn, available: collected - withdrawn };
}
