import { Component, Input } from '@angular/core';
import { Periodo } from '../../models/periodo.model';

@Component({
  selector: 'app-historial-tabla',
  standalone: true,
  template: `
    <div class="tabla-wrapper">
      <div class="tabla-header">
        <h3>Historial Cronológico</h3>
        <span class="badge">{{ periodos.length }} periodo{{ periodos.length !== 1 ? 's' : '' }}</span>
      </div>
      <div class="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Periodo</th>
              <th class="num">Ingresos (COP)</th>
              <th class="num">Egresos (COP)</th>
              <th class="num">Ahorro (COP)</th>
              <th class="num">Caja (COP)</th>
              <th class="num">Endeu. %</th>
              <th class="center">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (p of periodos; track p.anio + p.mes) {
              <tr [class]="rowClass(p.alerta)">
                <td class="periodo-cell">
                  <span class="semaforo-dot" [class]="dotClass(p.alerta)"></span>
                  {{ p.mes }} {{ p.anio }}
                </td>
                <td class="num green-text">{{ fmt(p.ingresos) }}</td>
                <td class="num red-text">{{ fmt(p.egresos) }}</td>
                <td class="num blue-text">{{ fmt(p.ahorro) }}</td>
                <td class="num" [class.caja-pos]="p.caja >= 0" [class.caja-neg]="p.caja < 0">
                  {{ fmt(p.caja) }}
                </td>
                <td class="num" [class]="endClass(p.endeudamiento)">
                  {{ p.endeudamiento.toFixed(1) }}%
                </td>
                <td class="center">
                  <span class="alerta-badge" [class]="badgeClass(p.alerta)">
                    {{ alertaLabel(p.alerta) }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .tabla-wrapper {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      margin-top: 1.25rem;
    }
    .tabla-header {
      display: flex; align-items: center; gap: .75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .tabla-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .badge {
      background: #f1f5f9; color: #64748b;
      font-size: .75rem; font-weight: 600;
      padding: .2rem .6rem; border-radius: 20px;
    }
    .tabla-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    thead th {
      padding: .75rem 1rem; text-align: left;
      background: #f8fafc; color: #64748b;
      font-weight: 600; font-size: .78rem;
      text-transform: uppercase; letter-spacing: .04em;
      border-bottom: 1px solid #e2e8f0;
    }
    th.num, td.num { text-align: right; }
    th.center, td.center { text-align: center; }

    tbody tr { transition: background .1s; }
    tbody tr.row-verde { background: #f0fdf4; }
    tbody tr.row-amarillo { background: #fffbeb; }
    tbody tr.row-rojo { background: #fef2f2; }
    tbody tr:hover { filter: brightness(.97); }

    td { padding: .7rem 1rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; }

    .periodo-cell { display: flex; align-items: center; gap: .6rem; white-space: nowrap; font-weight: 600; }
    .semaforo-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .dot-verde { background: #16a34a; }
    .dot-amarillo { background: #d97706; }
    .dot-rojo { background: #dc2626; box-shadow: 0 0 6px rgba(220,38,38,.5); }

    .green-text { color: #15803d; font-weight: 600; }
    .red-text { color: #dc2626; font-weight: 600; }
    .blue-text { color: #2563eb; font-weight: 600; }
    .caja-pos { color: #15803d; font-weight: 700; }
    .caja-neg { color: #dc2626; font-weight: 700; }

    .end-safe { color: #15803d; }
    .end-warn { color: #d97706; font-weight: 600; }
    .end-crit { color: #dc2626; font-weight: 700; }

    .alerta-badge {
      display: inline-block;
      padding: .2rem .7rem; border-radius: 20px;
      font-size: .73rem; font-weight: 700; letter-spacing: .03em;
      white-space: nowrap;
    }
    .badge-verde { background: #dcfce7; color: #15803d; }
    .badge-amarillo { background: #fef3c7; color: #b45309; }
    .badge-rojo { background: #fee2e2; color: #b91c1c; }
  `],
})
export class HistorialTablaComponent {
  @Input() periodos: Periodo[] = [];

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  rowClass(a: number): string {
    return a === 1 ? 'row-verde' : a === 2 ? 'row-amarillo' : 'row-rojo';
  }

  dotClass(a: number): string {
    return a === 1 ? 'dot-verde' : a === 2 ? 'dot-amarillo' : 'dot-rojo';
  }

  badgeClass(a: number): string {
    return a === 1 ? 'badge-verde' : a === 2 ? 'badge-amarillo' : 'badge-rojo';
  }

  alertaLabel(a: number): string {
    return a === 1 ? 'SUPERÁVIT' : a === 2 ? 'PREVENCIÓN' : 'CRÍTICO';
  }

  endClass(e: number): string {
    return e > 90 ? 'end-crit' : e > 70 ? 'end-warn' : 'end-safe';
  }
}
