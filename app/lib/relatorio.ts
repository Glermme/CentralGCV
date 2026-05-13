/* ════════════════════════════════════════════
   lib/relatorio.ts — Geração do relatório semanal
   ════════════════════════════════════════════ */

import { AppState, fmtBR, fmtDT } from '@/lib/store';
import { getAgendaSlots } from '@/lib/agenda';

// Retorna as próximas N semanas (seg → dom) a partir de hoje
export function proximasSemanas(n = 4): { de: Date; ate: Date; label: string; index: number }[] {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=dom..6=sab
  const diasAteSeg = diaSemana === 0 ? 1 : 8 - diaSemana;

  const semanas = [];
  for (let i = 0; i < n; i++) {
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() + diasAteSeg + i * 7);
    seg.setHours(0, 0, 0, 0);

    const dom = new Date(seg);
    dom.setDate(seg.getDate() + 6);
    dom.setHours(23, 59, 59, 999);

    const label = `Semana ${i + 1} · ${fmtBR(seg.toISOString().split('T')[0])} – ${fmtBR(dom.toISOString().split('T')[0])}`;
    semanas.push({ de: seg, ate: dom, label, index: i + 1 });
  }
  return semanas;
}

export interface ClienteRelatorio {
  id:        string;
  nome:      string;
  cor:       string;
  hora:      string;
  data:      string;
  diaNome:   string;
  tarefas:   TarefaRelatorio[];
}

export interface TarefaRelatorio {
  id:          string;
  desc:        string;
  status:      string;
  comentarios: ComentarioRelatorio[];
}

export interface ComentarioRelatorio {
  txt:       string;
  at:        string;
  autorNome: string;
}

