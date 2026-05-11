/* ════════════════════════════════════════════
   lib/agenda.ts — Cálculo de slots de agenda
   ════════════════════════════════════════════ */

import { AgendaRecorrente, fmtDate } from '@/lib/store';

export interface AgendaSlot {
  agendaId:  string;
  clienteId: string;
  date:      Date;
  hora:      string;
  obs:       string;
}

/**
 * Retorna a Nth ocorrência de um dia da semana num dado mês.
 * weekday: 1=Seg..5=Sex (coincide com JS getDay() para Seg–Sex)
 */
export function nthWeekday(year: number, month: number, nth: number, weekday: number): Date | null {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    if (dt.getDay() === weekday) {
      count++;
      if (count === nth) return dt;
    }
  }
  return null;
}

/**
 * Retorna todos os slots de agenda entre duas datas.
 */
export function getAgendaSlots(
  agendas: AgendaRecorrente[],
  from: Date,
  to: Date
): AgendaSlot[] {
  const slots: AgendaSlot[] = [];
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end   = new Date(to);   end.setHours(23, 59, 59, 999);

  agendas.forEach(ag => {
    let y = start.getFullYear(), m = start.getMonth();
    const endY = end.getFullYear(), endM = end.getMonth();

    while (y < endY || (y === endY && m <= endM)) {
      const dt = nthWeekday(y, m, ag.ocorrencia, ag.diaSemana);
      if (dt && dt >= start && dt <= end) {
        slots.push({
          agendaId:  ag.id,
          clienteId: ag.clienteId,
          date:      new Date(dt),
          hora:      ag.hora,
          obs:       ag.obs,
        });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  });

  return slots;
}

export function ocorrenciaKey(agendaId: string, date: Date | string): string {
  return `${agendaId}_${fmtDate(date instanceof Date ? date : new Date(date))}`;
}
