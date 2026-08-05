import { Injectable, inject } from '@angular/core';
import type jsPDF from 'jspdf';
import type autoTableFn from 'jspdf-autotable';
import { Period } from '../models/period.model';
import { FundBase } from '../models/fund.model';
import { FileSaverService } from '../core/services/file-saver.service';
import { formatCurrency } from '../core/utils/currency-formatter.util';
import { computeFundTotals } from '../core/utils/fund-totals.util';
import { computeItemsMethodBalance } from '../core/utils/payment-method-balance.util';
import { LedgerService } from './ledger.service';
import { FundsService } from './funds.service';

type AutoTable = typeof autoTableFn;

@Injectable({ providedIn: 'root' })
export class PdfReportService {
  private fileSaver = inject(FileSaverService);
  private ledger = inject(LedgerService);
  private funds = inject(FundsService);

  private async createDoc(): Promise<{ doc: jsPDF; autoTable: AutoTable }> {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    return { doc: new JsPDF('p', 'mm', 'a4'), autoTable };
  }

  async export(): Promise<void> {
    const periods = this.ledger.periods();
    const savingsFund = this.funds.savingsFund();
    const campaigns = this.funds.extraFeeCampaigns();
    const savingsAvailable = computeFundTotals(savingsFund).available;
    const extraFeeAvailable = campaigns.reduce((sum, c) => sum + computeFundTotals(c).available, 0);
    const { doc, autoTable } = await this.createDoc();
    const pageWidth = doc.internal.pageSize.getWidth();

    this.buildDashboardPage(doc, autoTable, pageWidth, periods, savingsAvailable, extraFeeAvailable);
    doc.addPage();
    this.buildSummaryPage(doc, autoTable, pageWidth, periods);

    periods.forEach(p => {
      if (p.items.length > 0) {
        doc.addPage();
        this.buildMonthDetailPage(doc, autoTable, pageWidth, p);
        this.appendMonthFooters(doc, pageWidth, p);
      }
    });

    if (savingsFund.contributions.length || savingsFund.withdrawals.length || savingsFund.note?.trim()) {
      doc.addPage();
      this.buildFundPage(doc, autoTable, pageWidth, 'Ahorro', [37, 99, 235], savingsFund);
    }

    campaigns.forEach(c => {
      doc.addPage();
      this.buildFundPage(doc, autoTable, pageWidth, c.name, [180, 83, 9], c, c.goal);
    });

    await this.fileSaver.save(doc.output('blob'), 'reporte-contable.pdf', 'application/pdf');
  }

  async exportMonth(period: Period): Promise<void> {
    const { doc, autoTable } = await this.createDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    this.buildMonthDetailPage(doc, autoTable, pageWidth, period);
    this.appendMonthFooters(doc, pageWidth, period);
    await this.fileSaver.save(doc.output('blob'), `reporte-${period.month}-${period.year}.pdf`, 'application/pdf');
  }

  private appendMonthFooters(doc: jsPDF, pageWidth: number, p: Period): void {
    let y = ((doc as any).lastAutoTable?.finalY ?? 30) + 6;
    y = this.buildDeficitWarning(doc, pageWidth, y, p);
    if (p.note?.trim()) {
      this.buildNoteBox(doc, pageWidth, y, 'NOTA DEL MES', p.note.trim());
    }
  }

  private buildDeficitWarning(doc: jsPDF, pageWidth: number, startY: number, p: Period): number {
    if (p.cash >= 0) return startY;

    const margin = 14;
    const width = pageWidth - margin * 2;
    const deficit = p.expenses - p.income;
    const message = deficit > 0
      ? `Este mes los egresos superaron los ingresos por ${formatCurrency(deficit)}.`
      : `Este mes la caja quedo en negativo: ${formatCurrency(p.cash)}.`;

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(message, width - 8);
    const height = lines.length * 4.5 + 10;
    doc.roundedRect(margin, startY, width, height, 3, 3, 'FD');
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ALERTA DE CAJA', margin + 4, startY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(lines, margin + 4, startY + 10);

    return startY + height + 6;
  }

  private buildDashboardPage(
    doc: jsPDF,
    autoTable: AutoTable,
    pageWidth: number,
    periods: Period[],
    savingsAvailable: number,
    extraFeeAvailable: number
  ): void {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA CONTABLE', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Informe de Historial Financiero Continuo', 14, 25);
    const date = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    doc.text(`Generado: ${date}  |  Periodos: ${periods.length}`, 14, 33);

