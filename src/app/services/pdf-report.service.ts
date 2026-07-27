import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Period } from '../models/period.model';
import { FileSaverService } from '../core/services/file-saver.service';
import { formatCurrency } from '../core/utils/currency-formatter.util';

@Injectable({ providedIn: 'root' })
export class PdfReportService {
  private fileSaver = inject(FileSaverService);

  async export(periods: Period[]): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    this.buildDashboardPage(doc, pageWidth, periods);
    doc.addPage();
    this.buildSummaryPage(doc, pageWidth, periods);

    periods.forEach(p => {
      if (p.items.length > 0) {
        doc.addPage();
        this.buildMonthDetailPage(doc, pageWidth, p);
        if (p.note?.trim()) {
          const finalY = (doc as any).lastAutoTable?.finalY ?? 30;
          this.buildMonthNote(doc, pageWidth, finalY + 6, p.note.trim());
        }
      }
    });

    await this.fileSaver.save(doc.output('blob'), 'reporte-contable.pdf', 'application/pdf');
  }

  async exportMonth(period: Period): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    this.buildMonthDetailPage(doc, pageWidth, period);
    if (period.note?.trim()) {
      const finalY = (doc as any).lastAutoTable?.finalY ?? 30;
      this.buildMonthNote(doc, pageWidth, finalY + 6, period.note.trim());
    }
    await this.fileSaver.save(doc.output('blob'), `reporte-${period.month}-${period.year}.pdf`, 'application/pdf');
  }

  private buildDashboardPage(doc: jsPDF, pageWidth: number, periods: Period[]): void {
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
    const totalSavings = periods.reduce((s, p) => s + p.savings, 0);
    const balance = periods.reduce((s, p) => s + p.cash, 0);

    const kpis = [
      { label: 'Ingresos Totales', val: formatCurrency(totalIncome), r: 22, g: 163, b: 74 },
      { label: 'Egresos Totales', val: formatCurrency(totalExpenses), r: 220, g: 38, b: 38 },
      { label: 'Ahorro Total', val: formatCurrency(totalSavings), r: 37, g: 99, b: 235 },
      { label: 'Saldo Total', val: formatCurrency(balance), r: balance >= 0 ? 22 : 220, g: balance >= 0 ? 163 : 38, b: balance >= 0 ? 74 : 38 },
    ];

    const cardWidth = (pageWidth - 28 - 9) / 4;
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
    const maxValue = Math.max(totalIncome, 1);
    [
      { label: 'Ingresos', val: totalIncome, r: 22, g: 163, b: 74 },
      { label: 'Egresos', val: totalExpenses, r: 220, g: 38, b: 38 },
      { label: 'Ahorro', val: totalSavings, r: 37, g: 99, b: 235 },
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
    doc.text('RESUMEN POR SEMAFORO FINANCIERO', 14, 122);

    autoTable(doc, {
      startY: 126,
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

  private buildSummaryPage(doc: jsPDF, pageWidth: number, periods: Period[]): void {
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

  private buildMonthDetailPage(doc: jsPDF, pageWidth: number, p: Period): void {
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
        ['', 'TOTAL AHORRO', '', formatCurrency(p.savings), '', ''],
        ['', 'CAJA RESTANTE', '', formatCurrency(p.cash), '', ''],
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
        if (rowIdx === itemCount + 4) {
          data.cell.styles.fillColor = p.alert === 1 ? [240, 253, 244] : p.alert === 2 ? [255, 251, 235] : [254, 242, 242];
          data.cell.styles.textColor = color;
        }
      },
    });
  }

  private buildMonthNote(doc: jsPDF, pageWidth: number, startY: number, note: string): void {
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
    doc.text('NOTA DEL MES', margin + 4, startY + 5.5);
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
