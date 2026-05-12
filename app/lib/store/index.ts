/* ════════════════════════════════════════════
   lib/store/index.ts
   ════════════════════════════════════════════ */

export interface Anexo {
  id:   number;
  nome: string;
  url:  string;
  tipo: string;
}

export interface Comentario {
  txt:         string;
  at:          string;
  autorId:     string;
  autorNome:   string;
  autorAvatar: string;
  anexos:      Anexo[];
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

export interface AgendaExtra {
  id:        string;
  clienteId: string;
  ownerId:   string;
  data:      string;
  hora:      string;
  duracao:   string;
  descricao: string;
  status:    string;
  motivo:    string;
  criadoEm:  string;
}

export interface Scan {
  id:         string;
  clienteId:  string;
  ocorrencia: 1 | 2 | 3 | 4;
  diaSemana:  1 | 2 | 3 | 4 | 5 | 6 | 7; // 6=Sáb, 7=Dom
  hora:       string;
  obs:        string;
}

export interface ScanOcorrencia {
  status: 'ocorreu' | 'nao' | '';
  motivo: string;
}

export interface OcorrenciaStatus {
  status: 'ocorreu' | 'nao' | undefined;
  motivo: string;
}

export interface AppState {
  clientes:       Cliente[];
  tarefas:        Tarefa[];
  reunioes:       Reuniao[];
  agendas:        AgendaRecorrente[];
  agendasExtras:  AgendaExtra[];
  scans:          Scan[];
  scanOcorrencias: Record<string, ScanOcorrencia>; // key: scanId_data
  ocorrencias:    Record<string, OcorrenciaStatus>;
  colorIdx:       number;
}

export const COLORS = [
  '#0ab8d8','#231F20','#2aaa5a','#e8830a',
  '#7c3aed','#c0392b','#0f766e','#854d0e',
];

export const DIAS     = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const DIAS_SEM = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const OCORR    = ['', '1ª', '2ª', '3ª', '4ª'];

// JS getDay(): 0=Dom,1=Seg,...,6=Sáb
// Nossa convenção: 1=Seg..5=Sex,6=Sáb,7=Dom
export function convToJSDay(d: number): number {
  if (d === 7) return 0; // Dom
  return d;              // 1-6 já coincidem
}

const STORAGE_KEY = 'ostec_v4';

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
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
  const r = new Date(d); r.setDate(d.getDate() + diff); return r;
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

export function buildDemoState(): AppState {
  return {
    clientes: [], tarefas: [], reunioes: [],
    agendas: [], agendasExtras: [],
    scans: [], scanOcorrencias: {},
    ocorrencias: {}, colorIdx: 0,
  };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return buildDemoState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDemoState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.agendas)          parsed.agendas          = [];
    if (!parsed.agendasExtras)    parsed.agendasExtras    = [];
    if (!parsed.scans)            parsed.scans            = [];
    if (!parsed.scanOcorrencias)  parsed.scanOcorrencias  = {};
    if (!parsed.ocorrencias)      parsed.ocorrencias      = {};
    parsed.tarefas.forEach(t => {
      if (!t.comentarios) t.comentarios = [];
      t.comentarios.forEach(c => {
        if (!c.anexos)      c.anexos      = [];
        if (!c.autorId)     c.autorId     = '';
        if (!c.autorNome)   c.autorNome   = '';
        if (!c.autorAvatar) c.autorAvatar = '';
      });
    });
    return parsed;
  } catch { return buildDemoState(); }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
