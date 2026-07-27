import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { LedgerService } from './ledger.service';
import { Periodo, ItemPeriodo, TipoItem, EstadoItem } from '../models/periodo.model';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private ledger = inject(LedgerService);

  async exportar(periodos: Periodo[]): Promise<void> {
    const wb = XLSX.utils.book_new();

    // Sheet 1: item detail (primary data source for re-import)
    const detalle = periodos.flatMap(p =>
      p.items.map(item => ({
        'Año': p.anio,
        'Mes': p.mes,
        'Fecha': item.fecha ?? '',
        'Concepto': item.concepto,
        'Tipo': item.tipo,
        'Monto': item.monto,
        'Estado': item.estado ?? '',
        'Apto': item.apto ?? '',
      }))
    );
    const wsDetalle = XLSX.utils.json_to_sheet(
      detalle.length ? detalle : [{ 'Año': '', 'Mes': '', 'Concepto': '', 'Tipo': '', 'Monto': '' }]
    );
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

    // Sheet 2: monthly summary (human-readable)
    const resumen = periodos.map(p => ({
      'Año': p.anio,
      'Mes': p.mes,
      'Ingresos': p.ingresos,
      'Egresos': p.egresos,
      'Ahorro': p.ahorro,
      'Caja': p.caja,
      'Alerta_Cod': p.alerta,
      'Nota': p.nota ?? '',
    }));
    const wsResumen = XLSX.utils.json_to_sheet(
      resumen.length ? resumen : [{ 'Año': '', 'Mes': '', 'Ingresos': 0, 'Egresos': 0, 'Ahorro': 0, 'Caja': 0, 'Alerta_Cod': 1 }]
    );
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const nombre = 'historial-contable.xlsx';

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: nombre,
          types: [{ description: 'Archivo Excel', accept: { [mime]: ['.xlsx'] } }],
        });
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const writable = await handle.createWritable();
        await writable.write(new Blob([buffer], { type: mime }));
        await writable.close();
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    XLSX.writeFile(wb, nombre);
  }

  importar(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });

          if (wb.SheetNames.includes('Detalle')) {
            this.importarDesdeDetalle(wb, resolve, reject);
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

  private importarDesdeDetalle(
    wb: XLSX.WorkBook,
    resolve: () => void,
    reject: (r: string) => void
  ): void {
    const ws = wb.Sheets['Detalle'];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) { reject('La hoja Detalle está vacía.'); return; }

    const schema = ['Año', 'Mes', 'Concepto', 'Tipo', 'Monto'];
    const keys = Object.keys(rows[0]);
    if (!schema.every(h => keys.includes(h))) {
      reject('Columnas incorrectas en hoja Detalle. Use un archivo exportado por esta aplicación.');
      return;
    }

    // Group items by (Año, Mes)
    const map = new Map<string, { anio: number; mes: string; items: ItemPeriodo[] }>();
    rows.forEach(r => {
      const anio = +r['Año'];
      const mes = String(r['Mes']);
      const key = `${anio}|${mes}`;
      if (!map.has(key)) map.set(key, { anio, mes, items: [] });
      const item: ItemPeriodo = {
        id: this.ledger.generarId(),
        concepto: String(r['Concepto']),
        tipo: String(r['Tipo']) as TipoItem,
        monto: +r['Monto'],
      };
      const fecha = r['Fecha'] ? String(r['Fecha']).trim() : '';
      if (fecha) item.fecha = fecha;
      const estado = r['Estado'] ? String(r['Estado']).trim() : '';
      if (estado === 'pagado' || estado === 'pendiente') item.estado = estado as EstadoItem;
      const apto = r['Apto'] ? String(r['Apto']).trim() : '';
      if (apto) item.apto = apto;
      map.get(key)!.items.push(item);
    });

    // Leer notas de la hoja Resumen si existe
    const notasMap = new Map<string, string>();
    if (wb.Sheets['Resumen']) {
      const resRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets['Resumen']);
      resRows.forEach(r => {
        const nota = r['Nota'] ? String(r['Nota']).trim() : '';
        if (nota) notasMap.set(`${r['Año']}|${r['Mes']}`, nota);
      });
    }

    const periodos: Periodo[] = [];
    map.forEach(({ anio, mes, items }) => {
      const ingresos = items.filter(i => i.tipo === 'ingreso').reduce((s, i) => s + i.monto, 0);
      const egresos = items.filter(i => i.tipo === 'egreso').reduce((s, i) => s + i.monto, 0);
      const ahorro = items.filter(i => i.tipo === 'ahorro').reduce((s, i) => s + i.monto, 0);
      const caja = ingresos - egresos - ahorro;
      const endeudamiento = ingresos > 0 ? (egresos / ingresos) * 100 : 0;
      const alerta = this.ledger.calcularAlerta(egresos, ingresos, caja);
      const periodo: Periodo = { anio, mes, items, ingresos, egresos, ahorro, caja, alerta, endeudamiento };
      const nota = notasMap.get(`${anio}|${mes}`);
      if (nota) periodo.nota = nota;
      periodos.push(periodo);
    });

    this.ledger.cargarPeriodos(periodos);
    resolve();
  }
}
