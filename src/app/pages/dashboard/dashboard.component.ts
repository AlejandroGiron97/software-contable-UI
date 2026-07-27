import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LedgerService } from '../../services/ledger.service';
import { ExcelService } from '../../services/excel.service';
import { PdfReportService } from '../../services/pdf-report.service';
import { ItemsTableComponent } from '../../components/items-table/items-table.component';
import { ChartsComponent } from '../../components/charts/charts.component';
import { Period } from '../../models/period.model';
import { formatCurrency, formatCurrencyShort } from '../../core/utils/currency-formatter.util';
import { alertDotClass, alertBadgeClass, alertLabel, debtRatioClass } from '../../shared/alert/alert-status.util';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, ItemsTableComponent, ChartsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly ledger = inject(LedgerService);
  private excelService = inject(ExcelService);
  private pdfReportService = inject(PdfReportService);
  private router = inject(Router);

  readonly months = MONTHS;
  readonly Math = Math;

  readonly formatCurrency = formatCurrency;
  readonly formatCurrencyShort = formatCurrencyShort;
  readonly alertDotClass = alertDotClass;
  readonly alertBadgeClass = alertBadgeClass;
  readonly alertLabel = alertLabel;
  readonly debtRatioClass = debtRatioClass;

  selectedKey = signal<string>('');
  newYear = new Date().getFullYear();
  newMonth = 'Enero';
  importError = '';

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

  downloadExcel(): void { this.excelService.export(this.ledger.periods()); }
  downloadPdf(): void { this.pdfReportService.export(this.ledger.periods()); }
  downloadPdfForMonth(): void { if (this.currentPeriod) this.pdfReportService.exportMonth(this.currentPeriod); }

  onNoteChange(event: Event): void {
    if (!this.currentPeriod) return;
    const note = (event.target as HTMLTextAreaElement).value;
    this.ledger.updateNote(this.currentPeriod.year, this.currentPeriod.month, note);
  }

  async import(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importError = '';
    try {
      await this.excelService.import(file);
      const ps = this.ledger.periods();
      if (ps.length) this.selectedKey.set(this.keyOf(ps[0]));
    } catch (e: any) {
      this.importError = typeof e === 'string' ? e : 'Error al importar.';
    }
  }

  goHome(): void { this.router.navigate(['/']); }
}
