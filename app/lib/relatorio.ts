/* ════════════════════════════════════════════
   lib/relatorio.ts — Geração do relatório semanal
   ════════════════════════════════════════════ */

import { AppState, fmtBR, fmtDT } from '@/lib/store';
import { getAgendaSlots } from '@/lib/agenda';

export function proximasSemanas(n = 4): { de: Date; ate: Date; label: string; index: number }[] {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  const diasAteSeg = diaSemana === 0 ? 1 : 8 - diaSemana;

  return Array.from({ length: n }, (_, i) => {
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() + diasAteSeg + i * 7);
    seg.setHours(0, 0, 0, 0);
    const dom = new Date(seg);
    dom.setDate(seg.getDate() + 6);
    dom.setHours(23, 59, 59, 999);
    const label = `Semana ${i + 1} · ${fmtBR(seg.toISOString().split('T')[0])} – ${fmtBR(dom.toISOString().split('T')[0])}`;
    return { de: seg, ate: dom, label, index: i + 1 };
  });
}

export interface ClienteRelatorio {
  id: string; nome: string; cor: string;
  hora: string; data: string; diaNome: string;
  tarefas: TarefaRelatorio[];
}
export interface TarefaRelatorio {
  id: string; desc: string; status: string;
  comentarios: ComentarioRelatorio[];
}
export interface ComentarioRelatorio {
  txt: string; at: string; autorNome: string;
}

