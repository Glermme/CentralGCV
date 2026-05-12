/* ════════════════════════════════════════════
   lib/export.ts — Exportação XLS
   ════════════════════════════════════════════ */

import * as XLSX from 'xlsx';
import { AppState, Cliente, fmtBR, fmtDT, isLate, fmtDate } from '@/lib/store';
import { getAgendaSlots } from '@/lib/agenda';

// ── HELPERS ────────────────────────────────

function getCliente(state: AppState, id: string): Cliente | undefined {
  return state.clientes.find(c => c.id === id);
}

function autoWidth(ws: XLSX.WorkSheet, data: any[][]): void {
  const cols: { wch: number }[] = [];
  data.forEach(row => {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      cols[i] = { wch: Math.min(Math.max(cols[i]?.wch ?? 10, len + 2), 80) };
    });
  });
  ws['!cols'] = cols;
}

function styleHeader(ws: XLSX.WorkSheet, cols: number): void {
  // XLSX básico não suporta estilos sem lib premium — deixamos limpo
}

// ── EXPORT TAREFAS ─────────────────────────

export interface FiltroTarefas {
  clienteId: string;
  status:    string;
  de:        string;
  ate:       string;
}

export function exportTarefasXLS(state: AppState, filtro: FiltroTarefas) {
  let tarefas = [...state.tarefas];

  if (filtro.clienteId) tarefas = tarefas.filter(t => t.clienteId === filtro.clienteId);
  if (filtro.status)    tarefas = tarefas.filter(t => t.status === filtro.status);
  if (filtro.de)        tarefas = tarefas.filter(t => t.criadaEm >= filtro.de);
  if (filtro.ate)       tarefas = tarefas.filter(t => t.criadaEm <= filtro.ate + 'T23:59:59');

  if (!tarefas.length) return false;

  const statusLabel: Record<string, string> = {
    pendente: 'Pendente', andamento: 'Em andamento',
    concluida: 'Concluída', cancelada: 'Cancelada',
  };

  const rows: any[][] = [[
    'Cliente', 'Empresa', 'Tarefa', 'Status', 'Prazo', 'Atrasada',
    'Criada em', 'Comentário', 'Data/Hora Comentário', 'Autor Comentário',
  ]];

  tarefas.forEach(t => {
    const c = getCliente(state, t.clienteId);
    const atrasada = isLate(t.prazo) && t.status !== 'concluida' ? 'Sim' : 'Não';

    if (!t.comentarios?.length) {
      rows.push([
        c?.nome ?? '—', c?.empresa ?? '—',
        t.desc,
        statusLabel[t.status] ?? t.status,
        t.prazo ? fmtBR(t.prazo) : '—',
        atrasada,
        fmtDT(t.criadaEm),
        '', '', '',
      ]);
    } else {
      t.comentarios.forEach((cm, i) => {
        rows.push([
          i === 0 ? (c?.nome ?? '—') : '',
          i === 0 ? (c?.empresa ?? '—') : '',
          i === 0 ? t.desc : '',
          i === 0 ? (statusLabel[t.status] ?? t.status) : '',
          i === 0 ? (t.prazo ? fmtBR(t.prazo) : '—') : '',
          i === 0 ? atrasada : '',
          i === 0 ? fmtDT(t.criadaEm) : '',
          cm.txt,
          fmtDT(cm.at),
          (cm as any).autorNome ?? '—',
        ]);
      });
    }

    rows.push([]); // linha em branco entre tarefas
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  autoWidth(ws, rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Tarefas');

  const fname = `OSTEC_Tarefas${filtro.de ? '_' + filtro.de : ''}${filtro.ate ? '_a_' + filtro.ate : ''}.xlsx`;
  XLSX.writeFile(wb, fname);
  return true;
}

// ── EXPORT AGENDA ──────────────────────────

export interface FiltroAgenda {
  clienteId:    string;
  de:           string;
  ate:          string;
  recorrentes:  boolean;
  extras:       boolean;
  naoOcorridas: boolean;
}

export function exportAgendaXLS(state: AppState, filtro: FiltroAgenda) {
  const from = filtro.de  ? new Date(filtro.de  + 'T00:00:00') : new Date(2020, 0, 1);
  const to   = filtro.ate ? new Date(filtro.ate + 'T23:59:59') : new Date(2030, 11, 31);

  const dias = ['Dom', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const wb   = XLSX.utils.book_new();

  // ── Aba 1: Agendas Recorrentes ──
  if (filtro.recorrentes) {
    let slots = getAgendaSlots(state.agendas, from, to);
    if (filtro.clienteId) slots = slots.filter(s => s.clienteId === filtro.clienteId);
    if (filtro.naoOcorridas) slots = slots.filter(s => {
      const key = `${s.agendaId}_${fmtDate(s.date)}`;
      return state.ocorrencias[key]?.status === 'nao';
    });
    slots.sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));

    const rows: any[][] = [[
      'Data', 'Dia da Semana', 'Horário', 'Cliente', 'Empresa',
      'Status', 'Motivo (não ocorreu)', 'Observação',
    ]];

    slots.forEach(s => {
      const c   = getCliente(state, s.clienteId);
      const key = `${s.agendaId}_${fmtDate(s.date)}`;
      const oc  = state.ocorrencias[key] || {};
      const statusTxt = oc.status === 'ocorreu' ? 'Ocorreu' : oc.status === 'nao' ? 'Não ocorreu' : 'Não informado';
      rows.push([
        fmtBR(fmtDate(s.date)),
        dias[s.date.getDay()],
        s.hora,
        c?.nome ?? '—',
        c?.empresa ?? '—',
        statusTxt,
        oc.motivo ?? '',
        s.obs ?? '',
      ]);
    });

    if (rows.length > 1) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      autoWidth(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Recorrentes');
    }
  }

  // ── Aba 2: Agendas Extras ──
  if (filtro.extras) {
    let extras = state.agendasExtras.filter(e => e.data >= (filtro.de || '2000-01-01') && e.data <= (filtro.ate || '2099-12-31'));
    if (filtro.clienteId)    extras = extras.filter(e => e.clienteId === filtro.clienteId);
    if (filtro.naoOcorridas) extras = extras.filter(e => e.status === 'nao');
    extras.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

    const rows: any[][] = [[
      'Data', 'Dia da Semana', 'Horário', 'Duração', 'Cliente', 'Empresa',
      'Descrição', 'Status', 'Motivo (não ocorreu)',
    ]];

    extras.forEach(e => {
      const c = getCliente(state, e.clienteId);
      const d = new Date(e.data + 'T12:00:00');
      const statusTxt = e.status === 'ocorreu' ? 'Ocorreu' : e.status === 'nao' ? 'Não ocorreu' : 'Não informado';
      rows.push([
        fmtBR(e.data),
        dias[d.getDay()],
        e.hora,
        e.duracao,
        c?.nome ?? '—',
        c?.empresa ?? '—',
        e.descricao,
        statusTxt,
        e.motivo ?? '',
      ]);
    });

    if (rows.length > 1) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      autoWidth(ws, rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Extras');
    }
  }

  // Verifica se tem pelo menos uma aba
  if (!wb.SheetNames.length) return false;

  const fname = `OSTEC_Agenda${filtro.de ? '_' + filtro.de : ''}${filtro.ate ? '_a_' + filtro.ate : ''}.xlsx`;
  XLSX.writeFile(wb, fname);
  return true;
}
