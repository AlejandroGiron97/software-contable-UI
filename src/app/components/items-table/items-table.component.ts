import { Component, Input, OnChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LedgerService } from '../../services/ledger.service';
import { PeriodItem, ItemType } from '../../models/period.model';
import { UNITS } from '../../models/units.const';
import { FinancingSelectComponent, FinancingValue } from '../financing-select/financing-select.component';

const SUGGESTED_CONCEPTS = [
  'Pago Administracion',
  'Pago Administracion y parqueo de moto',
  'Implementos de Aseo',
  'Pago Servicio Aseo',
  'Pago Limpieza zona de basuras',
  'Pago Mantenimiento',
];

type EditableItem = Omit<PeriodItem, 'status' | 'date' | 'unit' | 'fundedBySource' | 'fundedByCampaignId' | 'paymentMethod'> & {
  date: string;
  status: string;
  unit: string;
  paymentMethod: string;
  financing: FinancingValue;
};

function toFinancing(item: Pick<PeriodItem, 'fundedBySource' | 'fundedByCampaignId'>): FinancingValue {
  if (item.fundedBySource === 'savings') return { source: 'savings' };
  if (item.fundedBySource === 'extra-fee' && item.fundedByCampaignId) {
    return { source: 'extra-fee', campaignId: item.fundedByCampaignId };
  }
  return null;
}

@Component({
  selector: 'app-items-table',
  standalone: true,
  imports: [FormsModule, NgClass, FinancingSelectComponent],
  templateUrl: './items-table.component.html',
  styleUrl: './items-table.component.scss',
})
export class ItemsTableComponent implements OnChanges {
  @Input() year!: number;
  @Input() month!: string;

  private ledger = inject(LedgerService);

  items: EditableItem[] = [];
  draft: {
    concept: string; type: ItemType; amount: number; date: string; status: string;
    unit: string; paymentMethod: string; financing: FinancingValue;
  } = {
    concept: '', type: 'egreso', amount: 0, date: '', status: '', unit: '', paymentMethod: '', financing: null,
  };

  readonly suggestedConcepts = SUGGESTED_CONCEPTS;
  readonly units = UNITS;

  filters = {
    dateFrom: '',
    dateTo: '',
    type: '' as '' | 'ingreso' | 'egreso',
    paymentMethod: '' as '' | 'bank' | 'cash',
    minAmount: null as number | null,
    maxAmount: null as number | null,
  };

  get filteredItems(): EditableItem[] {
    return this.items.filter(i => {
      if (this.filters.dateFrom && (!i.date || i.date < this.filters.dateFrom)) return false;
      if (this.filters.dateTo && (!i.date || i.date > this.filters.dateTo)) return false;
      if (this.filters.type && i.type !== this.filters.type) return false;
      if (this.filters.paymentMethod && i.paymentMethod !== this.filters.paymentMethod) return false;
      if (this.filters.minAmount != null && i.amount < this.filters.minAmount) return false;
      if (this.filters.maxAmount != null && i.amount > this.filters.maxAmount) return false;
      return true;
    });
  }

  get hasActiveFilters(): boolean {
    const f = this.filters;
    return !!(f.dateFrom || f.dateTo || f.type || f.paymentMethod || f.minAmount != null || f.maxAmount != null);
  }

  clearFilters(): void {
    this.filters = { dateFrom: '', dateTo: '', type: '', paymentMethod: '', minAmount: null, maxAmount: null };
  }

  ngOnChanges(): void {
    const p = this.ledger.getPeriod(this.year, this.month);
    this.items = (p?.items ?? []).map(i => ({
      ...i,
      date: i.date ?? '',
      status: i.status ?? '',
      unit: i.unit ?? '',
      paymentMethod: i.paymentMethod ?? '',
      financing: toFinancing(i),
    }));
    this.sortByDate();
  }

  get isDraftValid(): boolean {
    return this.draft.concept.trim().length > 0 && +this.draft.amount > 0;
  }

  statusClass(status: string): string {
    if (status === 'pagado') return 'sel-pagado';
    if (status === 'pendiente') return 'sel-pendiente';
    return 'sel-empty';
  }

  paymentMethodClass(method: string): string {
    if (method === 'bank') return 'sel-bank';
    if (method === 'cash') return 'sel-cash';
    return 'sel-empty';
  }

  save(): void {
    this.sortByDate();
    const items: PeriodItem[] = this.items.map(e => {
      const item: PeriodItem = { id: e.id, concept: e.concept, type: e.type, amount: e.amount };
      if (e.date) item.date = e.date;
      if (e.status === 'pagado' || e.status === 'pendiente') item.status = e.status;
      if (e.unit) item.unit = e.unit;
      if (e.paymentMethod === 'bank' || e.paymentMethod === 'cash') item.paymentMethod = e.paymentMethod;
      if (e.financing?.source === 'savings') {
        item.fundedBySource = 'savings';
      } else if (e.financing?.source === 'extra-fee') {
        item.fundedBySource = 'extra-fee';
        item.fundedByCampaignId = e.financing.campaignId;
      }
      return item;
    });
    this.ledger.updateItems(this.year, this.month, items);
  }

  private sortByDate(): void {
    this.items = [...this.items].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }

  add(): void {
    if (!this.isDraftValid) return;
    const item: PeriodItem = {
      id: this.ledger.generateId(),
      concept: this.draft.concept.trim(),
      type: this.draft.type,
      amount: +this.draft.amount,
    };
    if (this.draft.date) item.date = this.draft.date;
    if (this.draft.status === 'pagado' || this.draft.status === 'pendiente') item.status = this.draft.status;
    if (this.draft.unit) item.unit = this.draft.unit;
    if (this.draft.paymentMethod === 'bank' || this.draft.paymentMethod === 'cash') item.paymentMethod = this.draft.paymentMethod;
    this.items = [...this.items, {
      ...item,
      date: item.date ?? '',
      status: item.status ?? '',
      unit: item.unit ?? '',
      paymentMethod: item.paymentMethod ?? '',
      financing: this.draft.type === 'egreso' ? this.draft.financing : null,
    }];
    this.save();
    this.draft = { concept: '', type: this.draft.type, amount: 0, date: '', status: '', unit: '', paymentMethod: '', financing: null };
  }

  remove(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  }
}
