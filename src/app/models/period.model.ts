export type AlertCode = 1 | 2 | 3;
export type ItemType = 'ingreso' | 'egreso' | 'ahorro';
export type ItemStatus = 'pagado' | 'pendiente';
export type FundedBySource = 'savings' | 'extra-fee';
export type PaymentMethod = 'bank' | 'cash';

export interface PeriodItem {
  id: string;
  concept: string;
  type: ItemType;
  amount: number;
  date?: string;       // 'YYYY-MM-DD'
  status?: ItemStatus;
  unit?: string;
  fundedBySource?: FundedBySource;    // egreso ya pagado con plata de un fondo (ahorro/cuota extra), no cuenta en los totales del mes
  fundedByCampaignId?: string;        // solo cuando fundedBySource === 'extra-fee'
  paymentMethod?: PaymentMethod;      // por dónde entró/salió la plata físicamente (cuenta bancaria o efectivo)
}

export interface Period {
  year: number;
  month: string;
  items: PeriodItem[];
  income: number;
  expenses: number;
  savings: number;
  cash: number;
  alert: AlertCode;
  debtRatio: number;
  note?: string;
}
