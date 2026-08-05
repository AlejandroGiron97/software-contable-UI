import { Component, inject } from '@angular/core';
import { FundsService } from '../../services/funds.service';
import { LedgerService } from '../../services/ledger.service';
import { ContributionTableComponent, ContributionRow } from '../../components/contribution-table/contribution-table.component';
import { EvolutionChartComponent } from '../../components/evolution-chart/evolution-chart.component';
import { buildFundTimeline } from '../../core/utils/fund-timeline.util';
import { findLinkedExpenses, LinkedExpense } from '../../core/utils/linked-expenses.util';
import { computeFundMethodBalance } from '../../core/utils/fund-totals.util';
import { formatCurrency } from '../../core/utils/currency-formatter.util';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [ContributionTableComponent, EvolutionChartComponent],
  templateUrl: './savings.component.html',
  styleUrl: './savings.component.scss',
})
export class SavingsComponent {
  private funds = inject(FundsService);
  private ledger = inject(LedgerService);

  readonly formatCurrency = formatCurrency;
  readonly fund = this.funds.savingsFund;
  readonly totals = this.funds.savingsTotals;

  get timeline() {
    return buildFundTimeline(this.fund());
  }

  get bankBalance(): number {
    return computeFundMethodBalance(this.fund(), 'bank');
  }

  get cashBalance(): number {
    return computeFundMethodBalance(this.fund(), 'cash');
  }

  get linkedExpenses(): LinkedExpense[] {
    return findLinkedExpenses(this.ledger.periods(), i => i.fundedBySource === 'savings');
  }

  get linkedExpensesTotal(): number {
    return this.linkedExpenses.reduce((s, e) => s + e.amount, 0);
  }

  onContributionsChange(rows: ContributionRow[]): void {
    this.funds.setSavingsContributions(rows);
  }

  onWithdrawalsChange(rows: ContributionRow[]): void {
    this.funds.setSavingsWithdrawals(rows);
  }

  onNoteChange(event: Event): void {
    const note = (event.target as HTMLTextAreaElement).value;
    this.funds.updateSavingsNote(note);
  }
}
