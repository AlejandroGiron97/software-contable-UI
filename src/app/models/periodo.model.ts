export type AlertaCod = 1 | 2 | 3;
export type TipoItem = 'ingreso' | 'egreso' | 'ahorro';
export type EstadoItem = 'pagado' | 'pendiente';

export interface ItemPeriodo {
  id: string;
  concepto: string;
  tipo: TipoItem;
  monto: number;
  fecha?: string;       // 'YYYY-MM-DD'
  estado?: EstadoItem;
  apto?: string;
}

export interface Periodo {
  anio: number;
  mes: string;
  items: ItemPeriodo[];
  ingresos: number;
  egresos: number;
  ahorro: number;
  caja: number;
  alerta: AlertaCod;
  endeudamiento: number;
  nota?: string;
}
