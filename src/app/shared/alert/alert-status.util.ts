import { AlertCode } from '../../models/period.model';

export function alertDotClass(code: AlertCode): string {
  return `d-${code}`;
}

export function alertLabel(code: AlertCode): string {
  return code === 1 ? 'SUPERÁVIT' : code === 2 ? 'PREVENCIÓN' : 'CRÍTICO';
}
