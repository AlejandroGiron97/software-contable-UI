import { Component, Input, OnChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LedgerService } from '../../services/ledger.service';
import { PeriodItem, ItemType } from '../../models/period.model';

const UNITS: string[] = [
  '101', '102', '103', '104',
  '201', '202', '203', '204',
  '301', '302', '303', '304',
  '401', '402', '403', '404',
  '501', '502', '503', '504',
];

const SUGGESTED_CONCEPTS = [
  'Pago Administracion',
  'Pago Administracion y parqueo de moto',
  'Implementos de Aseo',
  'Pago Servicio Aseo',
  'Pago Limpieza zona de basuras',
  'Pago Mantenimiento',
];

type EditableItem = Omit<PeriodItem, 'status' | 'date' | 'unit'> & { date: string; status: string; unit: string };

@Component({
  selector: 'app-items-table',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './items-table.component.html',
  styleUrl: './items-table.component.scss',
})
export class ItemsTableComponent implements OnChanges {
  @Input() year!: number;
  @Input() month!: string;

  private ledger = inject(LedgerService);

  items: EditableItem[] = [];
  draft: { concept: string; type: ItemType; amount: number; date: string; status: string; unit: string } = {
    concept: '', type: 'egreso', amount: 0, date: '', status: '', unit: '',
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
    this.items = [...this.items, { ...item, date: item.date ?? '', status: item.status ?? '', unit: item.unit ?? '' }];
    this.save();
    this.draft = { concept: '', type: this.draft.type, amount: 0, date: '', status: '', unit: '' };
  }

  remove(index: number): void {
    this.items = this.items.filter((_, idx) => idx !== index);
    this.save();
  }
}
