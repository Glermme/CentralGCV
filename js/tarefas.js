/* ════════════════════════════════════════════
   tarefas.js — Tarefas e comentários
   ════════════════════════════════════════════ */

// ── HTML DE UMA TAREFA ──
function tarefaHTML(t) {
  const late = isLate(t.prazo) && t.status !== 'concluida';
  const hasC = t.comentarios && t.comentarios.length > 0;
  return `
  <div class="t-item ${t.status === 'concluida' ? 'done' : ''}" id="ti-${t.id}">
    <div class="t-main">
      <div class="chk ${t.status === 'concluida' ? 'on' : ''}" onclick="toggleConc('${t.id}')">
        ${t.status === 'concluida' ? '✓' : ''}
      </div>
      <div class="t-body">
        <div class="t-txt">${t.desc}</div>
        <div class="t-meta">
          ${t.prazo ? `<span class="t-date ${late ? 'late' : ''}">${late ? '⚠ ' : ''}${fmtBR(t.prazo)}</span>` : ''}
          <button class="spill sp-${t.status}" onclick="cycleStatus('${t.id}')">${labelS(t.status)}</button>
        </div>
      </div>
      <div class="t-right">
        <button class="cmnt-toggle ${hasC ? 'has' : ''}" id="ctg-${t.id}" onclick="toggleCmnt('${t.id}')">
          💬 ${hasC ? t.comentarios.length : '+'}
        </button>
        <button class="del-btn" onclick="delT('${t.id}')">✕</button>
      </div>
    </div>
    <div class="cmnt-section" id="cs-${t.id}">
      <div id="cl-${t.id}">
        ${(t.comentarios || []).map((cm, i) => `
          <div class="cmnt-item">
            <div class="cmnt-hd">
              <span class="cmnt-dt">${fmtDT(cm.at)}</span>
              <button class="cmnt-x" onclick="delCmnt('${t.id}', ${i})">✕</button>
            </div>
            <div class="cmnt-txt">${cm.txt}</div>
          </div>`).join('')}
      </div>
      <div class="cmnt-add">
        <input type="text" id="ci-${t.id}" placeholder="Escreva um comentário..."
          onkeydown="if(event.key==='Enter') addCmnt('${t.id}')">
        <button class="btn-send" onclick="addCmnt('${t.id}')">Enviar</button>
      </div>
    </div>
  </div>`;
}

