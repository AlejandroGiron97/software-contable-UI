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

type EditableItem = Omit<PeriodItem, 'status' | 'date' | 'unit' | 'fundedBySource' | 'fundedByCampaignId'> & {
  date: string;
  status: string;
  unit: string;
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
  draft: { concept: string; type: ItemType; amount: number; date: string; status: string; unit: string; financing: FinancingValue } = {
    concept: '', type: 'egreso', amount: 0, date: '', status: '', unit: '', financing: null,
  };

  readonly suggestedConcepts = SUGGESTED_CONCEPTS;
  readonly units = UNITS;

  ngOnChanges(): void {
    const p = this.ledger.getPeriod(this.year, this.month);
    this.items = (p?.items ?? []).map(i => ({
      ...i,
      date: i.date ?? '',
      status: i.status ?? '',
      unit: i.unit ?? '',
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

  save(): void {
    this.sortByDate();
    const items: PeriodItem[] = this.items.map(e => {
      const item: PeriodItem = { id: e.id, concept: e.concept, type: e.type, amount: e.amount };
      if (e.date) item.date = e.date;
      if (e.status === 'pagado' || e.status === 'pendiente') item.status = e.status;
      if (e.unit) item.unit = e.unit;
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
    this.items = [...this.items, {
      ...item,
      date: item.date ?? '',
      status: item.status ?? '',
      unit: item.unit ?? '',
      financing: this.draft.type === 'egreso' ? this.draft.financing : null,
    }];
    this.save();
    this.draft = { concept: '', type: this.draft.type, amount: 0, date: '', status: '', unit: '', financing: null };
  }

  remove(index: number): void {
    this.items = this.items.filter((_, idx) => idx !== index);
    this.save();
  }
}
