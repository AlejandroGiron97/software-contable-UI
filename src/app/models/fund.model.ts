import { PaymentMethod } from './period.model';

export interface FundContribution {
  id: string;
  date: string;       // 'YYYY-MM-DD'
  amount: number;
  unit?: string;       // solo aplica a cuotas extraordinarias (aporte por apartamento)
  paymentMethod?: PaymentMethod;
}

export interface FundWithdrawal {
  id: string;
  date: string;
  amount: number;
  reason?: string;
  paymentMethod?: PaymentMethod;
}

export interface FundBase {
  contributions: FundContribution[];
  withdrawals: FundWithdrawal[];
  note?: string;
}

export interface SavingsFund extends FundBase {}

export interface ExtraFeeCampaign extends FundBase {
  id: string;
  name: string;
  goal: number;
}

export interface FundTotals {
  collected: number;
  withdrawn: number;
  available: number;
}
