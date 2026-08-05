import { PeriodItem, PaymentMethod } from '../../models/period.model';

export function computeItemsMethodBalance(items: PeriodItem[], method: PaymentMethod): number {
  const methodItems = items.filter(i => i.paymentMethod === method);
  const inflow = methodItems.filter(i => i.type === 'ingreso').reduce((s, i) => s + i.amount, 0);
  const outflow = methodItems
    .filter(i => i.type === 'egreso' || i.type === 'ahorro')
    .reduce((s, i) => s + i.amount, 0);
  return inflow - outflow;
}