// ── AÇÕES DE TAREFA ──
function addTInline(cid) {
  const desc = document.getElementById('tfd-' + cid).value.trim();
  if (!desc) { toast('Descreva a tarefa'); return; }
  const prazo  = document.getElementById('tfp-' + cid).value;
  const status = document.getElementById('tfs-' + cid).value;
  const last   = [...S.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
  S.tarefas.push({
    id: uid(), clienteId: cid, desc, prazo, status,
    reuniaoId: last?.id || null,
    criadaEm: new Date().toISOString(),
    comentarios: []
  });
  save();
  reCC(cid);
  toast('Tarefa adicionada ✓');
}

function saveTarefa() {
  const cid    = document.getElementById('mt-cl').value;
  const desc   = document.getElementById('mt-desc').value.trim();
  if (!desc) { toast('Descreva a tarefa'); return; }
  const prazo  = document.getElementById('mt-prazo').value;
  const status = document.getElementById('mt-status').value;
  const last   = [...S.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
  S.tarefas.push({
    id: uid(), clienteId: cid, desc, prazo, status,
    reuniaoId: last?.id || null,
    criadaEm: new Date().toISOString(),
    comentarios: []
  });
  save();
  closeM('m-tarefa');
  renderAll();
  toast('Tarefa salva ✓');
}

function toggleConc(tid) {
  const t = S.tarefas.find(t => t.id === tid);
  if (!t) return;
  t.status = t.status === 'concluida' ? 'pendente' : 'concluida';
  save();
  reCC(t.clienteId);
  renderDashboard();
  toast(t.status === 'concluida' ? 'Concluída ✓' : 'Reaberta');
}

function cycleStatus(tid) {
  const t = S.tarefas.find(t => t.id === tid);
  if (!t) return;
  const ciclo = ['pendente', 'andamento', 'concluida'];
  t.status = ciclo[(ciclo.indexOf(t.status) + 1) % ciclo.length];
  save();
  reCC(t.clienteId);
  renderDashboard();
}

function delT(tid) {
  const t = S.tarefas.find(t => t.id === tid);
  if (!t) return;
  S.tarefas = S.tarefas.filter(x => x.id !== tid);
  save();
  reCC(t.clienteId);
  renderDashboard();
  toast('Tarefa removida');
}

// ── COMENTÁRIOS ──
function toggleCmnt(tid) {
  document.getElementById('cs-' + tid).classList.toggle('open');
}

function addCmnt(tid) {
  const inp = document.getElementById('ci-' + tid);
  const txt = inp.value.trim();
  if (!txt) return;
  const t = S.tarefas.find(t => t.id === tid);
  if (!t) return;
  if (!t.comentarios) t.comentarios = [];
  t.comentarios.push({ txt, at: new Date().toISOString() });
  save();
  inp.value = '';

  document.getElementById('cl-' + tid).innerHTML = t.comentarios.map((cm, i) => `
    <div class="cmnt-item">
      <div class="cmnt-hd">
        <span class="cmnt-dt">${fmtDT(cm.at)}</span>
        <button class="cmnt-x" onclick="delCmnt('${tid}', ${i})">✕</button>
      </div>
      <div class="cmnt-txt">${cm.txt}</div>
    </div>`).join('');

  const btn = document.getElementById('ctg-' + tid);
  if (btn) {
    btn.textContent = '💬 ' + t.comentarios.length;
    btn.classList.add('has');
  }
  renderDashboard();
  toast('Comentário adicionado');
}

function delCmnt(tid, idx) {
  const t = S.tarefas.find(t => t.id === tid);
  if (!t) return;
  t.comentarios.splice(idx, 1);
  save();
  reCC(t.clienteId);
  renderDashboard();
}

// ── BATCH IMPORT ──
let _bCid = null;

function openBatch(cid) {
  _bCid = cid;
  const c = getC(cid);
  document.getElementById('batch-title').innerHTML = `Importar em <span>Lote</span> — ${c.nome}`;
  document.getElementById('batch-txt').value   = '';
  document.getElementById('batch-prazo').value = '';
  document.getElementById('batch-prev').classList.remove('show');
  openM('m-batch');
}

function previewBatch() {
  const ps = document.getElementById('batch-txt').value
    .split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const el = document.getElementById('batch-prev');
  if (ps.length) {
    el.textContent = `${ps.length} tarefa${ps.length > 1 ? 's' : ''} detectada${ps.length > 1 ? 's' : ''}`;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

function importBatch() {
  const ps = document.getElementById('batch-txt').value
    .split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (!ps.length) { toast('Nenhum parágrafo encontrado'); return; }
  const prazo = document.getElementById('batch-prazo').value;
  const last  = [...S.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
  ps.forEach(desc => S.tarefas.push({
    id: uid(), clienteId: _bCid, desc, prazo,
    status: 'pendente', reuniaoId: last?.id || null,
    criadaEm: new Date().toISOString(), comentarios: []
  }));
  save();
  closeM('m-batch');
  renderAll();
  toast(`${ps.length} tarefa${ps.length > 1 ? 's' : ''} importada${ps.length > 1 ? 's' : ''} ✓`);
}

// ── EXPORT XLS DE CLIENTE ──
function exportClienteXLS(cid) {
  const c = getC(cid);
  if (!c) return;
  const ts = S.tarefas.filter(t => t.clienteId === cid);
  if (!ts.length) { toast('Nenhuma tarefa para exportar'); return; }

  const rows = [
    [`Cliente: ${c.nome}  |  Empresa: ${c.empresa || '—'}  |  Exportado: ${fmtDT(new Date().toISOString())}`],
    [],
    ['Tarefa', 'Status', 'Prazo', 'Comentário', 'Data/Hora Comentário']
  ];

  ts.forEach(t => {
    if (!t.comentarios || !t.comentarios.length) {
      rows.push([t.desc, labelS(t.status), t.prazo ? fmtBR(t.prazo) : '—', '', '']);
    } else {
      t.comentarios.forEach((cm, i) => {
        rows.push([
          i === 0 ? t.desc       : '',
          i === 0 ? labelS(t.status) : '',
          i === 0 ? (t.prazo ? fmtBR(t.prazo) : '—') : '',
          cm.txt,
          fmtDT(cm.at)
        ]);
      });
    }
    rows.push([]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 14 }, { wch: 50 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, c.nome.substring(0, 31));
  XLSX.writeFile(wb, `OSTEC_${c.nome.replace(/\s+/g, '_')}_tarefas.xlsx`);
  toast('XLS exportado ✓');
}
