/* ════════════════════════════════════════════
   lib/agenda.ts — Cálculo de slots de agenda e scans
   ════════════════════════════════════════════ */

import { AgendaRecorrente, Scan, fmtDate, convToJSDay } from '@/lib/store';

export interface AgendaSlot {
  agendaId:  string;
  clienteId: string;
  date:      Date;
  hora:      string;
  obs:       string;
}

export interface ScanSlot {
  scanId:    string;
  clienteId: string;
  date:      Date;
  hora:      string;
  obs:       string;
}

/**
 * Retorna a Nth ocorrência de um dia da semana num dado mês.
 * weekday: JS getDay() — 0=Dom..6=Sáb
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

export function getAgendaSlots(agendas: AgendaRecorrente[], from: Date, to: Date): AgendaSlot[] {
  const slots: AgendaSlot[] = [];
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end   = new Date(to);   end.setHours(23, 59, 59, 999);

  agendas.forEach(ag => {
    const jsDay = convToJSDay(ag.diaSemana);
    // Slots só existem a partir da data de criação da agenda
    const floor = ag.criadoEm ? new Date(ag.criadoEm) : start;
    floor.setHours(0, 0, 0, 0);
    const effectiveStart = floor > start ? floor : start;

    let y = effectiveStart.getFullYear(), m = effectiveStart.getMonth();
    const endY = end.getFullYear(), endM = end.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      const dt = nthWeekday(y, m, ag.ocorrencia, jsDay);
      if (dt && dt >= effectiveStart && dt <= end) {
        slots.push({ agendaId: ag.id, clienteId: ag.clienteId, date: new Date(dt), hora: ag.hora, obs: ag.obs });
      }
      m++; if (m > 11) { m = 0; y++; }
    }
  });
  return slots;
}

export function getScanSlots(scans: Scan[], from: Date, to: Date): ScanSlot[] {
  const slots: ScanSlot[] = [];
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end   = new Date(to);   end.setHours(23, 59, 59, 999);

  scans.forEach(sc => {
    const jsDay = convToJSDay(sc.diaSemana);
    // Slots só existem a partir da data de criação do scan
    const floor = sc.criadoEm ? new Date(sc.criadoEm) : start;
    floor.setHours(0, 0, 0, 0);
    const effectiveStart = floor > start ? floor : start;

    let y = effectiveStart.getFullYear(), m = effectiveStart.getMonth();
    const endY = end.getFullYear(), endM = end.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      const dt = nthWeekday(y, m, sc.ocorrencia, jsDay);
      if (dt && dt >= effectiveStart && dt <= end) {
        slots.push({ scanId: sc.id, clienteId: sc.clienteId, date: new Date(dt), hora: sc.hora, obs: sc.obs });
      }
      m++; if (m > 11) { m = 0; y++; }
    }
  });
  return slots;
}

export function ocorrenciaKey(agendaId: string, date: Date | string): string {
  return `${agendaId}_${fmtDate(date instanceof Date ? date : new Date(date))}`;
}

export function scanKey(scanId: string, date: Date | string): string {
  return `${scanId}_${fmtDate(date instanceof Date ? date : new Date(date))}`;
}