export function buildRelatorioData(
  state: AppState, de: Date, ate: Date, filtroClienteId = ''
): { clientes: ClienteRelatorio[]; semana: string; geradoEm: string; totalTarefas: number; totalComentarios: number } {
  const deStr  = de.toISOString().split('T')[0];
  const ateStr = ate.toISOString().split('T')[0];
  const label  = `${fmtBR(deStr)} a ${fmtBR(ateStr)}`;

  const slots  = getAgendaSlots(state.agendas, de, ate).sort((a, b) => a.date.getTime() - b.date.getTime());
  const extras = state.agendasExtras.filter(e => e.data >= deStr && e.data <= ateStr);
  const dias   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const clienteIds = new Set<string>();
  slots.forEach(s => clienteIds.add(s.clienteId));
  extras.forEach(e => clienteIds.add(e.clienteId));

  const agenda: Record<string, { hora: string; data: string; diaNome: string }> = {};
  slots.forEach(s => {
    if (!agenda[s.clienteId]) agenda[s.clienteId] = { hora: s.hora, data: fmtBR(s.date.toISOString().split('T')[0]), diaNome: dias[s.date.getDay()] };
  });
  extras.forEach(e => {
    if (!agenda[e.clienteId]) { const dt = new Date(e.data + 'T12:00:00'); agenda[e.clienteId] = { hora: e.hora, data: fmtBR(e.data), diaNome: dias[dt.getDay()] }; }
  });

  let totalTarefas = 0, totalComentarios = 0;
  const clientes: ClienteRelatorio[] = [];

  clienteIds.forEach(cid => {
    if (filtroClienteId && cid !== filtroClienteId) return;
    const c = state.clientes.find(x => x.id === cid); if (!c) return;
    const abertas = state.tarefas.filter(t => t.clienteId === cid && t.status !== 'concluida' && t.status !== 'cancelada');
    if (!abertas.length) return;
    totalTarefas += abertas.length;
    abertas.forEach(t => { totalComentarios += t.comentarios.length; });
    clientes.push({
      id: c.id, nome: c.nome, cor: c.cor,
      ...(agenda[cid] || { hora: '', data: '', diaNome: '' }),
      tarefas: abertas.map(t => ({
        id: t.id, desc: t.desc, status: t.status,
        comentarios: t.comentarios.map(cm => ({ txt: cm.txt, at: cm.at, autorNome: cm.autorNome || '?' })),
      })),
    });
  });

  clientes.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const agora = new Date();
  const geradoEm = `${fmtBR(agora.toISOString().split('T')[0])} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return { clientes, semana: label, geradoEm, totalTarefas, totalComentarios };
}

const ST_LABEL: Record<string, string> = { pendente: 'Pendente', andamento: 'Em andamento' };

export function gerarHTMLRelatorio(state: AppState, de: Date, ate: Date, filtroClienteId = ''): string {
  const { clientes, semana, geradoEm, totalTarefas, totalComentarios } = buildRelatorioData(state, de, ate, filtroClienteId);
  const geradoData = fmtBR(new Date().toISOString().split('T')[0]);

  const blocos = clientes.map(c => {
    const tHTML = c.tarefas.map(t => {
      const cHTML = t.comentarios.length
        ? `<div class="cw">${t.comentarios.map(cm => `
            <div class="ci">
              <div class="ci-icon">${cm.autorNome.charAt(0).toUpperCase()}</div>
              <div class="ci-body">
                <div class="ci-meta"><span class="ci-autor">${cm.autorNome}</span><span class="ci-data">${fmtDT(cm.at)}</span></div>
                <div class="ci-txt">${cm.txt}</div>
              </div>
            </div>`).join('')}</div>`
        : `<div class="no-cmnt">Sem comentários registrados</div>`;
      return `<div class="ti"><div class="ti-h"><div class="dot" style="background:${c.cor}"></div><div class="ti-desc">${t.desc}</div><span class="st ${t.status === 'andamento' ? 'st-a' : 'st-p'}">${ST_LABEL[t.status] || t.status}</span></div>${cHTML}</div>`;
    }).join('');

    return `<div class="cb">
      <div class="cb-h" style="border-left:4px solid ${c.cor}">
        <div class="cb-ini" style="background:${c.cor}">${c.nome.charAt(0)}</div>
        <div class="cb-info"><div class="cb-nome">${c.nome}</div><div class="cb-sub">📅 ${c.diaNome}, ${c.data}${c.hora ? ' · ' + c.hora : ''}</div></div>
        <div class="cb-badge">${c.tarefas.length} tarefa${c.tarefas.length !== 1 ? 's' : ''}</div>
      </div>
      ${tHTML}
    </div>`;
  }).join('');

  // CSS com cores forçadas para impressão e html2canvas
  const css = `
@font-face{font-family:'IS';font-weight:400;src:url('https://db.onlinewebfonts.com/t/5a2997d9cd39bd9d0bc3295b1a73d927.woff2') format('woff2');}
@font-face{font-family:'IS';font-weight:700;src:url('https://db.onlinewebfonts.com/t/d28024dd0f8248d26a677397a526960d.woff2') format('woff2');}
@font-face{font-family:'IS';font-weight:900;src:url('https://db.onlinewebfonts.com/t/9ef8ad7b40b9180c8d702347e01437f1.woff2') format('woff2');}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
body{font-family:'IS',sans-serif;background:#FDFFF4;color:#231F20;font-size:13px;line-height:1.5;width:210mm;}

/* CAPA */
.capa{width:210mm;min-height:297mm;background:#231F20!important;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 50px;page-break-after:always;position:relative;overflow:hidden;}
.capa-top{position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#0DDBFF,#0ab8d8 60%,transparent);}
.c1{position:absolute;width:500px;height:500px;border-radius:50%;border:1px solid rgba(13,219,255,.1);top:50%;left:50%;transform:translate(-50%,-50%);}
.c2{position:absolute;width:700px;height:700px;border-radius:50%;border:1px solid rgba(13,219,255,.05);top:50%;left:50%;transform:translate(-50%,-50%);}
.logo{display:flex;margin-bottom:60px;}
.lo-box{background:#0DDBFF!important;color:#231F20!important;font-weight:900;font-size:22px;padding:9px 16px;border-radius:6px 0 0 6px;}
.lo-lbl{background:#2e2a2b!important;color:rgba(255,255,255,.5)!important;font-weight:700;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:9px 14px;border-radius:0 6px 6px 0;border:1px solid rgba(255,255,255,.1);border-left:none;line-height:2;}
.c-label{font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#0DDBFF!important;margin-bottom:16px;text-align:center;}
.c-title{font-size:36px;font-weight:900;color:white!important;text-align:center;line-height:1.15;margin-bottom:12px;}
.c-periodo{font-size:16px;font-weight:700;color:#0DDBFF!important;text-align:center;margin-bottom:60px;}
.c-div{width:60px;height:2px;background:#0DDBFF!important;margin:0 auto 40px;opacity:.4;}
.c-meta{display:flex;gap:40px;justify-content:center;}
.c-meta-item{text-align:center;}
.c-num{font-size:32px;font-weight:900;color:white!important;line-height:1;margin-bottom:4px;}
.c-lbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35)!important;}
.c-foot{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-size:10px;color:rgba(255,255,255,.2)!important;letter-spacing:1px;}

/* CONTEÚDO */
.page{width:210mm;min-height:297mm;padding:35px 40px;page-break-after:always;background:#FDFFF4!important;}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:14px;border-bottom:2px solid #231F20;}
.ph-logo{display:flex;}
.ph-lb{background:#231F20!important;color:#0DDBFF!important;font-weight:900;font-size:13px;padding:5px 9px;border-radius:3px 0 0 3px;}
.ph-ll{background:rgba(35,31,32,.08)!important;color:#6b6568!important;font-weight:700;font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:5px 8px;border-radius:0 3px 3px 0;border:1px solid #d8dbc8;border-left:none;line-height:1.8;}
.ph-r{text-align:right;}
.ph-per{font-size:11px;font-weight:800;}
.ph-gen{font-size:9px;color:#6b6568;}

/* BLOCOS */
.cb{margin-bottom:24px;border:1px solid #d8dbc8;border-radius:10px;overflow:hidden;}
.cb-h{background:#231F20!important;padding:12px 16px;display:flex;align-items:center;gap:12px;}
.cb-ini{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#231F20!important;flex-shrink:0;}
.cb-info{flex:1;}
.cb-nome{font-weight:900;font-size:16px;color:white!important;}
.cb-sub{font-size:10px;color:rgba(255,255,255,.5)!important;margin-top:2px;font-weight:600;}
.cb-badge{background:rgba(13,219,255,.15)!important;color:#0DDBFF!important;font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:3px 8px;border-radius:3px;border:1px solid rgba(13,219,255,.25);}
.ti{padding:12px 16px;border-bottom:1px solid #d8dbc8;background:white!important;}
.ti:last-child{border-bottom:none;}
.ti-h{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;}
.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.ti-desc{font-weight:700;font-size:13px;color:#231F20!important;line-height:1.4;flex:1;}
.st{font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:2px 7px;border-radius:3px;flex-shrink:0;}
.st-p{background:rgba(232,131,10,.15)!important;color:#c06800!important;}
.st-a{background:rgba(13,219,255,.12)!important;color:#0ab8d8!important;border:1px solid rgba(13,219,255,.25);}
.cw{margin-left:17px;padding-left:14px;border-left:2px solid #d8dbc8;}
.ci{padding:7px 0;border-bottom:1px dashed #d8dbc8;display:flex;gap:10px;align-items:flex-start;}
.ci:last-child{border-bottom:none;}
.ci-icon{width:22px;height:22px;border-radius:50%;background:#231F20!important;color:#0DDBFF!important;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;flex-shrink:0;}
.ci-body{flex:1;}
.ci-meta{display:flex;gap:8px;align-items:center;margin-bottom:2px;}
.ci-autor{font-weight:800;font-size:10px;color:#231F20!important;}
.ci-data{font-size:9px;color:#6b6568!important;}
.ci-txt{font-size:11px;color:#231F20!important;line-height:1.5;}
.no-cmnt{margin-left:17px;padding:5px 0 5px 14px;font-size:10px;color:#6b6568!important;font-style:italic;}
.pf{margin-top:24px;padding-top:14px;border-top:1px solid #d8dbc8;display:flex;justify-content:space-between;font-size:9px;color:#6b6568!important;}
@media print{@page{margin:0;size:A4;}.capa,.page{page-break-after:always;}.cb{break-inside:avoid;}}
`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>

<div class="capa">
  <div class="capa-top"></div>
  <div class="c1"></div><div class="c2"></div>
  <div class="logo"><div class="lo-box">OSTEC</div><div class="lo-lbl">Central GCV</div></div>
  <div class="c-label">Relatório Semanal</div>
  <div class="c-title">Resumo de<br>Encaminhamentos GCV</div>
  <div class="c-periodo">Semana de ${semana}</div>
  <div class="c-div"></div>
  <div class="c-meta">
    <div class="c-meta-item"><div class="c-num">${clientes.length}</div><div class="c-lbl">Clientes</div></div>
    <div class="c-meta-item"><div class="c-num">${totalTarefas}</div><div class="c-lbl">Tarefas</div></div>
    <div class="c-meta-item"><div class="c-num">${totalComentarios}</div><div class="c-lbl">Comentários</div></div>
  </div>
  <div class="c-foot">OSTEC SEGURANÇA DIGITAL · GERADO EM ${geradoData.toUpperCase()}</div>
</div>

<div class="page">
  <div class="ph">
    <div class="ph-logo"><div class="ph-lb">OSTEC</div><div class="ph-ll">Central GCV</div></div>
    <div class="ph-r"><div class="ph-per">Semana ${semana}</div><div class="ph-gen">Gerado em ${geradoEm}</div></div>
  </div>
  ${clientes.length === 0
    ? `<div style="text-align:center;padding:40px;color:#6b6568;font-size:14px;">Nenhum cliente com agenda e tarefas abertas no período selecionado.</div>`
    : blocos}
  <div class="pf">
    <span>OSTEC Segurança Digital — Confidencial</span>
    <span>Semana ${semana}</span>
  </div>
</div>

</body></html>`;
}
