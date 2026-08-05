import { PaymentMethod } from '../../models/period.model';

export function paymentMethodLabel(method?: PaymentMethod): string {
  return method === 'bank' ? 'Cuenta' : method === 'cash' ? 'Efectivo' : '';
}

export function parsePaymentMethodLabel(label: string): PaymentMethod | undefined {
  if (label === 'Cuenta') return 'bank';
  if (label === 'Efectivo') return 'cash';
  return undefined;
}
