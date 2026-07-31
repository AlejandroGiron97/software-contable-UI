import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FundsService } from '../../services/funds.service';
import { computeFundTotals } from '../../core/utils/fund-totals.util';
import { FundTotals } from '../../models/fund.model';
import { formatCurrency } from '../../core/utils/currency-formatter.util';

@Component({
  selector: 'app-extra-fees',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './extra-fees.component.html',
  styleUrl: './extra-fees.component.scss',
})
export class ExtraFeesComponent {
  private funds = inject(FundsService);
  private router = inject(Router);

  readonly formatCurrency = formatCurrency;
  readonly campaigns = this.funds.extraFeeCampaigns;

  newName = '';
  newGoal = 0;

  get isNewValid(): boolean {
    return this.newName.trim().length > 0 && +this.newGoal > 0;
  }

  totalsFor(campaignId: string): FundTotals {
    const c = this.campaigns().find(x => x.id === campaignId);
    return c ? computeFundTotals(c) : { collected: 0, withdrawn: 0, available: 0 };
  }

  progressPct(campaignId: string): number {
    const c = this.campaigns().find(x => x.id === campaignId);
    if (!c || c.goal <= 0) return 0;
    return Math.min(100, (this.totalsFor(campaignId).collected / c.goal) * 100);
  }

  createCampaign(): void {
    if (!this.isNewValid) return;
    const id = this.funds.createCampaign(this.newName.trim(), +this.newGoal);
    this.newName = '';
    this.newGoal = 0;
    this.router.navigate(['/cuotas-extraordinarias', id]);
  }

  open(campaignId: string): void {
    this.router.navigate(['/cuotas-extraordinarias', campaignId]);
  }
}
