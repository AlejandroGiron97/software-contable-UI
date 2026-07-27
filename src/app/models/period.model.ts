export type AlertCode = 1 | 2 | 3;
export type ItemType = 'ingreso' | 'egreso' | 'ahorro';
export type ItemStatus = 'pagado' | 'pendiente';

export interface PeriodItem {
  id: string;
  concept: string;
  type: ItemType;
  amount: number;
  date?: string;       // 'YYYY-MM-DD'
  status?: ItemStatus;
  unit?: string;
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
