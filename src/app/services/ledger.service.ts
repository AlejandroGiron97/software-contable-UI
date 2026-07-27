import { Injectable, signal, computed } from '@angular/core';
import { Periodo, ItemPeriodo, AlertaCod } from '../models/periodo.model';

@Injectable({ providedIn: 'root' })
export class LedgerService {
  readonly periodos = signal<Periodo[]>([]);

  readonly totalIngresos = computed(() =>
    this.periodos().reduce((s, p) => s + p.ingresos, 0)
  );
  readonly totalEgresos = computed(() =>
    this.periodos().reduce((s, p) => s + p.egresos, 0)
  );
  readonly totalAhorro = computed(() =>
    this.periodos().reduce((s, p) => s + p.ahorro, 0)
  );
  readonly cajaFinal = computed(() =>
    this.periodos().reduce((s, p) => s + p.caja, 0)
  );
  readonly endeudamientoGeneral = computed(() =>
    this.totalIngresos() > 0 ? (this.totalEgresos() / this.totalIngresos()) * 100 : 0
  );
  readonly alertaGeneral = computed<AlertaCod>(() =>
    this.calcularAlerta(this.totalEgresos(), this.totalIngresos(), this.cajaFinal())
  );

  calcularAlerta(egresos: number, ingresos: number, caja: number): AlertaCod {
    const ratio = ingresos > 0 ? egresos / ingresos : 1;
    if (caja < 0 || ratio > 0.9) return 3;
    if (ratio > 0.7 || (ingresos > 0 && caja < ingresos * 0.05)) return 2;
    return 1;
  }

  private recalc(items: ItemPeriodo[]): Omit<Periodo, 'anio' | 'mes' | 'items'> {
    const ingresos = items
      .filter(i => i.tipo === 'ingreso')
      .reduce((s, i) => s + i.monto, 0);
    const egresos = items
      .filter(i => i.tipo === 'egreso')
      .reduce((s, i) => s + i.monto, 0);
    const ahorro = items
      .filter(i => i.tipo === 'ahorro')
      .reduce((s, i) => s + i.monto, 0);
    const caja = ingresos - egresos - ahorro;
    const endeudamiento = ingresos > 0 ? (egresos / ingresos) * 100 : 0;
    const alerta = this.calcularAlerta(egresos, ingresos, caja);
    return { ingresos, egresos, ahorro, caja, alerta, endeudamiento };
  }

  agregarMes(anio: number, mes: string): boolean {
    if (this.getPeriodo(anio, mes)) return false;
    const items: ItemPeriodo[] = [];
    this.periodos.update(ps => [
      ...ps,
      { anio, mes, items, ...this.recalc(items) },
    ]);
    return true;
  }

  actualizarItems(anio: number, mes: string, items: ItemPeriodo[]): void {
    const totales = this.recalc(items);
    this.periodos.update(ps =>
      ps.map(p =>
        p.anio === anio && p.mes === mes
          ? { ...p, items: [...items], ...totales }
          : p
      )
    );
  }

  actualizarNota(anio: number, mes: string, nota: string): void {
    this.periodos.update(ps =>
      ps.map(p =>
        p.anio === anio && p.mes === mes ? { ...p, nota } : p
      )
    );
  }

  eliminarMes(anio: number, mes: string): void {
    this.periodos.update(ps =>
      ps.filter(p => !(p.anio === anio && p.mes === mes))
    );
  }

  getPeriodo(anio: number, mes: string): Periodo | undefined {
    return this.periodos().find(p => p.anio === anio && p.mes === mes);
  }

  cargarPeriodos(periodos: Periodo[]): void {
    this.periodos.set(periodos);
  }

  generarId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
