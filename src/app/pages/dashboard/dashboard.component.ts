import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LedgerService } from '../../services/ledger.service';
import { ExcelService } from '../../services/excel.service';
import { PdfService } from '../../services/pdf.service';
import { TablaItemsComponent } from '../../components/tabla-items/tabla-items.component';
import { GraficasComponent } from '../../components/graficas/graficas.component';
import { Periodo } from '../../models/periodo.model';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, TablaItemsComponent, GraficasComponent],
  template: `
    <div class="layout">

      <!-- TOPBAR -->
      <header class="topbar">
        <div class="brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="brand-ico">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span>Sistema Contable</span>
        </div>

        <div class="topbar-kpis">
          <div class="kpi">
            <span class="kpi-lbl">Ingresos Totales</span>
            <span class="kpi-val k-green">{{ fmt(ledger.totalIngresos()) }}</span>
          </div>
          <div class="kdiv"></div>
          <div class="kpi">
            <span class="kpi-lbl">Egresos Totales</span>
            <span class="kpi-val k-red">{{ fmt(ledger.totalEgresos()) }}</span>
          </div>
          <div class="kdiv"></div>
          <div class="kpi">
            <span class="kpi-lbl">Ahorro Total</span>
            <span class="kpi-val k-blue">{{ fmt(ledger.totalAhorro()) }}</span>
          </div>
          <div class="kdiv"></div>
          <div class="kpi">
            <span class="kpi-lbl">Saldo Total</span>
            <span class="kpi-val" [class.k-green]="ledger.cajaFinal() >= 0" [class.k-red]="ledger.cajaFinal() < 0">
              {{ fmt(ledger.cajaFinal()) }}
            </span>
          </div>
          <div class="kdiv"></div>
          <div class="kpi">
            <span class="kpi-lbl">Meses</span>
            <span class="kpi-val">{{ ledger.periodos().length }}</span>
          </div>
          @if (ledger.periodos().length) {
            <div class="kdiv"></div>
            <div class="kpi">
              <span class="kpi-lbl">Estado General</span>
              <span class="tb-badge" [class]="'tb-badge tb-' + ledger.alertaGeneral()" [title]="'Endeudamiento general: ' + ledger.endeudamientoGeneral().toFixed(1) + '%'">
                {{ alertaLabel(ledger.alertaGeneral()) }}
              </span>
            </div>
          }
        </div>

        <div class="topbar-actions">
          <button class="tbtn tbtn-green" [disabled]="!ledger.periodos().length" (click)="descargarExcel()" title="Descargar Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Excel
          </button>
          <button class="tbtn tbtn-red" [disabled]="!ledger.periodos().length" (click)="descargarPdf()" title="Descargar PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            PDF
          </button>
          <label class="tbtn tbtn-blue" title="Importar Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Importar
            <input type="file" accept=".xlsx" hidden (change)="importar($event)" />
          </label>
          <button class="tbtn tbtn-ghost" (click)="irInicio()" title="Volver al inicio">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </button>
        </div>
      </header>

      @if (importError) {
        <div class="import-error">{{ importError }}</div>
      }

      <div class="body">

        <!-- SIDEBAR: Lista de meses -->
        <aside class="sidebar">

          <div class="add-mes-form">
            <h3>Agregar Mes</h3>
            <div class="add-row">
              <input type="number" [(ngModel)]="nuevoAnio" min="2000" max="2100" class="inp-anio" />
              <select [(ngModel)]="nuevoMes" class="inp-mes">
                @for (m of meses; track m) {
                  <option [value]="m">{{ m }}</option>
                }
              </select>
            </div>
            @if (mesYaExiste) {
              <p class="mes-warn">Ya existe</p>
            }
            <button class="btn-add-mes" (click)="agregarMes()" [disabled]="mesYaExiste">
              + Agregar mes
            </button>
          </div>

          <div class="meses-list">
            <div class="meses-lbl">Periodos registrados</div>
            @for (p of ledger.periodos(); track p.anio + p.mes) {
              <div
                class="mes-item"
                [class.selected]="selectedKey() === keyOf(p)"
                (click)="seleccionar(p)"
              >
                <span class="mes-dot" [class]="dotClass(p.alerta)"></span>
                <span class="mes-nombre">{{ p.mes }} {{ p.anio }}</span>
                <span class="mes-caja" [class.pos]="p.caja >= 0" [class.neg]="p.caja < 0">
                  {{ fmtCorto(p.caja) }}
                </span>
              </div>
            }
            @if (!ledger.periodos().length) {
              <p class="meses-empty">Sin meses aún.<br>Agrega el primero arriba.</p>
            }
          </div>

        </aside>

        <!-- MAIN CONTENT -->
        <main class="main-content">

          @if (!ledger.periodos().length) {
            <div class="empty-state">
              <div class="empty-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              </div>
              <h3>Agrega tu primer mes</h3>
              <p>Usa el panel izquierdo para crear un periodo.<br>
              Luego ingresa tus ingresos y gastos por concepto.</p>
            </div>

          } @else if (!periodoActual) {
            <div class="empty-state">
              <div class="empty-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                </svg>
              </div>
              <h3>Selecciona un mes</h3>
              <p>Haz clic en uno de los periodos del panel izquierdo.</p>
            </div>

          } @else {
            <!-- ENCABEZADO DEL MES -->
            <div class="mes-header" [class]="'mh-' + periodoActual.alerta">
              <div class="mh-left">
                <span class="mh-dot" [class]="dotClass(periodoActual.alerta)"></span>
                <h2>{{ periodoActual.mes }} {{ periodoActual.anio }}</h2>
                <span class="mh-badge" [class]="badgeClass(periodoActual.alerta)">
                  {{ alertaLabel(periodoActual.alerta) }}
                </span>
              </div>
              <div class="mh-right">
                <button class="mh-prev" (click)="irMesAnterior()" title="Mes anterior">&larr;</button>
                <button class="mh-next" (click)="irMesSiguiente()" title="Mes siguiente">&rarr;</button>
                <button class="mh-pdf" (click)="descargarPdfMes()" title="Descargar PDF de este mes">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </button>
                <button class="mh-del" (click)="eliminarMes()" title="Eliminar este mes">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- TABLA DE ÍTEMS (el núcleo de la app) -->
            <div class="tabla-card">
              <app-tabla-items
                [anio]="periodoActual.anio"
                [mes]="periodoActual.mes"
              />
            </div>

            <!-- PANEL DE TOTALES -->
            <div class="totales-panel" [class]="'tp-' + periodoActual.alerta">
              <div class="tot-grid">
                <div class="tot-item">
                  <span class="tot-lbl">Total Ingresos</span>
                  <span class="tot-val t-green">{{ fmt(periodoActual.ingresos) }}</span>
                </div>
                <div class="tot-item">
                  <span class="tot-lbl">Total Egresos</span>
                  <span class="tot-val t-red">{{ fmt(periodoActual.egresos) }}</span>
                </div>
                <div class="tot-item">
                  <span class="tot-lbl">Total Ahorro</span>
                  <span class="tot-val t-blue">{{ fmt(periodoActual.ahorro) }}</span>
                </div>
                <div class="tot-item">
                  <span class="tot-lbl">Caja Restante</span>
                  <span class="tot-val tot-caja"
                    [class.t-green]="periodoActual.caja >= 0"
                    [class.t-red]="periodoActual.caja < 0">
                    {{ fmt(periodoActual.caja) }}
                  </span>
                </div>
                <div class="tot-item">
                  <span class="tot-lbl">Endeudamiento</span>
                  <span class="tot-val" [class]="endClass(periodoActual.endeudamiento)">
                    {{ periodoActual.endeudamiento.toFixed(1) }}%
                  </span>
                </div>
                <div class="tot-item tot-semaforo">
                  <span class="tot-lbl">Estado financiero</span>
                  <span class="tot-badge" [class]="badgeClass(periodoActual.alerta)">
                    {{ alertaLabel(periodoActual.alerta) }}
                  </span>
                </div>
              </div>
              <div class="endeu-bar-wrap">
                <div class="endeu-bar-bg">
                  <div class="endeu-bar-fill"
                    [style.width.%]="Math.min(periodoActual.endeudamiento, 100)"
                    [class]="'fill-' + periodoActual.alerta">
                  </div>
                  <div class="endeu-mark" style="left:70%"></div>
                  <div class="endeu-mark" style="left:90%"></div>
                </div>
                <div class="endeu-labels">
                  <span>0%</span><span style="margin-left:auto">70%</span>
                  <span style="margin-left:20px">90%</span>
                  <span style="margin-left:auto">100%</span>
                </div>
              </div>
            </div>

            <!-- NOTA DEL MES -->
            <div class="nota-card">
              <div class="nota-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="nota-ico">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                <span>Nota del mes</span>
              </div>
              <textarea
                class="nota-txt"
                placeholder="Ej: Cuenta bancaria $1.200.000 · Efectivo $350.000 · Deuda pendiente con Juan..."
                [value]="periodoActual.nota ?? ''"
                (input)="onNota($event)"
                rows="3"
              ></textarea>
            </div>

            <!-- GRÁFICAS (cuando hay más de 1 mes) -->
            @if (ledger.periodos().length > 1) {
              <div class="charts-section">
                <app-graficas [periodos]="ledger.periodos()" />
              </div>
            }
          }

        </main>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .layout {
      display: flex; flex-direction: column; height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
    }

    /* ── TOPBAR ── */
    .topbar {
      display: flex; align-items: center; gap: 1rem;
      background: #1f2937; color: white;
      padding: .65rem 1.25rem; flex-shrink: 0;
    }
    .brand { display: flex; align-items: center; gap: .5rem; font-weight: 800; font-size: .9rem; white-space: nowrap; }
    .brand-ico { width: 20px; height: 20px; color: #60a5fa; }
    .topbar-kpis { display: flex; align-items: center; gap: .5rem; flex: 1; overflow-x: auto; }
    .kpi { display: flex; flex-direction: column; white-space: nowrap; }
    .kpi-lbl { font-size: .6rem; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: .04em; }
    .kpi-val { font-size: .82rem; font-weight: 700; }
    .k-green { color: #4ade80; }
    .k-red   { color: #f87171; }
    .k-blue  { color: #60a5fa; }
    .kdiv { width: 1px; height: 24px; background: rgba(255,255,255,.12); flex-shrink: 0; }
    .tb-badge {
      font-size: .72rem; font-weight: 700; padding: .18rem .6rem;
      border-radius: 20px; letter-spacing: .02em; white-space: nowrap; width: fit-content;
    }
    .tb-badge.tb-1 { background: rgba(34,197,94,.15); color: #4ade80; }
    .tb-badge.tb-2 { background: rgba(217,119,6,.2); color: #fbbf24; }
    .tb-badge.tb-3 { background: rgba(220,38,38,.2); color: #f87171; }
    .topbar-actions { display: flex; align-items: center; gap: .4rem; flex-shrink: 0; }
    .tbtn {
      display: flex; align-items: center; gap: .35rem;
      padding: .4rem .75rem; border: none; border-radius: 7px;
      font-size: .78rem; font-weight: 600; cursor: pointer;
      transition: opacity .15s; white-space: nowrap;
    }
    .tbtn svg { width: 15px; height: 15px; }
    .tbtn:disabled { opacity: .4; cursor: not-allowed; }
    .tbtn-green { background: #16a34a; color: white; }
    .tbtn-green:hover:not(:disabled) { background: #15803d; }
    .tbtn-red { background: #dc2626; color: white; }
    .tbtn-red:hover:not(:disabled) { background: #b91c1c; }
    .tbtn-blue { background: #2563eb; color: white; }
    .tbtn-blue:hover { background: #1d4ed8; }
    .tbtn-ghost { background: rgba(255,255,255,.1); color: white; padding: .4rem; }
    .tbtn-ghost:hover { background: rgba(255,255,255,.2); }

    .import-error {
      background: #fef2f2; color: #dc2626; font-size: .82rem;
      padding: .5rem 1.25rem; border-bottom: 1px solid #fecaca;
    }

    /* ── BODY LAYOUT ── */
    .body { display: flex; flex: 1; overflow: hidden; }

    /* ── SIDEBAR ── */
    .sidebar {
      width: 230px; flex-shrink: 0;
      background: white; border-right: 1px solid #e2e8f0;
      display: flex; flex-direction: column; overflow-y: auto;
    }
    .add-mes-form {
      padding: 1rem; border-bottom: 1px solid #f1f5f9;
    }
    .add-mes-form h3 {
      font-size: .78rem; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .05em; margin: 0 0 .6rem;
    }
    .add-row { display: flex; gap: .4rem; margin-bottom: .5rem; }
    .inp-anio {
      width: 68px; padding: .4rem .45rem; border: 1.5px solid #e2e8f0;
      border-radius: 7px; font-size: .8rem; outline: none;
    }
    .inp-anio:focus { border-color: #2563eb; }
    .inp-mes {
      flex: 1; padding: .4rem .45rem; border: 1.5px solid #e2e8f0;
      border-radius: 7px; font-size: .8rem; outline: none;
    }
    .inp-mes:focus { border-color: #2563eb; }
    .mes-warn { font-size: .75rem; color: #d97706; margin: -.2rem 0 .35rem; }
    .btn-add-mes {
      width: 100%; padding: .45rem; border: none; border-radius: 7px;
      background: #2563eb; color: white; font-size: .82rem; font-weight: 700;
      cursor: pointer; transition: background .15s;
    }
    .btn-add-mes:hover:not(:disabled) { background: #1d4ed8; }
    .btn-add-mes:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

    .meses-list { flex: 1; padding: .75rem 0; }
    .meses-lbl {
      font-size: .68rem; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .05em;
      padding: 0 1rem .5rem;
    }
    .mes-item {
      display: flex; align-items: center; gap: .5rem;
      padding: .55rem 1rem; cursor: pointer; transition: background .1s;
    }
    .mes-item:hover { background: #f8fafc; }
    .mes-item.selected { background: #eff6ff; }
    .mes-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .mes-dot.d-1 { background: #16a34a; }
    .mes-dot.d-2 { background: #d97706; }
    .mes-dot.d-3 { background: #dc2626; box-shadow: 0 0 5px rgba(220,38,38,.4); }
    .mes-nombre { flex: 1; font-size: .85rem; font-weight: 600; color: #1e293b; }
    .mes-caja { font-size: .75rem; font-weight: 700; white-space: nowrap; }
    .mes-caja.pos { color: #16a34a; }
    .mes-caja.neg { color: #dc2626; }
    .meses-empty { font-size: .8rem; color: #94a3b8; padding: 1rem; text-align: center; line-height: 1.5; }

    /* ── MAIN CONTENT ── */
    .main-content { flex: 1; overflow-y: auto; padding: 1.25rem; }

    .empty-state {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center; color: #94a3b8;
    }
    .empty-ico {
      width: 72px; height: 72px; background: #f1f5f9; border-radius: 18px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;
    }
    .empty-ico svg { width: 40px; height: 40px; color: #cbd5e1; }
    .empty-state h3 { font-size: 1.05rem; font-weight: 700; color: #475569; margin: 0 0 .4rem; }
    .empty-state p { font-size: .85rem; line-height: 1.6; margin: 0; }

    /* ── MES HEADER ── */
    .mes-header {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: .875rem 1.125rem; margin-bottom: 1rem;
    }
    .mh-left { display: flex; align-items: center; gap: .75rem; }
    .mh-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
    .mh-dot.d-1 { background: #16a34a; }
    .mh-dot.d-2 { background: #d97706; }
    .mh-dot.d-3 { background: #dc2626; animation: blink 1.2s ease-in-out infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
    .mes-header h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
    .mh-badge {
      font-size: .72rem; font-weight: 700; padding: .22rem .7rem;
      border-radius: 20px; letter-spacing: .03em;
    }
    .mh-1 { background: #dcfce7; color: #15803d; }
    .mh-2 { background: #fef3c7; color: #b45309; }
    .mh-3 { background: #fee2e2; color: #b91c1c; }
    .mh-right { display: flex; align-items: center; gap: .4rem; }
    .mh-prev, .mh-next {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 7px;
      padding: .35rem .6rem; cursor: pointer; font-size: .9rem; color: #475569;
      transition: background .15s;
    }
    .mh-prev:hover, .mh-next:hover { background: #f1f5f9; }
    .mh-pdf {
      background: none; border: 1px solid #e2e8f0; border-radius: 7px;
      padding: .3rem; cursor: pointer; color: #94a3b8; display: flex;
      transition: all .15s;
    }
    .mh-pdf:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
    .mh-pdf svg { width: 16px; height: 16px; }
    .mh-del {
      background: none; border: 1px solid #e2e8f0; border-radius: 7px;
      padding: .3rem; cursor: pointer; color: #94a3b8; display: flex;
      transition: all .15s;
    }
    .mh-del:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
    .mh-del svg { width: 16px; height: 16px; }

    /* ── TABLA CARD ── */
    .tabla-card {
      background: white; border: 1px solid #e2e8f0;
      border-radius: 12px; overflow: hidden;
      margin-bottom: 1rem;
    }

    /* ── TOTALES PANEL ── */
    .totales-panel {
      background: white; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .tp-1 { border-left: 4px solid #16a34a; }
    .tp-2 { border-left: 4px solid #d97706; }
    .tp-3 { border-left: 4px solid #dc2626; }
    .tot-grid {
      display: grid; grid-template-columns: repeat(6, 1fr);
      gap: .75rem; margin-bottom: .875rem;
    }
    @media (max-width: 1100px) { .tot-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 700px) { .tot-grid { grid-template-columns: repeat(2, 1fr); } }
    .tot-item { display: flex; flex-direction: column; gap: .2rem; }
    .tot-lbl { font-size: .68rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; }
    .tot-val { font-size: 1rem; font-weight: 800; color: #0f172a; }
    .tot-caja { font-size: 1.1rem; }
    .t-green { color: #15803d; }
    .t-red   { color: #dc2626; }
    .t-blue  { color: #2563eb; }
    .t-warn  { color: #d97706; }
    .tot-badge {
      display: inline-block; font-size: .78rem; font-weight: 700;
      padding: .25rem .75rem; border-radius: 20px; margin-top: .2rem;
    }
    .endeu-bar-wrap { margin-top: .5rem; }
    .endeu-bar-bg {
      height: 8px; background: #f1f5f9; border-radius: 4px;
      position: relative; overflow: hidden;
    }
    .endeu-bar-fill {
      height: 100%; border-radius: 4px; transition: width .4s ease;
    }
    .fill-1 { background: #16a34a; }
    .fill-2 { background: #d97706; }
    .fill-3 { background: #dc2626; }
    .endeu-mark {
      position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,.7);
    }
    .endeu-labels {
      display: flex; font-size: .65rem; color: #94a3b8; margin-top: .25rem;
    }

    .nota-card {
      background: white; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: .875rem 1.125rem;
      margin-bottom: 1.25rem;
    }
    .nota-header {
      display: flex; align-items: center; gap: .45rem;
      font-size: .72rem; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: .05em;
      margin-bottom: .6rem;
    }
    .nota-ico { width: 14px; height: 14px; }
    .nota-txt {
      width: 100%; resize: vertical;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      padding: .6rem .75rem; font-size: .875rem;
      font-family: inherit; color: #0f172a; line-height: 1.6;
      outline: none; transition: border-color .15s;
    }
    .nota-txt:focus { border-color: #2563eb; }
    .nota-txt::placeholder { color: #cbd5e1; }

    .charts-section { margin-top: 1.25rem; }
  `],
})
export class DashboardComponent {
  readonly ledger = inject(LedgerService);
  private excel = inject(ExcelService);
  private pdf = inject(PdfService);
  private router = inject(Router);

