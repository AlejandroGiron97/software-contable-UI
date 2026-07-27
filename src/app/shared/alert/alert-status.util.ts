import { AlertCode } from '../../models/period.model';
import { DEBT_RATIO_WARNING_PCT, DEBT_RATIO_CRITICAL_PCT } from '../../models/alert-thresholds.const';

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
  return percentage > DEBT_RATIO_CRITICAL_PCT ? 't-red' : percentage > DEBT_RATIO_WARNING_PCT ? 't-warn' : 't-green';
}
