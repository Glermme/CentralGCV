/* ════════════════════════════════════════════
   clientes.js — Clientes e configuração
   ════════════════════════════════════════════ */

// ── COR SELECIONADA ──
let _selectedColor = COLORS[0];

// ── HTML DO CARD DE CLIENTE ──
function clienteHTML(c) {
  const ts   = S.tarefas.filter(t => t.clienteId === c.id);
  const pend = ts.filter(t => t.status !== 'concluida' && t.status !== 'cancelada');
  const conc = ts.filter(t => t.status === 'concluida');
  const late = pend.filter(t => isLate(t.prazo));
  const pct  = ts.length ? Math.round(conc.length / ts.length * 100) : 0;

  return `
  <div class="cliente-card" id="cc-${c.id}">
    <div class="cc-header" style="border-left-color:${c.cor}" onclick="toggleCC('${c.id}')">
      <div class="cc-initial" style="background:${c.cor}">${c.nome.charAt(0)}</div>
      <div class="cc-info">
        <div class="cc-nome">${c.nome}</div>
        <div class="cc-sub">${c.empresa || '—'} · ${ts.length} tarefa${ts.length !== 1 ? 's' : ''} · ${pct}%</div>
        <div class="prog-bar">
          <div class="prog-fill" style="width:${pct}%;background:${c.cor}"></div>
        </div>
      </div>
      <div class="cc-badges">
        ${late.length ? `<span class="badge b-late">⚠${late.length}</span>` : ''}
        ${pend.length
          ? `<span class="badge b-pend">${pend.length}</span>`
          : (ts.length ? `<span class="badge b-ok">✓</span>` : '')}
      </div>
      <div class="chevron" id="chev-${c.id}">▼</div>
    </div>
    <div class="tarefas-wrap" id="tw-${c.id}">
      <div id="tl-${c.id}">
        ${ts.length
          ? ts.map(tarefaHTML).join('')
          : '<div style="padding:14px;text-align:center;color:var(--muted);font-size:12px;font-style:italic">Nenhuma tarefa ainda</div>'}
      </div>
      <div class="t-form" id="tf-${c.id}">
        <textarea class="fi" id="tfd-${c.id}" rows="2" placeholder="Descreva a tarefa..."></textarea>
        <div class="fi-row">
          <input type="date" class="fi" id="tfp-${c.id}" style="flex:1">
          <select class="fi-sel" id="tfs-${c.id}">
            <option value="pendente">Pendente</option>
            <option value="andamento">Em andamento</option>
          </select>
        </div>
        <div class="fi-row-btns">
          <button class="btn-prim" onclick="addTInline('${c.id}')">Salvar</button>
          <button class="btn-sec"  onclick="toggleTF('${c.id}')">Cancelar</button>
        </div>
      </div>
      <div class="t-toolbar">
        <button class="tb-btn"          onclick="toggleTF('${c.id}')">+ Tarefa</button>
        <button class="tb-btn batch"    onclick="openBatch('${c.id}')">⊞ Lote</button>
        <button class="tb-btn export"   onclick="exportClienteXLS('${c.id}')">↓ XLS</button>
      </div>
    </div>
  </div>`;
}

// ── RENDER CLIENTES ──
function renderClientes() {
  const el = document.getElementById('clientes-list');
  if (!el) return;
  if (!S.clientes.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:12px">Nenhum cliente. Vá em Configurar.</div>';
    return;
  }
  el.innerHTML = S.clientes.map(c => clienteHTML(c)).join('');
}

// ── TOGGLE CARD ──
function toggleCC(id) {
  document.getElementById('tw-' + id).classList.toggle('open');
  document.getElementById('chev-' + id).classList.toggle('open');
}

function toggleTF(cid) {
  const f = document.getElementById('tf-' + cid);
  f.classList.toggle('open');
  if (f.classList.contains('open')) document.getElementById('tfd-' + cid).focus();
}

// ── RE-RENDER DE UM CARD ──
function reCC(cid) {
  const card = document.getElementById('cc-' + cid);
  if (!card) return;
  const wasOpen = document.getElementById('tw-' + cid)?.classList.contains('open');
  const c = getC(cid);
  const tmp = document.createElement('div');
  tmp.innerHTML = clienteHTML(c);
  card.replaceWith(tmp.firstElementChild);
  if (wasOpen) {
    document.getElementById('tw-' + cid)?.classList.add('open');
    document.getElementById('chev-' + cid)?.classList.add('open');
  }
}