  readonly meses = MESES;
  readonly Math = Math;

  selectedKey = signal<string>('');
  nuevoAnio = new Date().getFullYear();
  nuevoMes = 'Enero';
  importError = '';

  get periodoActual(): Periodo | null {
    const key = this.selectedKey();
    if (!key) return null;
    const [anioStr, mes] = key.split('|');
    return this.ledger.getPeriodo(+anioStr, mes) ?? null;
  }

  get mesYaExiste(): boolean {
    return !!this.ledger.getPeriodo(+this.nuevoAnio, this.nuevoMes);
  }

  keyOf(p: Periodo): string { return `${p.anio}|${p.mes}`; }

  seleccionar(p: Periodo): void { this.selectedKey.set(this.keyOf(p)); }

  agregarMes(): void {
    const ok = this.ledger.agregarMes(+this.nuevoAnio, this.nuevoMes);
    if (ok) {
      const p = this.ledger.getPeriodo(+this.nuevoAnio, this.nuevoMes)!;
      this.selectedKey.set(this.keyOf(p));
      // Advance suggestion to next month
      const idx = MESES.indexOf(this.nuevoMes);
      if (idx === 11) { this.nuevoMes = 'Enero'; this.nuevoAnio += 1; }
      else { this.nuevoMes = MESES[idx + 1]; }
    }
  }

