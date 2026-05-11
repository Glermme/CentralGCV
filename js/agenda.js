/* ════════════════════════════════════════════
   agenda.js — Agenda recorrente
   ════════════════════════════════════════════ */

// ── CÁLCULO DE DATAS ──

/**
 * Retorna a Nth ocorrência de um dia da semana num dado mês.
 * @param {number} year
 * @param {number} month  - 0-indexed (JS)
 * @param {number} nth    - 1ª, 2ª, 3ª ou 4ª ocorrência
 * @param {number} weekday - 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex
 * @returns {Date|null}
 */
function nthWeekday(year, month, nth, weekday) {
  // Converte nossa convenção (1=Seg..5=Sex) para JS getDay() (0=Dom..6=Sáb)
  // 1=Seg→1, 2=Ter→2, ..., 5=Sex→5
  const target = weekday; // coincide com JS para Seg–Sex
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d);
    if (dt.getMonth() !== month) break;
    if (dt.getDay() === target) {
      count++;
      if (count === nth) return dt;
    }
  }
  return null;
}

/**
 * Retorna todos os slots de agenda entre duas datas.
 * @param {Date} from
 * @param {Date} to
 * @returns {Array}
 */
function getAgendaSlots(from, to) {
  const slots = [];
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end   = new Date(to);   end.setHours(23, 59, 59, 999);

  S.agendas.forEach(ag => {
    let y = start.getFullYear(), m = start.getMonth();
    const endY = end.getFullYear(), endM = end.getMonth();

    while (y < endY || (y === endY && m <= endM)) {
      const dt = nthWeekday(y, m, ag.ocorrencia, ag.diaSemana);
      if (dt && dt >= start && dt <= end) {
        slots.push({
          agendaId:   ag.id,
          clienteId:  ag.clienteId,
          date:       new Date(dt),
          hora:       ag.hora,
          obs:        ag.obs
        });
      }
      m++;
      if (m > 11) { m = 0; y++; }
    }
  });

  return slots;
}

/**
 * Gera a chave única de uma ocorrência de agenda.
 */
function ocorrenciaKey(agendaId, date) {
  return `${agendaId}_${fmtDate(date)}`;
}

