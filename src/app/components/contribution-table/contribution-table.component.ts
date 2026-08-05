import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UNITS } from '../../models/units.const';
import { PaymentMethod } from '../../models/period.model';
import { generateId } from '../../core/utils/id-generator.util';
import { formatCurrency } from '../../core/utils/currency-formatter.util';

export interface ContributionRow {
  id: string;
  date: string;
  amount: number;
  unit?: string;
  reason?: string;
  paymentMethod?: PaymentMethod;
}

@Component({
  selector: 'app-contribution-table',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contribution-table.component.html',
  styleUrl: './contribution-table.component.scss',
})
export class ContributionTableComponent {
  @Input() rows: ContributionRow[] = [];
  @Input() kind: 'aporte' | 'retiro' = 'aporte';
  @Input() showUnit = false;
  @Input() units: string[] = UNITS;
  @Output() rowsChange = new EventEmitter<ContributionRow[]>();

  readonly formatCurrency = formatCurrency;

  draft = this.emptyDraft();

  get isDraftValid(): boolean {
    return +this.draft.amount > 0 && !!this.draft.date;
  }

  add(): void {
    if (!this.isDraftValid) return;
    const row: ContributionRow = { id: generateId(), date: this.draft.date, amount: +this.draft.amount };
    if (this.showUnit && this.draft.unit) row.unit = this.draft.unit;
    if (this.kind === 'retiro' && this.draft.reason.trim()) row.reason = this.draft.reason.trim();
    if (this.draft.paymentMethod === 'bank' || this.draft.paymentMethod === 'cash') row.paymentMethod = this.draft.paymentMethod;
    this.rowsChange.emit([...this.rows, row]);
    this.draft = this.emptyDraft();
  }

  remove(id: string): void {
    this.rowsChange.emit(this.rows.filter(r => r.id !== id));
  }

  private emptyDraft() {
    return { date: new Date().toISOString().slice(0, 10), amount: 0, unit: '', reason: '', paymentMethod: '' };
  }
}
