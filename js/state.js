/* ════════════════════════════════════════════
   state.js — Dados, localStorage e utilitários
   ════════════════════════════════════════════ */

// ── CONSTANTES ──
const COLORS = ['#0ab8d8','#231F20','#2aaa5a','#e8830a','#7c3aed','#c0392b','#0f766e','#854d0e'];
const DIAS   = ['','Segunda','Terça','Quarta','Quinta','Sexta'];
const OCORR  = ['','1ª','2ª','3ª','4ª'];

// ── ESTADO GLOBAL ──
let S = JSON.parse(localStorage.getItem('ostec_v4') || 'null') || {
  clientes: [],
  tarefas: [],
  reunioes: [],
  agendas: [],
  ocorrencias: {},
  colorIdx: 0
};

// Garante campos que podem faltar em dados antigos
if (!S.agendas)     S.agendas     = [];
if (!S.ocorrencias) S.ocorrencias = {};
S.tarefas.forEach(t => { if (!t.comentarios) t.comentarios = []; });

// ── PERSISTÊNCIA ──
function save() {
  localStorage.setItem('ostec_v4', JSON.stringify(S));
}

// ── UTILITÁRIOS ──
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtDate(d) {
  return d instanceof Date ? d.toISOString().split('T')[0] : d;
}

function fmtBR(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDT(s) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isLate(prazo) {
  return prazo && new Date(prazo + 'T23:59:59') < new Date();
}

function getC(id) {
  return S.clientes.find(c => c.id === id);
}

function labelS(s) {
  return { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }[s] || s;
}

function proxTerca() {
  const d = new Date(), day = d.getDay();
  const diff = day <= 2 ? 2 - day : 9 - day;
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  return r;
}

// ── COR ALEATÓRIA ──
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── DEMO DATA (só roda se não há clientes) ──
if (!S.clientes.length) {
  S.clientes = [
    { id: uid(), nome: 'Cliente A', empresa: 'Empresa 1', cor: COLORS[0] },
    { id: uid(), nome: 'Cliente B', empresa: 'Empresa 2', cor: COLORS[2] },
    { id: uid(), nome: 'Cliente C', empresa: '',          cor: COLORS[3] },
    { id: uid(), nome: 'Cliente D', empresa: 'Empresa 4', cor: COLORS[6] },
  ];

  const rid = uid();
  S.reunioes.push({ id: rid, data: fmtDate(proxTerca()), obs: '' });

  S.tarefas.push(
    {
      id: uid(), clienteId: S.clientes[0].id,
      desc: 'Avaliar atualização do Tomcat nos ativos externos (18.75.83.4 portas 5443 e 443)',
      prazo: '', status: 'pendente', reuniaoId: rid,
      criadaEm: new Date().toISOString(), comentarios: []
    },
    {
      id: uid(), clienteId: S.clientes[1].id,
      desc: 'Atualizar Kibana para versão mais recente — CVE-2025-25009 e outros',
      prazo: '', status: 'andamento', reuniaoId: rid,
      criadaEm: new Date().toISOString(), comentarios: []
    }
  );

  S.agendas.push(
    { id: uid(), clienteId: S.clientes[0].id, ocorrencia: 2, diaSemana: 2, hora: '14:00', obs: '' },
    { id: uid(), clienteId: S.clientes[1].id, ocorrencia: 2, diaSemana: 2, hora: '14:30', obs: '' },
    { id: uid(), clienteId: S.clientes[2].id, ocorrencia: 2, diaSemana: 2, hora: '15:00', obs: '' },
    { id: uid(), clienteId: S.clientes[2].id, ocorrencia: 4, diaSemana: 2, hora: '15:00', obs: '' },
    { id: uid(), clienteId: S.clientes[3].id, ocorrencia: 3, diaSemana: 2, hora: '14:00', obs: '' },
  );

  save();
}
