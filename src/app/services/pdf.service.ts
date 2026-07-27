import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Periodo } from '../models/periodo.model';

@Injectable({ providedIn: 'root' })
export class PdfService {

  async exportar(periodos: Periodo[]): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();

    this.paginaDashboard(doc, pw, periodos);
    doc.addPage();
    this.paginaResumen(doc, pw, periodos);

    periodos.forEach(p => {
      if (p.items.length > 0) {
        doc.addPage();
        this.paginaDetalleMes(doc, pw, p);
        if (p.nota?.trim()) {
          const finalY = (doc as any).lastAutoTable?.finalY ?? 30;
          this.notaMes(doc, pw, finalY + 6, p.nota.trim());
        }
      }
    });

    await this.guardarArchivo(doc.output('blob'), 'reporte-contable.pdf', 'application/pdf');
  }

  async exportarMes(periodo: Periodo): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    this.paginaDetalleMes(doc, pw, periodo);
    if (periodo.nota?.trim()) {
      const finalY = (doc as any).lastAutoTable?.finalY ?? 30;
      this.notaMes(doc, pw, finalY + 6, periodo.nota.trim());
    }
    await this.guardarArchivo(doc.output('blob'), `reporte-${periodo.mes}-${periodo.anio}.pdf`, 'application/pdf');
  }

  private async guardarArchivo(blob: Blob, nombre: string, mime: string): Promise<void> {
    if ('showSaveFilePicker' in window) {
      try {
        const ext = nombre.split('.').pop()!;
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: nombre,
          types: [{ description: 'Archivo', accept: { [mime]: [`.${ext}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        // fallback si el navegador falla por alguna razón
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
  }

  private paginaDashboard(doc: jsPDF, pw: number, periodos: Periodo[]): void {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pw, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SISTEMA CONTABLE', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Informe de Historial Financiero Continuo', 14, 25);
    const fecha = new Date().toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    doc.text(`Generado: ${fecha}  |  Periodos: ${periodos.length}`, 14, 33);

    const totI = periodos.reduce((s, p) => s + p.ingresos, 0);
    const totE = periodos.reduce((s, p) => s + p.egresos, 0);
    const totA = periodos.reduce((s, p) => s + p.ahorro, 0);
    const saldo = periodos.reduce((s, p) => s + p.caja, 0);

    const kpis = [
      { label: 'Ingresos Totales', val: this.fmt(totI), r: 22, g: 163, b: 74 },
      { label: 'Egresos Totales', val: this.fmt(totE), r: 220, g: 38, b: 38 },
      { label: 'Ahorro Total', val: this.fmt(totA), r: 37, g: 99, b: 235 },
      { label: 'Saldo Total', val: this.fmt(saldo), r: saldo >= 0 ? 22 : 220, g: saldo >= 0 ? 163 : 38, b: saldo >= 0 ? 74 : 38 },
    ];

    const cw = (pw - 28 - 9) / 4;
    let cx = 14;
    kpis.forEach(k => {
      doc.setFillColor(k.r, k.g, k.b);
      doc.rect(cx, 46, cw, 2, 'F');
      doc.setFillColor(249, 250, 251);
      doc.rect(cx, 48, cw, 22, 'F');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.label, cx + 3, 56);
      doc.setTextColor(k.r, k.g, k.b);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(k.val, cx + 3, 65);
      cx += cw + 3;
    });

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUCION DEL FLUJO ACUMULADO', 14, 82);

    const barW = pw - 82;
    const maxV = Math.max(totI, 1);
    [
      { label: 'Ingresos', val: totI, r: 22, g: 163, b: 74 },
      { label: 'Egresos', val: totE, r: 220, g: 38, b: 38 },
      { label: 'Ahorro', val: totA, r: 37, g: 99, b: 235 },
    ].reduce((by, b) => {
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(b.label, 14, by + 4);
      doc.setFillColor(229, 231, 235);
      doc.rect(50, by, barW, 5, 'F');
      const fw = (b.val / maxV) * barW;
      if (fw > 0) { doc.setFillColor(b.r, b.g, b.b); doc.rect(50, by, fw, 5, 'F'); }
      doc.setTextColor(b.r, b.g, b.b);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`${this.fmt(b.val)} (${((b.val / maxV) * 100).toFixed(1)}%)`, 50 + barW + 2, by + 4);
      return by + 11;
    }, 86);

    const verde = periodos.filter(p => p.alerta === 1).length;
    const amarillo = periodos.filter(p => p.alerta === 2).length;
    const rojo = periodos.filter(p => p.alerta === 3).length;
    const tot = periodos.length || 1;

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN POR SEMAFORO FINANCIERO', 14, 122);

    autoTable(doc, {
      startY: 126,
      head: [['Estado', 'Periodos', 'Porcentaje']],
      body: [
        ['SUPERAVIT (Verde)', String(verde), `${((verde / tot) * 100).toFixed(0)}%`],
        ['PREVENCION (Amarillo)', String(amarillo), `${((amarillo / tot) * 100).toFixed(0)}%`],
        ['CRITICO (Rojo)', String(rojo), `${((rojo / tot) * 100).toFixed(0)}%`],
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

  private paginaResumen(doc: jsPDF, pw: number, periodos: Periodo[]): void {
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pw, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN MENSUAL', 14, 13);

    const totI = periodos.reduce((s, p) => s + p.ingresos, 0);
    const totE = periodos.reduce((s, p) => s + p.egresos, 0);
    const totA = periodos.reduce((s, p) => s + p.ahorro, 0);
    const totC = periodos.reduce((s, p) => s + p.caja, 0);

    autoTable(doc, {
      startY: 25,
      head: [['Periodo', 'Ingresos (COP)', 'Egresos (COP)', 'Ahorro (COP)', 'Caja (COP)', 'Endeu.%', 'Estado']],
      body: [
        ...periodos.map(p => [
          `${p.mes} ${p.anio}`,
          this.fmt(p.ingresos), this.fmt(p.egresos), this.fmt(p.ahorro), this.fmt(p.caja),
          `${p.endeudamiento.toFixed(1)}%`,
          p.alerta === 1 ? 'SUPERAVIT' : p.alerta === 2 ? 'PREVENCION' : 'CRITICO',
        ]),
        ['TOTALES', this.fmt(totI), this.fmt(totE), this.fmt(totA), this.fmt(totC), '', ''],
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
        const isTotales = data.row.index === periodos.length;
        if (isTotales) {
          data.cell.styles.fillColor = [31, 41, 55];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
          return;
        }
        const p = periodos[data.row.index]; if (!p) return;
        if (p.alerta === 1) { data.cell.styles.fillColor = [240, 253, 244]; if (data.column.index === 6) data.cell.styles.textColor = [22, 163, 74]; }
        else if (p.alerta === 2) { data.cell.styles.fillColor = [255, 251, 235]; if (data.column.index === 6) data.cell.styles.textColor = [180, 83, 9]; }
        else { data.cell.styles.fillColor = [254, 242, 242]; if (data.column.index === 6) data.cell.styles.textColor = [185, 28, 28]; }
      },
    });
  }

  private paginaDetalleMes(doc: jsPDF, pw: number, p: Periodo): void {
    const color: [number, number, number] = p.alerta === 1 ? [22, 163, 74] : p.alerta === 2 ? [180, 83, 9] : [185, 28, 28];
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pw, 20, 'F');
    doc.setFillColor(...color);
    doc.rect(0, 20, pw, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`DETALLE: ${p.mes.toUpperCase()} ${p.anio}`, 14, 13);

    const itemCount = p.items.length;

    autoTable(doc, {
      startY: 30,
      head: [['Fecha', 'Concepto / Descripcion', 'Tipo', 'Monto (COP)', 'Estado', 'Apto']],
      body: [
        ...p.items.map(i => [
          this.fmtFecha(i.fecha),
          i.concepto,
          i.tipo === 'ingreso' ? 'Ingreso' : i.tipo === 'egreso' ? 'Egreso' : 'Ahorro',
          this.fmt(i.monto),
          i.estado === 'pagado' ? 'Pagado' : i.estado === 'pendiente' ? 'Pendiente' : '',
          i.apto ?? '',
        ]),
        ['', '', '', '', '', ''],
        ['', 'TOTAL INGRESOS', '', this.fmt(p.ingresos), '', ''],
        ['', 'TOTAL EGRESOS', '', this.fmt(p.egresos), '', ''],
        ['', 'TOTAL AHORRO', '', this.fmt(p.ahorro), '', ''],
        ['', 'CAJA RESTANTE', '', this.fmt(p.caja), '', ''],
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
            if (item.estado === 'pagado') data.cell.styles.textColor = [22, 163, 74];
            else if (item.estado === 'pendiente') data.cell.styles.textColor = [180, 83, 9];
            else data.cell.styles.textColor = [148, 163, 184];
          } else if (data.column.index === 5) {
            if (item.apto) data.cell.styles.textColor = [124, 58, 237];
            else data.cell.styles.textColor = [148, 163, 184];
          } else {
            if (item.tipo === 'ingreso') data.cell.styles.textColor = [22, 163, 74];
            else if (item.tipo === 'egreso') data.cell.styles.textColor = [185, 28, 28];
            else data.cell.styles.textColor = [37, 99, 235];
          }
        }
        if (rowIdx >= itemCount + 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [248, 250, 252];
        }
        if (rowIdx === itemCount + 4) {
          data.cell.styles.fillColor = p.alerta === 1 ? [240, 253, 244] : p.alerta === 2 ? [255, 251, 235] : [254, 242, 242];
          data.cell.styles.textColor = color;
        }
      },
    });
  }

  private notaMes(doc: jsPDF, pw: number, startY: number, nota: string): void {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const margen = 14;
    const ancho = pw - margen * 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(nota, ancho - 8);
    const alto = lineas.length * 4.5 + 10;
    doc.roundedRect(margen, startY, ancho, alto, 3, 3, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA DEL MES', margen + 4, startY + 5.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(lineas, margen + 4, startY + 10);
  }

  private fmtFecha(f?: string): string {
    if (!f) return '';
    const parts = f.split('-');
    if (parts.length !== 3) return f;
    return `${parts[2]}/${parts[1]}`;
  }

  private fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
  }
}
