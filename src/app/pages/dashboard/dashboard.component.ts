import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LedgerService } from '../../services/ledger.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { FundsService } from '../../services/funds.service';
import { ItemsTableComponent } from '../../components/items-table/items-table.component';
import { ChartsComponent } from '../../components/charts/charts.component';
import { PeriodComparisonComponent } from '../../components/period-comparison/period-comparison.component';
import { Period } from '../../models/period.model';
import { formatCurrency, formatCurrencyShort } from '../../core/utils/currency-formatter.util';
import { alertDotClass } from '../../shared/alert/alert-status.util';
import { MONTHS } from '../../core/utils/period-order.util';
import { sumContributionsForPeriod } from '../../core/utils/fund-period-match.util';
import { computeItemsMethodBalance } from '../../core/utils/payment-method-balance.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, ItemsTableComponent, ChartsComponent, PeriodComparisonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly ledger = inject(LedgerService);
  private pdfReportService = inject(PdfReportService);
  private funds = inject(FundsService);

  readonly months = MONTHS;

  readonly formatCurrency = formatCurrency;
  readonly formatCurrencyShort = formatCurrencyShort;
  readonly alertDotClass = alertDotClass;

  selectedKey = signal<string>('');
  newYear = new Date().getFullYear();
  newMonth = 'Enero';

  constructor() {
    const ps = this.ledger.periods();
    if (ps.length) this.selectedKey.set(this.keyOf(ps[0]));
  }

  get currentPeriod(): Period | null {
    const key = this.selectedKey();
    if (!key) return null;
    const [yearStr, month] = key.split('|');
    return this.ledger.getPeriod(+yearStr, month) ?? null;
  }

  get monthAlreadyExists(): boolean {
    return !!this.ledger.getPeriod(+this.newYear, this.newMonth);
  }

  keyOf(p: Period): string { return `${p.year}|${p.month}`; }

  select(p: Period): void { this.selectedKey.set(this.keyOf(p)); }

  addMonth(): void {
    const ok = this.ledger.addMonth(+this.newYear, this.newMonth);
    if (ok) {
      const p = this.ledger.getPeriod(+this.newYear, this.newMonth)!;
      this.selectedKey.set(this.keyOf(p));
      // Advance suggestion to next month
      const idx = MONTHS.indexOf(this.newMonth);
      if (idx === 11) { this.newMonth = 'Enero'; this.newYear += 1; }
      else { this.newMonth = MONTHS[idx + 1]; }
    }
  }

  removeMonth(): void {
    if (!this.currentPeriod) return;
    const { year, month } = this.currentPeriod;
    const ps = this.ledger.periods();
    const idx = ps.findIndex(p => p.year === year && p.month === month);
    this.ledger.removeMonth(year, month);
    const remaining = this.ledger.periods();
    if (remaining.length > 0) {
      const next = remaining[Math.max(0, idx - 1)];
      this.selectedKey.set(this.keyOf(next));
    } else {
      this.selectedKey.set('');
    }
  }

  goToPreviousMonth(): void {
    const ps = this.ledger.periods();
    const idx = ps.findIndex(p => this.keyOf(p) === this.selectedKey());
    if (idx > 0) this.selectedKey.set(this.keyOf(ps[idx - 1]));
  }

  goToNextMonth(): void {
    const ps = this.ledger.periods();
    const idx = ps.findIndex(p => this.keyOf(p) === this.selectedKey());
    if (idx < ps.length - 1) this.selectedKey.set(this.keyOf(ps[idx + 1]));
  }

  get monthSavingsContributed(): number {
    if (!this.currentPeriod) return 0;
    return sumContributionsForPeriod(this.funds.savingsFund().contributions, this.currentPeriod.year, this.currentPeriod.month);
  }

  get monthExtraFeeCollected(): number {
    if (!this.currentPeriod) return 0;
    const { year, month } = this.currentPeriod;
    return this.funds.extraFeeCampaigns()
      .reduce((sum, c) => sum + sumContributionsForPeriod(c.contributions, year, month), 0);
  }

  get monthBankBalance(): number {
    if (!this.currentPeriod) return 0;
    return computeItemsMethodBalance(this.currentPeriod.items, 'bank');
  }

  get monthCashBalance(): number {
    if (!this.currentPeriod) return 0;
    return computeItemsMethodBalance(this.currentPeriod.items, 'cash');
  }

  downloadPdfForMonth(): void { if (this.currentPeriod) this.pdfReportService.exportMonth(this.currentPeriod); }

  onNoteChange(event: Event): void {
    if (!this.currentPeriod) return;
    const note = (event.target as HTMLTextAreaElement).value;
    this.ledger.updateNote(this.currentPeriod.year, this.currentPeriod.month, note);
  }
}
