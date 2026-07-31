import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FundsService } from '../../services/funds.service';
import { LedgerService } from '../../services/ledger.service';
import { ContributionTableComponent, ContributionRow } from '../../components/contribution-table/contribution-table.component';
import { EvolutionChartComponent } from '../../components/evolution-chart/evolution-chart.component';
import { buildFundTimeline, FundTimelinePoint } from '../../core/utils/fund-timeline.util';
import { groupContributionsByMonth, MonthlyTotal } from '../../core/utils/monthly-breakdown.util';
import { findLinkedExpenses, LinkedExpense } from '../../core/utils/linked-expenses.util';
import { formatCurrency } from '../../core/utils/currency-formatter.util';

@Component({
  selector: 'app-extra-fee-detail',
  standalone: true,
  imports: [ContributionTableComponent, EvolutionChartComponent],
  templateUrl: './extra-fee-detail.component.html',
  styleUrl: './extra-fee-detail.component.scss',
})
export class ExtraFeeDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funds = inject(FundsService);
  private ledger = inject(LedgerService);

  readonly formatCurrency = formatCurrency;
  private campaignId = this.route.snapshot.paramMap.get('id') ?? '';

  get campaign() {
    return this.funds.getCampaign(this.campaignId);
  }

  get totals() {
    return this.funds.campaignTotals(this.campaignId);
  }

  get progressPct(): number {
    const c = this.campaign;
    if (!c || c.goal <= 0) return 0;
    return Math.min(100, (this.totals.collected / c.goal) * 100);
  }

  get timeline(): FundTimelinePoint[] {
    const c = this.campaign;
    return c ? buildFundTimeline(c) : [];
  }

  get monthlyTotals(): MonthlyTotal[] {
    const c = this.campaign;
    return c ? groupContributionsByMonth(c.contributions) : [];
  }

  get linkedExpenses(): LinkedExpense[] {
    return findLinkedExpenses(
      this.ledger.periods(),
      i => i.fundedBySource === 'extra-fee' && i.fundedByCampaignId === this.campaignId
    );
  }

  get linkedExpensesTotal(): number {
    return this.linkedExpenses.reduce((s, e) => s + e.amount, 0);
  }

  onContributionsChange(rows: ContributionRow[]): void {
    this.funds.setCampaignContributions(this.campaignId, rows);
  }

  onWithdrawalsChange(rows: ContributionRow[]): void {
    this.funds.setCampaignWithdrawals(this.campaignId, rows);
  }

  onNoteChange(event: Event): void {
    const note = (event.target as HTMLTextAreaElement).value;
    this.funds.updateCampaignNote(this.campaignId, note);
  }

  removeCampaign(): void {
    this.funds.removeCampaign(this.campaignId);
    this.goBack();
  }

  goBack(): void {
    this.router.navigate(['/cuotas-extraordinarias']);
  }
}
