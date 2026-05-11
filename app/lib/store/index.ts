/* ════════════════════════════════════════════
   lib/store/index.ts
   Estado global, tipos e persistência
   ════════════════════════════════════════════ */

// ── TIPOS ──────────────────────────────────

export interface Comentario {
  txt: string;
  at:  string;
}

export interface Cliente {
  id:      string;
  nome:    string;
  empresa: string;
  cor:     string;
}

export interface Tarefa {
  id:          string;
  clienteId:   string;
  desc:        string;
  prazo:       string;
  status:      'pendente' | 'andamento' | 'concluida' | 'cancelada';
  reuniaoId:   string | null;
  criadaEm:    string;
  comentarios: Comentario[];
}

export interface Reuniao {
  id:   string;
  data: string;
  obs:  string;
}

export interface AgendaRecorrente {
  id:         string;
  clienteId:  string;
  ocorrencia: 1 | 2 | 3 | 4;
  diaSemana:  1 | 2 | 3 | 4 | 5;
  hora:       string;
  obs:        string;
}

export interface OcorrenciaStatus {
  status: 'ocorreu' | 'nao' | undefined;
  motivo: string;
}

export interface AppState {
  clientes:    Cliente[];
  tarefas:     Tarefa[];
  reunioes:    Reuniao[];
  agendas:     AgendaRecorrente[];
  ocorrencias: Record<string, OcorrenciaStatus>;
  colorIdx:    number;
}

// ── CONSTANTES ─────────────────────────────

export const COLORS = [
  '#0ab8d8','#231F20','#2aaa5a','#e8830a',
  '#7c3aed','#c0392b','#0f766e','#854d0e',
];

export const DIAS  = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
export const OCORR = ['', '1ª', '2ª', '3ª', '4ª'];

const STORAGE_KEY = 'ostec_v4';

// ── UTILITÁRIOS ────────────────────────────

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtDate(d: Date | string): string {
  return d instanceof Date ? d.toISOString().split('T')[0] : d;
}

export function fmtBR(s: string): string {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDT(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  return (
    d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function isLate(prazo: string): boolean {
  return !!prazo && new Date(prazo + 'T23:59:59') < new Date();
}

export function labelStatus(s: Tarefa['status']): string {
  return { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }[s] ?? s;
}

export function proxTerca(): Date {
  const d = new Date(), day = d.getDay();
  const diff = day <= 2 ? 2 - day : 9 - day;
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  return r;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── DEMO DATA ──────────────────────────────

export function buildDemoState(): AppState {
  const clientes: Cliente[] = [
    { id: uid(), nome: 'Cliente A', empresa: 'Empresa 1', cor: COLORS[0] },
    { id: uid(), nome: 'Cliente B', empresa: 'Empresa 2', cor: COLORS[2] },
    { id: uid(), nome: 'Cliente C', empresa: '',          cor: COLORS[3] },
    { id: uid(), nome: 'Cliente D', empresa: 'Empresa 4', cor: COLORS[6] },
  ];

  const rid = uid();
  const reunioes: Reuniao[] = [{ id: rid, data: fmtDate(proxTerca()), obs: '' }];

  const tarefas: Tarefa[] = [
    {
      id: uid(), clienteId: clientes[0].id,
      desc: 'Avaliar atualização do Tomcat nos ativos externos (18.75.83.4 portas 5443 e 443)',
      prazo: '', status: 'pendente', reuniaoId: rid,
      criadaEm: new Date().toISOString(), comentarios: [],
    },
    {
      id: uid(), clienteId: clientes[1].id,
      desc: 'Atualizar Kibana para versão mais recente — CVE-2025-25009 e outros',
      prazo: '', status: 'andamento', reuniaoId: rid,
      criadaEm: new Date().toISOString(), comentarios: [],
    },
  ];

  const agendas: AgendaRecorrente[] = [
    { id: uid(), clienteId: clientes[0].id, ocorrencia: 2, diaSemana: 2, hora: '14:00', obs: '' },
    { id: uid(), clienteId: clientes[1].id, ocorrencia: 2, diaSemana: 2, hora: '14:30', obs: '' },
    { id: uid(), clienteId: clientes[2].id, ocorrencia: 2, diaSemana: 2, hora: '15:00', obs: '' },
    { id: uid(), clienteId: clientes[2].id, ocorrencia: 4, diaSemana: 2, hora: '15:00', obs: '' },
    { id: uid(), clienteId: clientes[3].id, ocorrencia: 3, diaSemana: 2, hora: '14:00', obs: '' },
  ];

  return { clientes, tarefas, reunioes, agendas, ocorrencias: {}, colorIdx: 0 };
}

// ── PERSISTÊNCIA ───────────────────────────

export function loadState(): AppState {
  if (typeof window === 'undefined') return buildDemoState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDemoState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.agendas)     parsed.agendas     = [];
    if (!parsed.ocorrencias) parsed.ocorrencias = {};
    parsed.tarefas.forEach(t => { if (!t.comentarios) t.comentarios = []; });
    return parsed;
  } catch {
    return buildDemoState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
