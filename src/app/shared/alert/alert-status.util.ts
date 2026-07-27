import { AlertCode } from '../../models/period.model';

export function alertDotClass(code: AlertCode): string {
  return `d-${code}`;
}

export function alertBadgeClass(code: AlertCode): string {
  return `mh-${code}`;
}

export function alertLabel(code: AlertCode): string {
  return code === 1 ? 'SUPERÁVIT' : code === 2 ? 'PREVENCIÓN' : 'CRÍTICO';
}

export function debtRatioClass(percentage: number): string {
  return percentage > 90 ? 't-red' : percentage > 70 ? 't-warn' : 't-green';
}