// ── CONFIG — CORES ──
function selClrDirect(hex) {
  _selectedColor = hex;
  renderConfig();
}

function selectCustomColor(hex) {
  _selectedColor = hex;
  document.querySelectorAll('.clr').forEach(el => el.classList.remove('sel'));
  const prev = document.getElementById('cfg-cor-preview');
  if (prev) { prev.style.background = hex; prev.style.borderColor = hex + '66'; }
}

function selectRandomColor() {
  const used = new Set(S.clientes.map(c => c.cor.toLowerCase()));
  let attempts = 0, candidate;
  do {
    const h = Math.floor(Math.random() * 360);
    const s = 55 + Math.floor(Math.random() * 35);
    const l = 38 + Math.floor(Math.random() * 22);
    candidate = hslToHex(h, s, l);
    attempts++;
  } while (used.has(candidate.toLowerCase()) && attempts < 50);
  _selectedColor = candidate;
  renderConfig();
  const ci = document.getElementById('cfg-custom-color');
  if (ci) ci.value = candidate;
  toast('Cor aleatória gerada!');
}

// ── ADICIONAR / REMOVER CLIENTE ──
function addCliente() {
  const nome = document.getElementById('cfg-nome').value.trim();
  if (!nome) { toast('Digite o nome'); return; }
  const usedColors = S.clientes.map(c => c.cor.toLowerCase());
  const cor = _selectedColor;
  if (usedColors.includes(cor.toLowerCase())) {
    toast('Essa cor já está em uso — escolha outra ou use Aleatória');
    return;
  }
  S.clientes.push({ id: uid(), nome, empresa: nome, cor });
  const nextIdx = (COLORS.indexOf(cor) + 1) % COLORS.length;
  _selectedColor = COLORS[nextIdx] || COLORS[0];
  document.getElementById('cfg-nome').value = '';
  save();
  renderAll();
  toast('Cliente adicionado ✓');
}

function delCliente(id) {
  if (!confirm('Remover cliente e todas as tarefas?')) return;
  S.clientes = S.clientes.filter(c => c.id !== id);
  S.tarefas  = S.tarefas.filter(t => t.clienteId !== id);
  S.agendas  = S.agendas.filter(a => a.clienteId !== id);
  save();
  renderAll();
}

// ── RENDER CONFIG ──
function renderConfig() {
  const cr = document.getElementById('color-row');
  if (cr) {
    cr.innerHTML = COLORS.map(c =>
      `<div class="clr ${c === _selectedColor ? 'sel' : ''}" style="background:${c}"
        onclick="selClrDirect('${c}')" title="${c}"></div>`
    ).join('');
  }

  const prev = document.getElementById('cfg-cor-preview');
  if (prev) { prev.style.background = _selectedColor; prev.style.borderColor = _selectedColor + '66'; }

  const ci = document.getElementById('cfg-custom-color');
  if (ci) ci.value = _selectedColor;

  const el = document.getElementById('cfg-cl-list');
  if (!el) return;
  el.innerHTML = S.clientes.length
    ? S.clientes.map(c => `
      <div class="cl-line">
        <div class="cl-ini" style="background:${c.cor}">${c.nome.charAt(0)}</div>
        <div style="flex:1">
          <div class="cl-nm">${c.nome}</div>
          ${c.empresa ? `<div class="cl-em">${c.empresa}</div>` : ''}
        </div>
        <button class="cl-del-btn" onclick="delCliente('${c.id}')">Remover</button>
      </div>`).join('')
    : '<div style="padding:12px 0;color:var(--muted);font-size:12px">Nenhum cliente.</div>';

  const ael = document.getElementById('cfg-ag-list');
  if (!ael) return;
  ael.innerHTML = S.agendas.length
    ? S.agendas.map(ag => {
        const c    = getC(ag.clienteId) || { nome: '?', cor: '#ccc', empresa: '' };
        const rule = `${OCORR[ag.ocorrencia]} ${DIAS[ag.diaSemana]} do mês · ${ag.hora}`;
        return `
        <div class="recurrence-card">
          <div class="rc-dot" style="background:${c.cor}"></div>
          <div class="rc-info">
            <div class="rc-nome">${c.nome}</div>
            <div class="rc-rule">${rule}${ag.obs ? ' — ' + ag.obs : ''}</div>
          </div>
          <button class="rc-del" onclick="delAgenda('${ag.id}')">✕</button>
        </div>`;
      }).join('')
    : '<div style="padding:12px 0;color:var(--muted);font-size:12px">Nenhuma agenda recorrente.</div>';
}
