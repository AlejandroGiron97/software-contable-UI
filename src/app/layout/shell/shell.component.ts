import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LedgerService } from '../../services/ledger.service';
import { FundsService } from '../../services/funds.service';
import { ExcelService } from '../../services/excel.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { computeFundTotals } from '../../core/utils/fund-totals.util';
import { formatCurrency } from '../../core/utils/currency-formatter.util';
import { alertLabel } from '../../shared/alert/alert-status.util';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly ledger = inject(LedgerService);
  readonly funds = inject(FundsService);
  private excelService = inject(ExcelService);
  private pdfReportService = inject(PdfReportService);
  private router = inject(Router);

  readonly formatCurrency = formatCurrency;
  readonly alertLabel = alertLabel;

  importError = '';

  get extraFeeAvailable(): number {
    return this.funds.extraFeeCampaigns().reduce((sum, c) => sum + computeFundTotals(c).available, 0);
  }

  downloadExcel(): void {
    this.excelService.export();
  }

  downloadPdf(): void {
    this.pdfReportService.export();
  }

  async import(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importError = '';
    try {
      await this.excelService.import(file);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.importError = typeof e === 'string' ? e : 'Error al importar.';
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
