/* ════════════════════════════════════════════
   ui.js — Modais, toast, tabs, FAB e dashboard
   ════════════════════════════════════════════ */

// ── VIEWS / TABS ──
function showView(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  renderAll();
}

// ── MODAIS ──
function openM(id) {
  if (id === 'm-tarefa') {
    document.getElementById('mt-cl').innerHTML =
      S.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    document.getElementById('mt-desc').value  = '';
    document.getElementById('mt-prazo').value = '';
  }

  if (id === 'm-reuniao') {
    document.getElementById('mr-data').value = fmtDate(new Date());
    document.getElementById('mr-obs').value  = '';
  }

  if (id === 'm-add-agenda') {
    document.getElementById('ag-cl').innerHTML =
      S.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }

  if (id === 'm-export-agenda') {
    const today = fmtDate(new Date());
    const in3m  = new Date();
    in3m.setMonth(in3m.getMonth() + 3);
    document.getElementById('exp-de').value  = today;
    document.getElementById('exp-ate').value = fmtDate(in3m);
    document.getElementById('exp-cl').innerHTML =
      '<option value="">Todos os clientes</option>' +
      S.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }

  document.getElementById(id).classList.add('open');
}

function closeM(id) {
  document.getElementById(id).classList.remove('open');
}

// Fecha modal ao clicar no fundo
document.querySelectorAll('.modal-bg').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('open');
  });
});

// ── FAB ──
function fabClick() {
  openM('m-tarefa');
}