export function buildRelatorioData(
  state: AppState,
  de: Date,
  ate: Date,
  filtroClienteId = ''
): {
  clientes:         ClienteRelatorio[];
  semana:           string;
  geradoEm:         string;
  totalTarefas:     number;
  totalComentarios: number;
} {
  const deStr  = de.toISOString().split('T')[0];
  const ateStr = ate.toISOString().split('T')[0];
  const label  = `${fmtBR(deStr)} a ${fmtBR(ateStr)}`;

  // Slots recorrentes
  const slots = getAgendaSlots(state.agendas, de, ate)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));

  // Extras
  const extras = state.agendasExtras.filter(e => e.data >= deStr && e.data <= ateStr);

  const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // ClienteIds com agenda na semana
  const clienteIds = new Set<string>();
  slots.forEach(s => clienteIds.add(s.clienteId));
  extras.forEach(e => clienteIds.add(e.clienteId));

  // Hora/data da primeira agenda por cliente
  const clienteAgenda: Record<string, { hora: string; data: string; diaNome: string }> = {};
  slots.forEach(s => {
    if (!clienteAgenda[s.clienteId]) {
      clienteAgenda[s.clienteId] = {
        hora:    s.hora,
        data:    fmtBR(s.date.toISOString().split('T')[0]),
        diaNome: diasNomes[s.date.getDay()],
      };
    }
  });
  extras.forEach(e => {
    if (!clienteAgenda[e.clienteId]) {
      const dt = new Date(e.data + 'T12:00:00');
      clienteAgenda[e.clienteId] = {
        hora:    e.hora,
        data:    fmtBR(e.data),
        diaNome: diasNomes[dt.getDay()],
      };
    }
  });

  let totalTarefas     = 0;
  let totalComentarios = 0;
  const clientes: ClienteRelatorio[] = [];

  clienteIds.forEach(cid => {
    // Filtro de cliente
    if (filtroClienteId && cid !== filtroClienteId) return;

    const c = state.clientes.find(x => x.id === cid);
    if (!c) return;

    const tarefasAbertas = state.tarefas.filter(t =>
      t.clienteId === cid &&
      t.status !== 'concluida' &&
      t.status !== 'cancelada'
    );

    if (!tarefasAbertas.length) return;

    const agenda = clienteAgenda[cid] || { hora: '', data: '', diaNome: '' };

    const tarefas: TarefaRelatorio[] = tarefasAbertas.map(t => {
      totalTarefas++;
      totalComentarios += t.comentarios.length;
      return {
        id:     t.id,
        desc:   t.desc,
        status: t.status,
        comentarios: t.comentarios.map(cm => ({
          txt:       cm.txt,
          at:        cm.at,
          autorNome: cm.autorNome || '?',
        })),
      };
    });

    clientes.push({ id: c.id, nome: c.nome, cor: c.cor, hora: agenda.hora, data: agenda.data, diaNome: agenda.diaNome, tarefas });
  });

  clientes.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const agora    = new Date();
  const geradoEm = `${fmtBR(agora.toISOString().split('T')[0])} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  return { clientes, semana: label, geradoEm, totalTarefas, totalComentarios };
}

const STATUS_LABEL: Record<string, string> = {
  pendente:  'Pendente',
  andamento: 'Em andamento',
};
const STATUS_CLASS: Record<string, string> = {
  pendente:  'st-pendente',
  andamento: 'st-andamento',
};

export function gerarHTMLRelatorio(state: AppState, de: Date, ate: Date, filtroClienteId = ''): string {
  const { clientes, semana, geradoEm, totalTarefas, totalComentarios } = buildRelatorioData(state, de, ate, filtroClienteId);
  const geradoData = fmtBR(new Date().toISOString().split('T')[0]);

  const blocosClientes = clientes.map(c => {
    const tarefasHTML = c.tarefas.map(t => {
      const comentariosHTML = t.comentarios.length
        ? `<div class="comentarios-wrap">${t.comentarios.map(cm => `
            <div class="comentario-item">
              <div class="ci-icon">${cm.autorNome.charAt(0).toUpperCase()}</div>
              <div class="ci-body">
                <div class="ci-meta">
                  <span class="ci-autor">${cm.autorNome}</span>
                  <span class="ci-data">${fmtDT(cm.at)}</span>
                </div>
                <div class="ci-txt">${cm.txt}</div>
              </div>
            </div>`).join('')}
          </div>`
        : `<div class="sem-cmnt">Sem comentários registrados</div>`;

      return `
        <div class="tarefa-item">
          <div class="ti-header">
            <div class="ti-dot" style="background:${c.cor}"></div>
            <div class="ti-desc">${t.desc}</div>
            <span class="ti-status ${STATUS_CLASS[t.status] || 'st-pendente'}">${STATUS_LABEL[t.status] || t.status}</span>
          </div>
          ${comentariosHTML}
        </div>`;
    }).join('');

    return `
      <div class="cliente-bloco">
        <div class="cb-header" style="border-left-color:${c.cor}">
          <div class="cb-inicial" style="background:${c.cor}">${c.nome.charAt(0).toUpperCase()}</div>
          <div class="cb-info">
            <div class="cb-nome">${c.nome}</div>
            <div class="cb-reuniao">📅 ${c.diaNome}, ${c.data}${c.hora ? ' · ' + c.hora : ''}</div>
          </div>
          <div class="cb-badge">${c.tarefas.length} tarefa${c.tarefas.length !== 1 ? 's' : ''}</div>
        </div>
        ${tarefasHTML}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
