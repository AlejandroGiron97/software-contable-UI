import { Component, Input, OnChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LedgerService } from '../../services/ledger.service';
import { ItemPeriodo, TipoItem } from '../../models/periodo.model';

const APTOS: string[] = [
  '101', '102', '103', '104',
  '201', '202', '203', '204',
  '301', '302', '303', '304',
  '401', '402', '403', '404',
  '501', '502', '503', '504',
];

const CONCEPTOS_SUGERIDOS = [
  'Pago Administracion',
  'Pago Administracion y parqueo de moto',
  'Implementos de Aseo',
  'Pago Servicio Aseo',
  'Pago Limpieza zona de basuras',
  'Pago Mantenimiento',
];

type ItemEdit = Omit<ItemPeriodo, 'estado' | 'fecha' | 'apto'> & { fecha: string; estado: string; apto: string };

@Component({
  selector: 'app-tabla-items',
  standalone: true,
  imports: [FormsModule, NgClass],
  template: `
    <div class="tabla-items-wrap">

      <table class="items-table">
        <thead>
          <tr>
            <th class="th-n">#</th>
            <th class="th-fecha">Fecha</th>
            <th class="th-concepto">Concepto / Descripción</th>
            <th class="th-tipo">Tipo</th>
            <th class="th-monto">Monto (COP $)</th>
            <th class="th-estado">Estado</th>
            <th class="th-apto">Apto</th>
            <th class="th-del"></th>
          </tr>
        </thead>

        <tbody>
          @if (_items.length === 0) {
            <tr class="tr-empty">
              <td colspan="8">
                <div class="empty-hint">
                  Usa la fila de abajo para agregar el primer concepto de este mes
                </div>
              </td>
            </tr>
          }
          @for (item of _items; track item.id; let i = $index) {
            <tr [class]="'tr-item tr-' + item.tipo">
              <td class="td-n">{{ i + 1 }}</td>
              <td class="td-fecha">
                <input
                  type="date"
                  [(ngModel)]="item.fecha"
                  (blur)="guardar()"
                  (change)="guardar()"
                  class="cell-date"
                />
              </td>
              <td class="td-concepto">
                <input
                  type="text"
                  [(ngModel)]="item.concepto"
                  (blur)="guardar()"
                  (change)="guardar()"
                  placeholder="Ej: Arriendo, Salario, Netflix..."
                  list="conceptos-dl"
                  class="cell-txt"
                />
              </td>
              <td class="td-tipo">
                <select
                  [(ngModel)]="item.tipo"
                  (change)="guardar()"
                  class="cell-sel"
                  [class]="'sel-' + item.tipo"
                >
                  <option value="ingreso">🟢 Ingreso</option>
                  <option value="egreso">🔴 Egreso</option>
                  <option value="ahorro">🔵 Ahorro</option>
                </select>
              </td>
              <td class="td-monto">
                <input
                  type="number"
                  [(ngModel)]="item.monto"
                  (blur)="guardar()"
                  min="0"
                  class="cell-num"
                  [class]="'num-' + item.tipo"
                />
              </td>
              <td class="td-estado">
                <select
                  [(ngModel)]="item.estado"
                  (change)="guardar()"
                  class="cell-sel"
                  [ngClass]="estadoClass(item.estado)"
                >
                  <option value="">— Estado —</option>
                  <option value="pagado">✅ Ya se pagó</option>
                  <option value="pendiente">⏳ Pendiente</option>
                </select>
              </td>
              <td class="td-apto">
                <select
                  [(ngModel)]="item.apto"
                  (change)="guardar()"
                  class="cell-sel"
                  [class.sel-apto-set]="!!item.apto"
                >
                  <option value="">— Apto —</option>
                  @for (a of aptos; track a) {
                    <option [value]="a">{{ a }}</option>
                  }
                  <option value="otros">Otros</option>
                </select>
              </td>
              <td class="td-del">
                <button class="btn-del" (click)="eliminar(i)" title="Eliminar fila">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </td>
            </tr>
          }
        </tbody>

        <!-- NUEVA FILA -->
        <tfoot>
          <tr class="tr-nueva">
            <td class="td-n">+</td>
            <td class="td-fecha">
              <input
                type="date"
                [(ngModel)]="nuevo.fecha"
                class="cell-date nueva"
              />
            </td>
            <td class="td-concepto">
              <input
                type="text"
                [(ngModel)]="nuevo.concepto"
                placeholder="Concepto nuevo..."
                list="conceptos-dl"
                class="cell-txt nueva"
                (keydown.enter)="agregar()"
                #conceptoInput
              />
            </td>
            <td class="td-tipo">
              <select [(ngModel)]="nuevo.tipo" class="cell-sel" [class]="'sel-' + nuevo.tipo">
                <option value="ingreso">🟢 Ingreso</option>
                <option value="egreso">🔴 Egreso</option>
                <option value="ahorro">🔵 Ahorro</option>
              </select>
            </td>
            <td class="td-monto">
              <input
                type="number"
                [(ngModel)]="nuevo.monto"
                placeholder="0"
                min="0"
                class="cell-num"
                (keydown.enter)="agregar()"
              />
            </td>
            <td class="td-estado">
              <select
                [(ngModel)]="nuevo.estado"
                class="cell-sel"
                [ngClass]="estadoClass(nuevo.estado)"
              >
                <option value="">— Estado —</option>
                <option value="pagado">✅ Ya se pagó</option>
                <option value="pendiente">⏳ Pendiente</option>
              </select>
            </td>
            <td class="td-apto">
              <select
                [(ngModel)]="nuevo.apto"
                class="cell-sel"
                [class.sel-apto-set]="!!nuevo.apto"
              >
                <option value="">— Apto —</option>
                @for (a of aptos; track a) {
                  <option [value]="a">{{ a }}</option>
                }
                <option value="otros">Otros</option>
              </select>
            </td>
            <td class="td-del">
              <button
                class="btn-add"
                (click)="agregar()"
                [disabled]="!nuevoValido"
                title="Agregar línea (Enter)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </td>
          </tr>
        </tfoot>
      </table>

      <datalist id="conceptos-dl">
        @for (c of conceptos; track c) {
          <option [value]="c"></option>
        }
      </datalist>

    </div>
  `,
  styles: [`
    .tabla-items-wrap { overflow-x: auto; }

    .items-table {
      width: 100%; border-collapse: collapse;
      font-size: .875rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    thead th {
      padding: .6rem .75rem; text-align: left;
      background: #f8fafc; color: #64748b;
      font-size: .72rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .05em;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
    }
    th.th-n      { width: 36px; text-align: center; }
    th.th-fecha  { width: 130px; }
    th.th-tipo   { width: 145px; }
    th.th-monto  { width: 160px; text-align: right; }
    th.th-estado { width: 140px; }
    th.th-apto   { width: 110px; }
    th.th-del    { width: 40px; }

    tbody tr { border-bottom: 1px solid #f1f5f9; transition: background .1s; }
    tbody tr:hover { background: #f8fafc; }
    tr.tr-ingreso { background: rgba(22,163,74,.04); }
    tr.tr-egreso  { background: rgba(220,38,38,.03); }
    tr.tr-ahorro  { background: rgba(37,99,235,.04); }
    tr.tr-ingreso:hover { background: rgba(22,163,74,.08); }
    tr.tr-egreso:hover  { background: rgba(220,38,38,.07); }
    tr.tr-ahorro:hover  { background: rgba(37,99,235,.07); }

    .td-n { text-align: center; color: #94a3b8; font-size: .78rem; padding: .5rem .4rem; }
    td { padding: .35rem .5rem; vertical-align: middle; }

    .tr-empty td { padding: 2rem; text-align: center; }
    .empty-hint {
      color: #94a3b8; font-size: .82rem;
      background: #f8fafc; border-radius: 8px; padding: 1rem;
      border: 1.5px dashed #e2e8f0;
    }

    /* Inputs inside table */
    .cell-txt {
      width: 100%; border: 1.5px solid transparent;
      border-radius: 6px; padding: .35rem .5rem;
      font-size: .875rem; color: #0f172a; background: transparent;
      outline: none; transition: border-color .15s, background .15s;
    }
    .cell-txt:hover { background: white; border-color: #e2e8f0; }
    .cell-txt:focus { background: white; border-color: #2563eb; }
    .cell-txt.nueva { background: white; border-color: #e2e8f0; }
    .cell-txt.nueva:focus { border-color: #2563eb; }

    .cell-date {
      width: 100%; border: 1.5px solid transparent;
      border-radius: 6px; padding: .3rem .4rem;
      font-size: .8rem; color: #0f172a; background: transparent;
      outline: none; transition: border-color .15s, background .15s;
    }
    .cell-date:hover { background: white; border-color: #e2e8f0; }
    .cell-date:focus { background: white; border-color: #2563eb; }
    .cell-date.nueva { background: white; border-color: #e2e8f0; }

    .cell-sel {
      border: 1.5px solid transparent; border-radius: 6px;
      padding: .35rem .5rem; font-size: .82rem; font-weight: 600;
      outline: none; cursor: pointer; transition: border-color .15s;
      background: transparent; width: 100%;
    }
    .cell-sel:hover, .cell-sel:focus { border-color: #e2e8f0; background: white; }
    .sel-ingreso  { color: #15803d; }
    .sel-egreso   { color: #dc2626; }
    .sel-ahorro   { color: #2563eb; }
    .sel-pagado    { color: #15803d; }
    .sel-pendiente { color: #d97706; }
    .sel-empty     { color: #94a3b8; }
    .sel-apto-set  { color: #7c3aed; font-weight: 700; }

    .cell-num {
      text-align: right; width: 100%;
      border: 1.5px solid transparent; border-radius: 6px;
      padding: .35rem .5rem; font-size: .875rem; font-weight: 600;
      outline: none; transition: border-color .15s; background: transparent;
      -moz-appearance: textfield;
    }
    .cell-num::-webkit-inner-spin-button,
    .cell-num::-webkit-outer-spin-button { -webkit-appearance: none; }
    .cell-num:hover { background: white; border-color: #e2e8f0; }
    .cell-num:focus { background: white; border-color: #2563eb; }
    .num-ingreso { color: #15803d; }
    .num-egreso  { color: #dc2626; }
    .num-ahorro  { color: #2563eb; }

    /* Buttons */
    .btn-del {
      background: none; border: none; cursor: pointer;
      color: #cbd5e1; padding: .3rem; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: color .15s, background .15s;
    }
    .btn-del:hover { color: #dc2626; background: #fef2f2; }
    .btn-del svg { width: 16px; height: 16px; }

    .btn-add {
      background: #2563eb; border: none; cursor: pointer;
      color: white; padding: .3rem; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .btn-add:hover:not(:disabled) { background: #1d4ed8; }
    .btn-add:disabled { background: #e2e8f0; cursor: not-allowed; }
    .btn-add svg { width: 16px; height: 16px; }

    /* Footer row */
    tfoot tr { background: #f8fafc; border-top: 2px solid #e2e8f0; }
    tfoot td { padding: .4rem .5rem; }
  `],
})
export class TablaItemsComponent implements OnChanges {
  @Input() anio!: number;
  @Input() mes!: string;