// ── TOAST ──
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// ── DASHBOARD ──
function renderDashboard() {
  const pend = S.tarefas.filter(t => t.status !== 'concluida' && t.status !== 'cancelada');
  const late = pend.filter(t => isLate(t.prazo));
  const anda = S.tarefas.filter(t => t.status === 'andamento');
  const conc = S.tarefas.filter(t => t.status === 'concluida');

  document.getElementById('db-stats').innerHTML = `
    <div class="stat warn">  <div class="stat-n">${pend.length}</div><div class="stat-lbl">Em Aberto</div></div>
    <div class="stat danger"><div class="stat-n">${late.length}</div><div class="stat-lbl">Atrasadas</div></div>
    <div class="stat cyan">  <div class="stat-n">${anda.length}</div><div class="stat-lbl">Em Andamento</div></div>
    <div class="stat green"> <div class="stat-n">${conc.length}</div><div class="stat-lbl">Concluídas</div></div>
  `;

  // Próximas reuniões (14 dias)
  const hoje = new Date();
  const em14 = new Date(hoje);
  em14.setDate(hoje.getDate() + 14);
  const slots = getAgendaSlots(hoje, em14).sort((a, b) => a.date - b.date);

  const porData = {};
  slots.forEach(s => {
    const k = fmtDate(s.date);
    if (!porData[k]) porData[k] = [];
    porData[k].push(s);
  });

  let nextHTML = '';
  Object.entries(porData).slice(0, 3).forEach(([dt, ss]) => {
    const rows = ss.map(s => {
      const c = getC(s.clienteId);
      if (!c) return '';
      const pTasks = S.tarefas.filter(t => t.clienteId === c.id && t.status !== 'concluida' && t.status !== 'cancelada');
      const atrs   = pTasks.filter(t => isLate(t.prazo));
      return `
      <div class="next-row">
        <div class="next-dot" style="background:${c.cor}"></div>
        <div class="next-info">
          <div class="next-nome">${c.nome}</div>
          <div>${c.empresa ? `<span class="next-emp">${c.empresa}</span>` : ''}</div>
        </div>
        <div class="next-hora">${s.hora}</div>
        <div style="display:flex;gap:5px">
          ${atrs.length   ? `<span class="badge b-late">⚠${atrs.length}</span>` : ''}
          ${pTasks.length ? `<span class="badge b-pend">${pTasks.length}</span>` : `<span class="badge b-ok">✓</span>`}
        </div>
      </div>`;
    }).join('');

    const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][new Date(dt + 'T12:00:00').getDay()];
    nextHTML += `
    <div class="next-card" style="margin-bottom:12px">
      <div class="next-head">
        <div class="next-head-title">${diaSemana}</div>
        <div class="next-head-date">${fmtBR(dt)}</div>
      </div>
      ${rows}
    </div>`;
  });

  if (!nextHTML) {
    nextHTML = `
    <div class="next-card" style="margin-bottom:12px">
      <div class="next-head"><div class="next-head-title">Próximas Reuniões</div></div>
      <div style="padding:14px;color:rgba(255,255,255,.3);font-size:12px;text-align:center">
        Nenhuma agenda nos próximos 14 dias
      </div>
    </div>`;
  }

  document.getElementById('db-next').innerHTML = nextHTML;

  // Tarefas abertas
  const abertas = [...pend].sort((a, b) => (isLate(a.prazo) ? -1 : 0) - (isLate(b.prazo) ? -1 : 0));

  if (!abertas.length) {
    document.getElementById('db-tasks').innerHTML =
      '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px;font-style:italic">Nenhuma tarefa em aberto 🎉</div>';
    return;
  }

  document.getElementById('db-tasks').innerHTML = abertas.map(t => {
    const c = getC(t.clienteId);
    if (!c) return '';
    const l = isLate(t.prazo);
    return `
    <div style="background:white;border:1px solid ${l ? '#fecaca' : 'var(--border)'};border-left:4px solid ${c.cor};border-radius:8px;padding:11px 14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(35,31,32,.05)">
      <div style="font-size:13px;line-height:1.5;margin-bottom:6px">${t.desc}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;font-family:'Isidora Sans',sans-serif;font-weight:800;color:${c.cor}">${c.nome}</span>
        ${t.prazo ? `<span style="font-size:11px;color:${l ? 'var(--danger)' : 'var(--muted)'}">${l ? '⚠ ' : ''}${fmtBR(t.prazo)}</span>` : ''}
        <button class="spill sp-${t.status}" onclick="cycleStatus('${t.id}')">${labelS(t.status)}</button>
        ${t.comentarios.length ? `<span style="font-size:10px;color:var(--cyan-dim);font-family:'Isidora Sans',sans-serif;font-weight:700">💬 ${t.comentarios.length}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── HISTÓRICO ──
function renderHistorico() {
  const el = document.getElementById('hist-list');
  if (!el) return;
  const rs = [...S.reunioes].sort((a, b) => b.data.localeCompare(a.data));
  if (!rs.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px">Nenhuma reunião registrada.</div>';
    return;
  }
  el.innerHTML = rs.map(r => {
    const tDR   = S.tarefas.filter(t => t.reuniaoId === r.id);
    const clRows = S.clientes.map(c => {
      const ts = tDR.filter(t => t.clienteId === c.id);
      if (!ts.length) return '';
      const conc = ts.filter(t => t.status === 'concluida').length;
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--border);font-size:12px">
        <div style="width:8px;height:8px;border-radius:50%;background:${c.cor}"></div>
        <div style="flex:1;font-family:'Isidora Sans',sans-serif;font-weight:700">${c.nome}</div>
        <div style="color:var(--muted)">${ts.length} tarefa${ts.length !== 1 ? 's' : ''}</div>
        <div>${conc === ts.length
          ? `<span class="badge b-ok">✓ ok</span>`
          : `<span class="badge b-pend">${conc}/${ts.length}</span>`}
        </div>
      </div>`;
    }).filter(Boolean).join('');

    return `
    <div style="background:white;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden;box-shadow:0 1px 4px rgba(35,31,32,.06)">
      <div style="background:var(--dark);padding:9px 14px;font-family:'Isidora Sans',sans-serif;font-weight:800;font-size:12px;color:var(--cyan);display:flex;gap:8px;align-items:center">
        📅 ${fmtBR(r.data)}
        ${r.obs ? `<span style="color:rgba(255,255,255,.45);font-weight:400">— ${r.obs}</span>` : ''}
      </div>
      ${clRows || '<div style="padding:10px 14px;color:var(--muted);font-size:11px">Sem tarefas nesta reunião</div>'}
    </div>`;
  }).join('');
}

// ── REUNIÃO ──
function saveReuniao() {
  const data = document.getElementById('mr-data').value;
  const obs  = document.getElementById('mr-obs').value.trim();
  if (!data) { toast('Selecione a data'); return; }
  S.reunioes.push({ id: uid(), data, obs });
  save();
  closeM('m-reuniao');
  renderAll();
  toast('Reunião registrada ✓');
}
