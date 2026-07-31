import { Injectable, inject } from '@angular/core';
import type * as XLSXModule from 'xlsx';
import type { WorkBook } from 'xlsx';
import { LedgerService } from './ledger.service';
import { FundsService } from './funds.service';
import { FileSaverService } from '../core/services/file-saver.service';
import { Period, PeriodItem, ItemType, ItemStatus } from '../models/period.model';
import { SavingsFund, ExtraFeeCampaign, FundContribution, FundWithdrawal } from '../models/fund.model';
import { computeFundTotals } from '../core/utils/fund-totals.util';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private ledger = inject(LedgerService);
  private funds = inject(FundsService);
  private fileSaver = inject(FileSaverService);

  async export(): Promise<void> {
    const periods = this.ledger.periods();
    const savingsFund = this.funds.savingsFund();
    const campaigns = this.funds.extraFeeCampaigns();
    const campaignNameById = new Map(campaigns.map(c => [c.id, c.name]));

    const XLSX = await import('xlsx');
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
        'Financiado_Por': item.fundedBySource === 'savings'
          ? 'Ahorro'
          : item.fundedBySource === 'extra-fee'
            ? (campaignNameById.get(item.fundedByCampaignId ?? '') ?? '')
            : '',
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

    // Sheet 3: savings detail (contributions + withdrawals)
    const savingsDetailRows = [
      ...savingsFund.contributions.map(c => ({ 'Fecha': c.date, 'Tipo': 'Aporte', 'Monto': c.amount, 'Motivo': '' })),
      ...savingsFund.withdrawals.map(w => ({ 'Fecha': w.date, 'Tipo': 'Retiro', 'Monto': w.amount, 'Motivo': w.reason ?? '' })),
    ];
    const savingsDetailSheet = XLSX.utils.json_to_sheet(
      savingsDetailRows.length ? savingsDetailRows : [{ 'Fecha': '', 'Tipo': '', 'Monto': '', 'Motivo': '' }]
    );
    XLSX.utils.book_append_sheet(workbook, savingsDetailSheet, 'Ahorro_Detalle');

    // Sheet 4: savings summary
    const savingsTotals = computeFundTotals(savingsFund);
    const savingsSummarySheet = XLSX.utils.json_to_sheet([{
      'Total Aportado': savingsTotals.collected,
      'Total Retirado': savingsTotals.withdrawn,
      'Saldo': savingsTotals.available,
      'Nota': savingsFund.note ?? '',
    }]);
    XLSX.utils.book_append_sheet(workbook, savingsSummarySheet, 'Ahorro_Resumen');

    // Sheet 5: extra-fee campaigns detail (contributions + withdrawals)
    const campaignDetailRows = campaigns.flatMap(c => [
      ...c.contributions.map(x => ({ 'Campaña': c.name, 'Tipo': 'Aporte', 'Fecha': x.date, 'Monto': x.amount, 'Apto': x.unit ?? '', 'Motivo': '' })),
      ...c.withdrawals.map(x => ({ 'Campaña': c.name, 'Tipo': 'Retiro', 'Fecha': x.date, 'Monto': x.amount, 'Apto': '', 'Motivo': x.reason ?? '' })),
    ]);
    const campaignDetailSheet = XLSX.utils.json_to_sheet(
      campaignDetailRows.length ? campaignDetailRows : [{ 'Campaña': '', 'Tipo': '', 'Fecha': '', 'Monto': '', 'Apto': '', 'Motivo': '' }]
    );
    XLSX.utils.book_append_sheet(workbook, campaignDetailSheet, 'Cuotas_Detalle');

    // Sheet 6: extra-fee campaigns summary (one row per campaign, acts as the campaign registry on import)
    const campaignSummaryRows = campaigns.map(c => {
      const t = computeFundTotals(c);
      return {
        'Campaña': c.name,
        'Meta': c.goal,
        'Recaudado': t.collected,
        'Retirado': t.withdrawn,
        'Saldo': t.available,
        '% Meta': c.goal > 0 ? +((t.collected / c.goal) * 100).toFixed(1) : 0,
        'Nota': c.note ?? '',
      };
    });
    const campaignSummarySheet = XLSX.utils.json_to_sheet(
      campaignSummaryRows.length ? campaignSummaryRows : [{ 'Campaña': '', 'Meta': 0, 'Recaudado': 0, 'Retirado': 0, 'Saldo': 0, '% Meta': 0, 'Nota': '' }]
    );
    XLSX.utils.book_append_sheet(workbook, campaignSummarySheet, 'Cuotas_Resumen');

    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = 'historial-contable.xlsx';
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    await this.fileSaver.save(new Blob([buffer], { type: mimeType }), fileName, mimeType, 'Archivo Excel');
  }

  import(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async evt => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          if (workbook.SheetNames.includes('Detalle')) {
            this.importFromDetailSheet(XLSX, workbook, resolve, reject);
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
    XLSX: typeof XLSXModule,
    workbook: WorkBook,
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

    // Fondos (Ahorro / Cuotas extraordinarias) son opcionales: si el archivo es anterior a esta
    // funcionalidad, simplemente no tendrá esas hojas y se reconstruyen vacíos.
    const { savingsFund, extraFeeCampaigns } = this.readFundsFromWorkbook(XLSX, workbook);
    const campaignIdByName = new Map(extraFeeCampaigns.map(c => [c.name, c.id]));

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
      const financiadoPor = r['Financiado_Por'] ? String(r['Financiado_Por']).trim() : '';
      if (financiadoPor === 'Ahorro') {
        item.fundedBySource = 'savings';
      } else if (financiadoPor) {
        const campaignId = campaignIdByName.get(financiadoPor);
        if (campaignId) {
          item.fundedBySource = 'extra-fee';
          item.fundedByCampaignId = campaignId;
        }
      }
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
      const period: Period = { year, month, items, ...this.ledger.computeTotals(items) };
      const note = notesMap.get(`${year}|${month}`);
      if (note) period.note = note;
      periods.push(period);
    });

    this.ledger.loadPeriods(periods);
    this.funds.loadFunds({ savingsFund, extraFeeCampaigns });
    resolve();
  }

  private readFundsFromWorkbook(
    XLSX: typeof XLSXModule,
    workbook: WorkBook
  ): { savingsFund: SavingsFund; extraFeeCampaigns: ExtraFeeCampaign[] } {
    const savingsFund: SavingsFund = { contributions: [], withdrawals: [] };
    if (workbook.Sheets['Ahorro_Detalle']) {
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets['Ahorro_Detalle']);
      rows.forEach(r => {
        const date = r['Fecha'] ? String(r['Fecha']).trim() : '';
        const amount = +r['Monto'];
        if (!date || !amount) return;
        const tipo = String(r['Tipo'] ?? '').trim();
        if (tipo === 'Aporte') {
          savingsFund.contributions.push({ id: this.ledger.generateId(), date, amount });
        } else if (tipo === 'Retiro') {
          const reason = r['Motivo'] ? String(r['Motivo']).trim() : '';
          const withdrawal: FundWithdrawal = { id: this.ledger.generateId(), date, amount };
          if (reason) withdrawal.reason = reason;
          savingsFund.withdrawals.push(withdrawal);
        }
      });
    }
    if (workbook.Sheets['Ahorro_Resumen']) {
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets['Ahorro_Resumen']);
      const note = rows[0]?.['Nota'] ? String(rows[0]['Nota']).trim() : '';
      if (note) savingsFund.note = note;
    }

    const campaignsByName = new Map<string, ExtraFeeCampaign>();
    if (workbook.Sheets['Cuotas_Resumen']) {
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets['Cuotas_Resumen']);
      rows.forEach(r => {
        const name = r['Campaña'] ? String(r['Campaña']).trim() : '';
        if (!name) return;
        const campaign: ExtraFeeCampaign = {
          id: this.ledger.generateId(),
          name,
          goal: +r['Meta'] || 0,
          contributions: [],
          withdrawals: [],
        };
        const note = r['Nota'] ? String(r['Nota']).trim() : '';
        if (note) campaign.note = note;
        campaignsByName.set(name, campaign);
      });
    }
    if (workbook.Sheets['Cuotas_Detalle']) {
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets['Cuotas_Detalle']);
      rows.forEach(r => {
        const name = r['Campaña'] ? String(r['Campaña']).trim() : '';
        const date = r['Fecha'] ? String(r['Fecha']).trim() : '';
        const amount = +r['Monto'];
        if (!name || !date || !amount) return;
        let campaign = campaignsByName.get(name);
        if (!campaign) {
          campaign = { id: this.ledger.generateId(), name, goal: 0, contributions: [], withdrawals: [] };
          campaignsByName.set(name, campaign);
        }
        const tipo = String(r['Tipo'] ?? '').trim();
        if (tipo === 'Aporte') {
          const unit = r['Apto'] ? String(r['Apto']).trim() : '';
          const contribution: FundContribution = { id: this.ledger.generateId(), date, amount };
          if (unit) contribution.unit = unit;
          campaign.contributions.push(contribution);
        } else if (tipo === 'Retiro') {
          const reason = r['Motivo'] ? String(r['Motivo']).trim() : '';
          const withdrawal: FundWithdrawal = { id: this.ledger.generateId(), date, amount };
          if (reason) withdrawal.reason = reason;
          campaign.withdrawals.push(withdrawal);
        }
      });
    }

    return { savingsFund, extraFeeCampaigns: [...campaignsByName.values()] };
  }
}
