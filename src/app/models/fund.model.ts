export interface FundContribution {
  id: string;
  date: string;       // 'YYYY-MM-DD'
  amount: number;
  unit?: string;       // solo aplica a cuotas extraordinarias (aporte por apartamento)
}

export interface FundWithdrawal {
  id: string;
  date: string;
  amount: number;
  reason?: string;
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
