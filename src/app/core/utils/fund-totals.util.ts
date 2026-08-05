import { FundBase, FundTotals } from '../../models/fund.model';
import { PaymentMethod } from '../../models/period.model';

export function computeFundTotals(fund: FundBase): FundTotals {
  const collected = fund.contributions.reduce((s, c) => s + c.amount, 0);
  const withdrawn = fund.withdrawals.reduce((s, w) => s + w.amount, 0);
  return { collected, withdrawn, available: collected - withdrawn };
}

export function computeFundMethodBalance(fund: FundBase, method: PaymentMethod): number {
  const collected = fund.contributions.filter(c => c.paymentMethod === method).reduce((s, c) => s + c.amount, 0);
  const withdrawn = fund.withdrawals.filter(w => w.paymentMethod === method).reduce((s, w) => s + w.amount, 0);
  return collected - withdrawn;
}