@font-face{font-family:'Isidora Sans';font-weight:400;src:url('https://db.onlinewebfonts.com/t/5a2997d9cd39bd9d0bc3295b1a73d927.woff2') format('woff2');}
@font-face{font-family:'Isidora Sans';font-weight:600 700;src:url('https://db.onlinewebfonts.com/t/d28024dd0f8248d26a677397a526960d.woff2') format('woff2');}
@font-face{font-family:'Isidora Sans';font-weight:800 900;src:url('https://db.onlinewebfonts.com/t/9ef8ad7b40b9180c8d702347e01437f1.woff2') format('woff2');}
*{box-sizing:border-box;margin:0;padding:0;}
:root{--dark:#231F20;--dark2:#2e2a2b;--cyan:#0DDBFF;--cyan2:#0ab8d8;--ivory:#FDFFF4;--muted:#6b6568;--border:#d8dbc8;}
body{font-family:'Isidora Sans',sans-serif;background:white;color:var(--dark);font-size:13px;line-height:1.5;}
.page-capa{width:210mm;min-height:297mm;background:var(--dark);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 50px;page-break-after:always;position:relative;overflow:hidden;}
.capa-line-top{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--cyan),var(--cyan2) 60%,transparent);}
.capa-bg-circle{position:absolute;width:500px;height:500px;border-radius:50%;border:1px solid rgba(13,219,255,.08);top:50%;left:50%;transform:translate(-50%,-50%);}
.capa-bg-circle2{position:absolute;width:700px;height:700px;border-radius:50%;border:1px solid rgba(13,219,255,.04);top:50%;left:50%;transform:translate(-50%,-50%);}
.capa-logo{display:flex;align-items:center;margin-bottom:60px;}
.capa-logo-box{background:var(--cyan);color:var(--dark);font-weight:900;font-size:22px;letter-spacing:-.5px;padding:9px 16px;border-radius:6px 0 0 6px;}
.capa-logo-label{background:var(--dark2);color:rgba(255,255,255,.5);font-weight:700;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:9px 14px;border-radius:0 6px 6px 0;border:1px solid rgba(255,255,255,.1);border-left:none;line-height:2;}
.capa-titulo-label{font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--cyan);margin-bottom:16px;text-align:center;}
.capa-titulo{font-size:36px;font-weight:900;color:white;text-align:center;line-height:1.15;margin-bottom:12px;letter-spacing:-.5px;}
.capa-periodo{font-size:16px;font-weight:700;color:var(--cyan);text-align:center;margin-bottom:60px;}
.capa-divider{width:60px;height:2px;background:var(--cyan);margin:0 auto 40px;opacity:.4;}
.capa-meta{display:flex;gap:40px;justify-content:center;}
.capa-meta-item{text-align:center;}
.capa-meta-num{font-size:32px;font-weight:900;color:white;line-height:1;margin-bottom:4px;}
.capa-meta-lbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35);}
.capa-footer{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-size:10px;color:rgba(255,255,255,.2);letter-spacing:1px;}
.page-conteudo{width:210mm;min-height:297mm;padding:35px 40px;page-break-after:always;background:var(--ivory);}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:14px;border-bottom:2px solid var(--dark);}
.ph-logo{display:flex;align-items:center;}
.ph-logo-box{background:var(--dark);color:var(--cyan);font-weight:900;font-size:13px;padding:5px 9px;border-radius:3px 0 0 3px;letter-spacing:-.3px;}
.ph-logo-label{background:rgba(35,31,32,.08);color:var(--muted);font-weight:700;font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:5px 8px;border-radius:0 3px 3px 0;border:1px solid var(--border);border-left:none;line-height:1.8;}
.ph-info{text-align:right;}
.ph-periodo{font-size:11px;font-weight:800;color:var(--dark);}
.ph-gerado{font-size:9px;color:var(--muted);margin-top:2px;}
.cliente-bloco{margin-bottom:28px;border:1px solid var(--border);border-radius:10px;overflow:hidden;break-inside:avoid;}
.cb-header{background:var(--dark);padding:12px 16px;display:flex;align-items:center;gap:12px;border-left:4px solid var(--cyan);}
.cb-inicial{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:var(--dark);flex-shrink:0;}
.cb-info{flex:1;}
.cb-nome{font-weight:900;font-size:16px;color:white;letter-spacing:-.3px;}
.cb-reuniao{font-size:10px;color:rgba(255,255,255,.5);margin-top:2px;font-weight:600;letter-spacing:.5px;}
.cb-badge{background:rgba(13,219,255,.15);color:var(--cyan);font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:3px 8px;border-radius:3px;border:1px solid rgba(13,219,255,.2);}
.tarefa-item{padding:12px 16px;border-bottom:1px solid var(--border);background:white;}
.tarefa-item:last-child{border-bottom:none;}
.ti-header{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;}
.ti-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.ti-desc{font-weight:700;font-size:13px;color:var(--dark);line-height:1.4;flex:1;}
.ti-status{font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:2px 7px;border-radius:3px;flex-shrink:0;}
.st-pendente{background:rgba(232,131,10,.12);color:#c06800;}
.st-andamento{background:rgba(13,219,255,.1);color:var(--cyan2);border:1px solid rgba(13,219,255,.2);}
.comentarios-wrap{margin-left:17px;padding-left:14px;border-left:2px solid var(--border);}
.comentario-item{padding:7px 0;border-bottom:1px dashed var(--border);display:flex;gap:10px;align-items:flex-start;}
.comentario-item:last-child{border-bottom:none;}
.ci-icon{width:22px;height:22px;border-radius:50%;background:var(--dark);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;flex-shrink:0;margin-top:1px;}
.ci-body{flex:1;}
.ci-meta{display:flex;gap:8px;align-items:center;margin-bottom:2px;flex-wrap:wrap;}
.ci-autor{font-weight:800;font-size:10px;color:var(--dark);}
.ci-data{font-size:9px;color:var(--muted);font-weight:500;}
.ci-txt{font-size:11px;color:var(--dark);line-height:1.5;}
.sem-cmnt{margin-left:17px;padding:5px 0 5px 14px;font-size:10px;color:var(--muted);font-style:italic;}
.page-footer{margin-top:auto;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--muted);}
@media print{body{background:white;}.page-capa,.page-conteudo{page-break-after:always;}.cliente-bloco{break-inside:avoid;}@page{margin:0;size:A4;}}
</style>
</head>
<body>

