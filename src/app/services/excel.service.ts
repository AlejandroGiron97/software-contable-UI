import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { LedgerService } from './ledger.service';
import { FileSaverService } from '../core/services/file-saver.service';
import { Period, PeriodItem, ItemType, ItemStatus } from '../models/period.model';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private ledger = inject(LedgerService);
  private fileSaver = inject(FileSaverService);

  async export(periods: Period[]): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: item detail (primary data source for re-import)
    const detailRows = periods.flatMap(p =>
      p.items.map(item => ({
        'Año': p.year,
        'Mes': p.month,
        'Fecha': item.date ?? '',
        'Concepto': item.concept,
        'Tipo': item.type,
        'Monto': item.amount,
        'Estado': item.status ?? '',
        'Apto': item.unit ?? '',
      }))
    );
    const detailSheet = XLSX.utils.json_to_sheet(
      detailRows.length ? detailRows : [{ 'Año': '', 'Mes': '', 'Concepto': '', 'Tipo': '', 'Monto': '' }]
    );
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle');

    // Sheet 2: monthly summary (human-readable)
    const summaryRows = periods.map(p => ({
      'Año': p.year,
      'Mes': p.month,
      'Ingresos': p.income,
      'Egresos': p.expenses,
      'Ahorro': p.savings,
      'Caja': p.cash,
      'Alerta_Cod': p.alert,
      'Nota': p.note ?? '',
    }));
    const summarySheet = XLSX.utils.json_to_sheet(
      summaryRows.length ? summaryRows : [{ 'Año': '', 'Mes': '', 'Ingresos': 0, 'Egresos': 0, 'Ahorro': 0, 'Caja': 0, 'Alerta_Cod': 1 }]
    );
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = 'historial-contable.xlsx';
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    await this.fileSaver.save(new Blob([buffer], { type: mimeType }), fileName, mimeType, 'Archivo Excel');
  }

  import(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          if (workbook.SheetNames.includes('Detalle')) {
            this.importFromDetailSheet(workbook, resolve, reject);
          } else {
            reject('Formato no reconocido. Importe un archivo exportado por esta aplicación.');
          }
        } catch (e: any) {
          reject(e?.message ?? 'Error al leer el archivo.');
        }
      };
      reader.onerror = () => reject('No se pudo leer el archivo.');
      reader.readAsArrayBuffer(file);
    });
  }

  private importFromDetailSheet(
    workbook: XLSX.WorkBook,
    resolve: () => void,
    reject: (r: string) => void
  ): void {
    const sheet = workbook.Sheets['Detalle'];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) { reject('La hoja Detalle está vacía.'); return; }

    const schema = ['Año', 'Mes', 'Concepto', 'Tipo', 'Monto'];
    const keys = Object.keys(rows[0]);
    if (!schema.every(h => keys.includes(h))) {
      reject('Columnas incorrectas en hoja Detalle. Use un archivo exportado por esta aplicación.');
      return;
    }

    // Group items by (Año, Mes)
    const periodMap = new Map<string, { year: number; month: string; items: PeriodItem[] }>();
    rows.forEach(r => {
      const year = +r['Año'];
      const month = String(r['Mes']);
      const key = `${year}|${month}`;
      if (!periodMap.has(key)) periodMap.set(key, { year, month, items: [] });
      const item: PeriodItem = {
        id: this.ledger.generateId(),
        concept: String(r['Concepto']),
        type: String(r['Tipo']) as ItemType,
        amount: +r['Monto'],
      };
      const date = r['Fecha'] ? String(r['Fecha']).trim() : '';
      if (date) item.date = date;
      const status = r['Estado'] ? String(r['Estado']).trim() : '';
      if (status === 'pagado' || status === 'pendiente') item.status = status as ItemStatus;
      const unit = r['Apto'] ? String(r['Apto']).trim() : '';
      if (unit) item.unit = unit;
      periodMap.get(key)!.items.push(item);
    });

    // Leer notas de la hoja Resumen si existe
    const notesMap = new Map<string, string>();
    if (workbook.Sheets['Resumen']) {
      const summaryRows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets['Resumen']);
      summaryRows.forEach(r => {
        const note = r['Nota'] ? String(r['Nota']).trim() : '';
        if (note) notesMap.set(`${r['Año']}|${r['Mes']}`, note);
      });
    }

    const periods: Period[] = [];
    periodMap.forEach(({ year, month, items }) => {
      const income = items.filter(i => i.type === 'ingreso').reduce((s, i) => s + i.amount, 0);
      const expenses = items.filter(i => i.type === 'egreso').reduce((s, i) => s + i.amount, 0);
      const savings = items.filter(i => i.type === 'ahorro').reduce((s, i) => s + i.amount, 0);
      const cash = income - expenses - savings;
      const debtRatio = income > 0 ? (expenses / income) * 100 : 0;
      const alert = this.ledger.calculateAlert(expenses, income, cash);
      const period: Period = { year, month, items, income, expenses, savings, cash, alert, debtRatio };
      const note = notesMap.get(`${year}|${month}`);
      if (note) period.note = note;
      periods.push(period);
    });

    this.ledger.loadPeriods(periods);
    resolve();
  }
}