  eliminarMes(): void {
    if (!this.periodoActual) return;
    const { anio, mes } = this.periodoActual;
    const ps = this.ledger.periodos();
    const idx = ps.findIndex(p => p.anio === anio && p.mes === mes);
    this.ledger.eliminarMes(anio, mes);
    const remaining = this.ledger.periodos();
    if (remaining.length > 0) {
      const next = remaining[Math.max(0, idx - 1)];
      this.selectedKey.set(this.keyOf(next));
    } else {
      this.selectedKey.set('');
    }
  }

  irMesAnterior(): void {
    const ps = this.ledger.periodos();
    const idx = ps.findIndex(p => this.keyOf(p) === this.selectedKey());
    if (idx > 0) this.selectedKey.set(this.keyOf(ps[idx - 1]));
  }

  irMesSiguiente(): void {
    const ps = this.ledger.periodos();
    const idx = ps.findIndex(p => this.keyOf(p) === this.selectedKey());
    if (idx < ps.length - 1) this.selectedKey.set(this.keyOf(ps[idx + 1]));
  }

  descargarExcel(): void { this.excel.exportar(this.ledger.periodos()); }
  descargarPdf(): void { this.pdf.exportar(this.ledger.periodos()); }
  descargarPdfMes(): void { if (this.periodoActual) this.pdf.exportarMes(this.periodoActual); }

  onNota(event: Event): void {
    if (!this.periodoActual) return;
    const nota = (event.target as HTMLTextAreaElement).value;
    this.ledger.actualizarNota(this.periodoActual.anio, this.periodoActual.mes, nota);
  }


  async importar(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importError = '';
    try {
      await this.excel.importar(file);
      const ps = this.ledger.periodos();
      if (ps.length) this.selectedKey.set(this.keyOf(ps[0]));
    } catch (e: any) {
      this.importError = typeof e === 'string' ? e : 'Error al importar.';
    }
  }

  irInicio(): void { this.router.navigate(['/']); }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
  }

  fmtCorto(n: number): string {
    const abs = Math.abs(n);
    const s = n < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${s}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${s}$${(abs / 1_000).toFixed(0)}k`;
    return `${s}$${abs}`;
  }

  dotClass(a: number): string { return `mes-dot d-${a}`; }
  badgeClass(a: number): string { return `mh-badge mh-${a}`; }
  alertaLabel(a: number): string {
    return a === 1 ? 'SUPERÁVIT' : a === 2 ? 'PREVENCIÓN' : 'CRÍTICO';
  }
  endClass(e: number): string {
    return e > 90 ? 't-red' : e > 70 ? 't-warn' : 't-green';
  }
}