    const totalIncome = periods.reduce((s, p) => s + p.income, 0);
    const totalExpenses = periods.reduce((s, p) => s + p.expenses, 0);
    const totalSavings = savingsAvailable;
    const totalExtraFee = extraFeeAvailable;
    const balance = periods.reduce((s, p) => s + p.cash, 0);

    const kpis = [
      { label: 'Ingresos Totales', val: formatCurrency(totalIncome), r: 22, g: 163, b: 74 },
      { label: 'Egresos Totales', val: formatCurrency(totalExpenses), r: 220, g: 38, b: 38 },
      { label: 'Ahorro Total', val: formatCurrency(totalSavings), r: 37, g: 99, b: 235 },
      { label: 'Cuota Extra', val: formatCurrency(totalExtraFee), r: 180, g: 83, b: 9 },
      { label: 'Saldo Total', val: formatCurrency(balance), r: balance >= 0 ? 22 : 220, g: balance >= 0 ? 163 : 38, b: balance >= 0 ? 74 : 38 },
    ];

    const cardWidth = (pageWidth - 28 - 12) / 5;
    let cardX = 14;
    kpis.forEach(k => {
      doc.setFillColor(k.r, k.g, k.b);
      doc.rect(cardX, 46, cardWidth, 2, 'F');
      doc.setFillColor(249, 250, 251);
      doc.rect(cardX, 48, cardWidth, 22, 'F');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, cardX + 3, 56);
      doc.setTextColor(k.r, k.g, k.b);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(k.val, cardX + 3, 65);
      cardX += cardWidth + 3;
    });

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUCION DEL FLUJO ACUMULADO', 14, 82);

    const barWidth = pageWidth - 82;
    const maxValue = Math.max(totalIncome, totalExpenses, totalSavings, totalExtraFee, 1);
    const barsEndY = [
      { label: 'Ingresos', val: totalIncome, r: 22, g: 163, b: 74 },
      { label: 'Egresos', val: totalExpenses, r: 220, g: 38, b: 38 },
      { label: 'Ahorro', val: totalSavings, r: 37, g: 99, b: 235 },
      { label: 'Cuota Extra', val: totalExtraFee, r: 180, g: 83, b: 9 },
    ].reduce((barY, b) => {
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(b.label, 14, barY + 4);
      doc.setFillColor(229, 231, 235);
      doc.rect(50, barY, barWidth, 5, 'F');
      const fillWidth = (b.val / maxValue) * barWidth;
      if (fillWidth > 0) { doc.setFillColor(b.r, b.g, b.b); doc.rect(50, barY, fillWidth, 5, 'F'); }
      doc.setTextColor(b.r, b.g, b.b);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatCurrency(b.val)} (${((b.val / maxValue) * 100).toFixed(1)}%)`, 50 + barWidth + 2, barY + 4);
      return barY + 11;
    }, 86);

    const green = periods.filter(p => p.alert === 1).length;
    const yellow = periods.filter(p => p.alert === 2).length;
    const red = periods.filter(p => p.alert === 3).length;
    const total = periods.length || 1;

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN POR SEMAFORO FINANCIERO', 14, barsEndY + 3);

    autoTable(doc, {
      startY: barsEndY + 7,
      head: [['Estado', 'Periodos', 'Porcentaje']],
      body: [
        ['SUPERAVIT (Verde)', String(green), `${((green / total) * 100).toFixed(0)}%`],
        ['PREVENCION (Amarillo)', String(yellow), `${((yellow / total) * 100).toFixed(0)}%`],
        ['CRITICO (Rojo)', String(red), `${((red / total) * 100).toFixed(0)}%`],
      ],
      headStyles: { fillColor: [31, 41, 55] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'center' as const }, 2: { halign: 'center' as const } },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const c = [[22, 163, 74], [180, 83, 9], [185, 28, 28]];
        if (data.row.index <= 2) { data.cell.styles.textColor = c[data.row.index]; data.cell.styles.fontStyle = 'bold'; }
      },
    });
  }

  private buildSummaryPage(doc: jsPDF, autoTable: AutoTable, pageWidth: number, periods: Period[]): void {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN MENSUAL', 14, 13);

    const totalIncome = periods.reduce((s, p) => s + p.income, 0);
    const totalExpenses = periods.reduce((s, p) => s + p.expenses, 0);
    const totalSavings = periods.reduce((s, p) => s + p.savings, 0);
    const totalCash = periods.reduce((s, p) => s + p.cash, 0);

    autoTable(doc, {
      startY: 25,
      head: [['Periodo', 'Ingresos (COP)', 'Egresos (COP)', 'Ahorro (COP)', 'Caja (COP)', 'Endeu.%', 'Estado']],
      body: [
        ...periods.map(p => [
          `${p.month} ${p.year}`,
          formatCurrency(p.income), formatCurrency(p.expenses), formatCurrency(p.savings), formatCurrency(p.cash),
          `${p.debtRatio.toFixed(1)}%`,
          p.alert === 1 ? 'SUPERAVIT' : p.alert === 2 ? 'PREVENCION' : 'CRITICO',
        ]),
        ['TOTALES', formatCurrency(totalIncome), formatCurrency(totalExpenses), formatCurrency(totalSavings), formatCurrency(totalCash), '', ''],
      ],
      headStyles: { fillColor: [31, 41, 55] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 28 }, 1: { halign: 'right' as const }, 2: { halign: 'right' as const },
        3: { halign: 'right' as const }, 4: { halign: 'right' as const },
        5: { halign: 'right' as const, cellWidth: 18 }, 6: { halign: 'center' as const, cellWidth: 26 },
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const isTotalsRow = data.row.index === periods.length;
        if (isTotalsRow) {
          data.cell.styles.fillColor = [31, 41, 55];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          return;
        }
        const p = periods[data.row.index]; if (!p) return;
        if (p.alert === 1) { data.cell.styles.fillColor = [240, 253, 244]; if (data.column.index === 6) data.cell.styles.textColor = [22, 163, 74]; }
        else if (p.alert === 2) { data.cell.styles.fillColor = [255, 251, 235]; if (data.column.index === 6) data.cell.styles.textColor = [180, 83, 9]; }
        else { data.cell.styles.fillColor = [254, 242, 242]; if (data.column.index === 6) data.cell.styles.textColor = [185, 28, 28]; }
      },
    });
  }

  private buildMonthDetailPage(doc: jsPDF, autoTable: AutoTable, pageWidth: number, p: Period): void {
    const color: [number, number, number] = p.alert === 1 ? [22, 163, 74] : p.alert === 2 ? [180, 83, 9] : [185, 28, 28];
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(...color);
    doc.rect(0, 20, pageWidth, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`DETALLE: ${p.month.toUpperCase()} ${p.year}`, 14, 13);

    const itemCount = p.items.length;
    const bankBalance = computeItemsMethodBalance(p.items, 'bank');
    const cashBalance = computeItemsMethodBalance(p.items, 'cash');

    autoTable(doc, {
      startY: 30,
      head: [['Fecha', 'Concepto / Descripcion', 'Tipo', 'Monto (COP)', 'Estado', 'Apto']],
      body: [
        ...p.items.map(i => [
          this.formatDate(i.date),
          i.concept,
          i.type === 'ingreso' ? 'Ingreso' : i.type === 'egreso' ? 'Egreso' : 'Ahorro',
          formatCurrency(i.amount),
          i.status === 'pagado' ? 'Pagado' : i.status === 'pendiente' ? 'Pendiente' : '',
          i.unit ?? '',
        ]),
        ['', '', '', '', '', ''],
        ['', 'TOTAL INGRESOS', '', formatCurrency(p.income), '', ''],
        ['', 'TOTAL EGRESOS', '', formatCurrency(p.expenses), '', ''],
        ['', 'EN CUENTA', '', formatCurrency(bankBalance), '', ''],
        ['', 'EN EFECTIVO', '', formatCurrency(cashBalance), '', ''],
      ],
      headStyles: { fillColor: [31, 41, 55] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 17, halign: 'center' as const },
        1: { cellWidth: 62 },
        2: { cellWidth: 22, halign: 'center' as const },
        3: { halign: 'right' as const, cellWidth: 30 },
        4: { cellWidth: 22, halign: 'center' as const },
        5: { cellWidth: 29, halign: 'center' as const },
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const rowIdx = data.row.index;
        if (rowIdx <= itemCount - 1) {
          const item = p.items[rowIdx];
          if (!item) return;
          if (data.column.index === 4) {
            if (item.status === 'pagado') data.cell.styles.textColor = [22, 163, 74];
            else if (item.status === 'pendiente') data.cell.styles.textColor = [180, 83, 9];
            else data.cell.styles.textColor = [148, 163, 184];
          } else if (data.column.index === 5) {
            if (item.unit) data.cell.styles.textColor = [124, 58, 237];
            else data.cell.styles.textColor = [148, 163, 184];
          } else {
            if (item.type === 'ingreso') data.cell.styles.textColor = [22, 163, 74];
            else if (item.type === 'egreso') data.cell.styles.textColor = [185, 28, 28];
            else data.cell.styles.textColor = [37, 99, 235];
          }
        }
        if (rowIdx >= itemCount + 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [248, 250, 252];
        }
      },
    });
  }

  private buildFundPage(
    doc: jsPDF,
    autoTable: AutoTable,
    pageWidth: number,
    title: string,
    color: [number, number, number],
    fund: FundBase,
    goal?: number
  ): void {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(...color);
    doc.rect(0, 20, pageWidth, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 14, 13);

    const totals = computeFundTotals(fund);
    let bodyY = 30;

    if (goal !== undefined && goal > 0) {
      const pct = Math.min(100, (totals.collected / goal) * 100);
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Meta: ${formatCurrency(goal)}  ·  ${pct.toFixed(0)}% recaudado`, 14, bodyY);
      doc.setFillColor(229, 231, 235);
      doc.rect(14, bodyY + 3, pageWidth - 28, 4, 'F');
      if (pct > 0) { doc.setFillColor(...color); doc.rect(14, bodyY + 3, ((pageWidth - 28) * pct) / 100, 4, 'F'); }
      bodyY += 14;
    }

    const kpis = [
      { label: 'Aportado', val: formatCurrency(totals.collected), r: 22, g: 163, b: 74 },
      { label: 'Retirado', val: formatCurrency(totals.withdrawn), r: 220, g: 38, b: 38 },
      { label: 'Saldo', val: formatCurrency(totals.available), r: totals.available >= 0 ? 22 : 220, g: totals.available >= 0 ? 163 : 38, b: totals.available >= 0 ? 74 : 38 },
    ];
    const cardWidth = (pageWidth - 28 - 6) / 3;
    let cardX = 14;
    kpis.forEach(k => {
      doc.setFillColor(k.r, k.g, k.b);
      doc.rect(cardX, bodyY, cardWidth, 2, 'F');
      doc.setFillColor(249, 250, 251);
      doc.rect(cardX, bodyY + 2, cardWidth, 20, 'F');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, cardX + 3, bodyY + 9);
      doc.setTextColor(k.r, k.g, k.b);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(k.val, cardX + 3, bodyY + 18);
      cardX += cardWidth + 3;
    });

    const movements = [
      ...fund.contributions.map(c => ({ date: c.date, tipo: 'Aporte', amount: c.amount, unit: c.unit ?? '', reason: '' })),
      ...fund.withdrawals.map(w => ({ date: w.date, tipo: 'Retiro', amount: w.amount, unit: '', reason: w.reason ?? '' })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    autoTable(doc, {
      startY: bodyY + 30,
      head: [['Fecha', 'Tipo', 'Monto (COP)', 'Apto', 'Motivo']],
      body: movements.length
        ? movements.map(m => [this.formatDate(m.date), m.tipo, formatCurrency(m.amount), m.unit, m.reason])
        : [['', 'Sin movimientos registrados', '', '', '']],
      headStyles: { fillColor: [31, 41, 55] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: { 2: { halign: 'right' as const } },
      didParseCell: (data: any) => {
        if (data.section !== 'body' || !movements.length) return;
        const m = movements[data.row.index]; if (!m) return;
        if (data.column.index === 1) {
          data.cell.styles.textColor = m.tipo === 'Aporte' ? [22, 163, 74] : [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    if (fund.note?.trim()) {
      const finalY = (doc as any).lastAutoTable?.finalY ?? bodyY + 30;
      this.buildNoteBox(doc, pageWidth, finalY + 6, 'NOTA', fund.note.trim());
    }
  }

  private buildNoteBox(doc: jsPDF, pageWidth: number, startY: number, title: string, note: string): void {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const margin = 14;
    const width = pageWidth - margin * 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(note, width - 8);
    const height = lines.length * 4.5 + 10;
    doc.roundedRect(margin, startY, width, height, 3, 3, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, startY + 5.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(lines, margin + 4, startY + 10);
  }

  private formatDate(date?: string): string {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}`;
  }
}