<div class="page-capa">
  <div class="capa-line-top"></div>
  <div class="capa-bg-circle"></div>
  <div class="capa-bg-circle2"></div>
  <div class="capa-logo">
    <div class="capa-logo-box">OSTEC</div>
    <div class="capa-logo-label">Central GCV</div>
  </div>
  <div class="capa-titulo-label">Relatório Semanal</div>
  <div class="capa-titulo">Resumo de<br>Encaminhamentos GCV</div>
  <div class="capa-periodo">Semana de ${semana}</div>
  <div class="capa-divider"></div>
  <div class="capa-meta">
    <div class="capa-meta-item"><div class="capa-meta-num">${clientes.length}</div><div class="capa-meta-lbl">Clientes</div></div>
    <div class="capa-meta-item"><div class="capa-meta-num">${totalTarefas}</div><div class="capa-meta-lbl">Tarefas</div></div>
    <div class="capa-meta-item"><div class="capa-meta-num">${totalComentarios}</div><div class="capa-meta-lbl">Comentários</div></div>
  </div>
  <div class="capa-footer">OSTEC SEGURANÇA DIGITAL · GERADO EM ${geradoData.toUpperCase()}</div>
</div>

<div class="page-conteudo">
  <div class="page-header">
    <div class="ph-logo">
      <div class="ph-logo-box">OSTEC</div>
      <div class="ph-logo-label">Central GCV</div>
    </div>
    <div class="ph-info">
      <div class="ph-periodo">Semana ${semana}</div>
      <div class="ph-gerado">Gerado em ${geradoEm}</div>
    </div>
  </div>
  ${clientes.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--muted);font-size:14px;">Nenhum cliente com agenda e tarefas abertas no período selecionado.</div>`
    : blocosClientes}
  <div class="page-footer">
    <span>OSTEC Segurança Digital — Confidencial</span>
    <span>Semana ${semana}</span>
  </div>
</div>

</body>
</html>`;
}