  private ledger = inject(LedgerService);

  _items: ItemEdit[] = [];
  nuevo: { concepto: string; tipo: TipoItem; monto: number; fecha: string; estado: string; apto: string } = {
    concepto: '', tipo: 'egreso', monto: 0, fecha: '', estado: '', apto: '',
  };

  readonly conceptos = CONCEPTOS_SUGERIDOS;
  readonly aptos = APTOS;

  ngOnChanges(): void {
    const p = this.ledger.getPeriodo(this.anio, this.mes);
    this._items = (p?.items ?? []).map(i => ({
      ...i,
      fecha: i.fecha ?? '',
      estado: i.estado ?? '',
      apto: i.apto ?? '',
    }));
    this.sortarPorFecha();
  }

  get nuevoValido(): boolean {
    return this.nuevo.concepto.trim().length > 0 && +this.nuevo.monto > 0;
  }

  estadoClass(e: string): string {
    if (e === 'pagado') return 'sel-pagado';
    if (e === 'pendiente') return 'sel-pendiente';
    return 'sel-empty';
  }

  guardar(): void {
    this.sortarPorFecha();
    const items: ItemPeriodo[] = this._items.map(e => {
      const item: ItemPeriodo = { id: e.id, concepto: e.concepto, tipo: e.tipo, monto: e.monto };
      if (e.fecha) item.fecha = e.fecha;
      if (e.estado === 'pagado' || e.estado === 'pendiente') item.estado = e.estado;
      if (e.apto) item.apto = e.apto;
      return item;
    });
    this.ledger.actualizarItems(this.anio, this.mes, items);
  }

  private sortarPorFecha(): void {
    this._items = [...this._items].sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0;
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return a.fecha.localeCompare(b.fecha);
    });
  }

  agregar(): void {
    if (!this.nuevoValido) return;
    const item: ItemPeriodo = {
      id: this.ledger.generarId(),
      concepto: this.nuevo.concepto.trim(),
      tipo: this.nuevo.tipo,
      monto: +this.nuevo.monto,
    };
    if (this.nuevo.fecha) item.fecha = this.nuevo.fecha;
    if (this.nuevo.estado === 'pagado' || this.nuevo.estado === 'pendiente') item.estado = this.nuevo.estado;
    if (this.nuevo.apto) item.apto = this.nuevo.apto;
    this._items = [...this._items, { ...item, fecha: item.fecha ?? '', estado: item.estado ?? '', apto: item.apto ?? '' }];
    this.guardar();
    this.nuevo = { concepto: '', tipo: this.nuevo.tipo, monto: 0, fecha: '', estado: '', apto: '' };
  }

  eliminar(i: number): void {
    this._items = this._items.filter((_, idx) => idx !== i);
    this.guardar();
  }
}