// ── RENDER AGENDA ──
function renderAgenda() {
  const el = document.getElementById('agenda-view');
  if (!el) return;

  const hoje = new Date();
  const em8  = new Date(hoje);
  em8.setDate(hoje.getDate() + 56);

  const slots = getAgendaSlots(hoje, em8)
    .sort((a, b) => a.date - b.date || a.hora.localeCompare(b.hora));

  if (!slots.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">
        Nenhuma agenda recorrente cadastrada.<br>
        Clique em <strong>+ Recorrência</strong> para adicionar.
      </div>`;
    return;
  }

  // Agrupa por data
  const porData = {};
  slots.forEach(s => {
    const k = fmtDate(s.date);
    if (!porData[k]) porData[k] = [];
    porData[k].push(s);
  });

  el.innerHTML = Object.entries(porData).map(([dt, ss]) => {
    const d       = new Date(dt + 'T12:00:00');
    const diaNome = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];

    const rows = ss.map(s => {
      const c = getC(s.clienteId);
      if (!c) return '';
      const key      = ocorrenciaKey(s.agendaId, s.date);
      const oc       = S.ocorrencias[key] || {};
      const statusCls = oc.status === 'ocorreu' ? 'ocorreu' : oc.status === 'nao' ? 'nao-ocorreu' : '';

      return `
      <div class="ag-slot ${statusCls}">
        <div class="ag-hora">${s.hora}</div>
        <div class="ag-dot" style="background:${c.cor}"></div>
        <div class="ag-info">
          <div class="ag-cliente">
            ${c.nome}
            ${c.empresa ? `<span style="font-size:10px;color:var(--muted);font-weight:400">${c.empresa}</span>` : ''}
          </div>
          ${oc.motivo ? `<div class="ag-motivo">✗ ${oc.motivo}</div>` : ''}
          ${s.obs     ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">${s.obs}</div>` : ''}
        </div>
        <div class="ag-status-btns">
          <button class="ag-btn ocorreu-btn ${oc.status === 'ocorreu' ? 'active' : ''}"
            onclick="setAgStatus('${s.agendaId}','${fmtDate(s.date)}','ocorreu')">✓</button>
          <button class="ag-btn nao-ocorreu-btn ${oc.status === 'nao' ? 'active' : ''}"
            onclick="askMotivo('${s.agendaId}','${fmtDate(s.date)}')">✗</button>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="agenda-card">
      <div class="ag-head">
        <div class="ag-date-box">${fmtBR(dt)}</div>
        <div class="ag-title">${diaNome} · ${ss.length} reunião${ss.length > 1 ? 'ões' : ''}</div>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

// ── STATUS DE OCORRÊNCIA ──
function setAgStatus(agId, dt, status) {
  const key = `${agId}_${dt}`;
  if (!S.ocorrencias[key]) S.ocorrencias[key] = {};
  S.ocorrencias[key].status = status;
  if (status === 'ocorreu') S.ocorrencias[key].motivo = '';
  save();
  renderAgenda();
  toast(status === 'ocorreu' ? 'Reunião marcada como ocorrida ✓' : 'Marcada como não ocorrida');
}

let _motiKey = null;

function askMotivo(agId, dt) {
  _motiKey = `${agId}_${dt}`;
  const oc = S.ocorrencias[_motiKey] || {};
  document.getElementById('motivo-txt').value = oc.motivo || '';
  openM('m-motivo');
}

function saveMotivo() {
  const txt = document.getElementById('motivo-txt').value.trim();
  if (!S.ocorrencias[_motiKey]) S.ocorrencias[_motiKey] = {};
  S.ocorrencias[_motiKey].status = 'nao';
  S.ocorrencias[_motiKey].motivo = txt;
  save();
  closeM('m-motivo');
  renderAgenda();
  toast('Motivo salvo');
}

// ── SALVAR RECORRÊNCIA ──
function saveAgendaRecorrente() {
  const clienteId  = document.getElementById('ag-cl').value;
  const ocorrencia = parseInt(document.getElementById('ag-ocorr').value);
  const diaSemana  = parseInt(document.getElementById('ag-diaSem').value);
  const hora       = document.getElementById('ag-hora').value;
  const obs        = document.getElementById('ag-obs').value.trim();
  if (!clienteId) { toast('Selecione o cliente'); return; }
  S.agendas.push({ id: uid(), clienteId, ocorrencia, diaSemana, hora, obs });
  save();
  closeM('m-add-agenda');
  renderAll();
  toast('Agenda adicionada ✓');
}

function delAgenda(id) {
  if (!confirm('Remover esta recorrência?')) return;
  S.agendas = S.agendas.filter(a => a.id !== id);
  save();
  renderAll();
  toast('Recorrência removida');
}

// ── EXPORT AGENDA XLS ──
function exportAgendaXLS() {
  const de     = document.getElementById('exp-de').value;
  const ate    = document.getElementById('exp-ate').value;
  const filtCl = document.getElementById('exp-cl').value;

  const from = de  ? new Date(de  + 'T00:00:00') : new Date(2020, 0, 1);
  const to   = ate ? new Date(ate + 'T23:59:59') : new Date(2030, 11, 31);

  let slots = getAgendaSlots(from, to);
  if (filtCl) slots = slots.filter(s => s.clienteId === filtCl);
  slots.sort((a, b) => a.date - b.date || a.hora.localeCompare(b.hora));

  if (!slots.length) { toast('Nenhuma agenda no período'); return; }

  const dias = ['Dom', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const rows = [['Data', 'Dia da Semana', 'Horário', 'Cliente', 'Empresa', 'Status', 'Motivo (se não ocorreu)']];

  slots.forEach(s => {
    const c   = getC(s.clienteId) || { nome: '', empresa: '' };
    const key = `${s.agendaId}_${fmtDate(s.date)}`;
    const oc  = S.ocorrencias[key] || {};
    const statusTxt = oc.status === 'ocorreu' ? 'Ocorreu' : oc.status === 'nao' ? 'Não ocorreu' : 'Não informado';
    rows.push([
      fmtBR(fmtDate(s.date)),
      dias[s.date.getDay()],
      s.hora,
      c.nome,
      c.empresa || '',
      statusTxt,
      oc.motivo || ''
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Agendas');
  const fname = `OSTEC_Agendas${de ? '_' + de : ''}${ate ? '_a_' + ate : ''}.xlsx`;
  XLSX.writeFile(wb, fname);
  closeM('m-export-agenda');
  toast('Agenda exportada ✓');
}
