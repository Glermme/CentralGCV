'use client';

import React, { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { fmtBR, fmtDate, DIAS, OCORR } from '@/lib/store';
import { getAgendaSlots, getScanSlots } from '@/lib/agenda';
import ModalConfirm from '@/components/modals/ModalConfirm';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

type FormTab    = 'recorrente' | 'extra' | 'scan' | 'recheck' | 'prem' | 'atividade';
type FiltroTipo = 'todos' | 'reunioes' | 'extras' | 'scans' | 'recheks' | 'prems' | 'atividades';
type MotivoTipo = 'recorrente' | 'extra' | 'scan' | 'recheck' | 'prem' | 'atividade';

// Paleta de cores por tipo
const COR: Record<string, string> = {
  reuniao:   'var(--cyan)',
  extra:     'var(--danger)',
  scan:      'var(--warn)',
  recheck:   '#7c3aed',
  prem:      '#059669',
  atividade: '#2563eb',
};

export default function Agenda({ store, showToast }: Props) {
  const {
    state, setOcorrencia,
    addAgenda, delAgenda,
    addAgendaExtra, delAgendaExtra, setAgendaExtraStatus,
    addScan, delScan, setScanStatus,
    addRecheck, delRecheck, setRechekStatus,
    addPrem, delPrem, setPremStatus,
    addAtividade, delAtividade, setAtividadeStatus,
  } = store;

  const [showForm,   setShowForm]   = useState(false);
  const [formTab,    setFormTab]    = useState<FormTab>('recorrente');
  const [filtro,     setFiltro]     = useState<FiltroTipo>('todos');
  const [viewMode,   setViewMode]   = useState<'proximas' | 'pendentes'>('proximas');
  const [motivoKey,  setMotivoKey]  = useState<string | null>(null);
  const [motivoTipo, setMotivoTipo] = useState<MotivoTipo>('recorrente');
  const [motivoTxt,  setMotivoTxt]  = useState('');
  const [confirm,    setConfirm]    = useState<{ titulo: string; mensagem: string; onOk: () => void } | null>(null);

  // ── Form: recorrente ──────────────────────────────────────────────────────────
  const [agCl, setAgCl] = useState(''); const [agOcorr, setAgOcorr] = useState(2); const [agDia, setAgDia] = useState(2); const [agHora, setAgHora] = useState('14:00'); const [agObs, setAgObs] = useState('');
  // ── Form: extra ───────────────────────────────────────────────────────────────
  const [exCl, setExCl] = useState(''); const [exData, setExData] = useState(''); const [exHora, setExHora] = useState('14:00'); const [exDurH, setExDurH] = useState('01'); const [exDurM, setExDurM] = useState('00'); const [exDesc, setExDesc] = useState('');
  // ── Form: scan ────────────────────────────────────────────────────────────────
  const [scCl, setScCl] = useState(''); const [scOcorr, setScOcorr] = useState(1); const [scDia, setScDia] = useState(6); const [scHora, setScHora] = useState('10:00'); const [scObs, setScObs] = useState('');
  // ── Form: recheck ─────────────────────────────────────────────────────────────
  const [rcCl, setRcCl] = useState(''); const [rcData, setRcData] = useState(''); const [rcHora, setRcHora] = useState('14:00'); const [rcDurH, setRcDurH] = useState('01'); const [rcDurM, setRcDurM] = useState('00'); const [rcDesc, setRcDesc] = useState('');
  // ── Form: prem ────────────────────────────────────────────────────────────────
  const [prCl, setPrCl] = useState(''); const [prData, setPrData] = useState(''); const [prHora, setPrHora] = useState('14:00'); const [prDurH, setPrDurH] = useState('01'); const [prDurM, setPrDurM] = useState('00'); const [prDesc, setPrDesc] = useState('');
  // ── Form: atividade ───────────────────────────────────────────────────────────
  const [atCl, setAtCl] = useState(''); const [atData, setAtData] = useState(''); const [atHora, setAtHora] = useState('14:00'); const [atDurH, setAtDurH] = useState('01'); const [atDurM, setAtDurM] = useState('00'); const [atDesc, setAtDesc] = useState('');

  // ── Datas base ────────────────────────────────────────────────────────────────
  const hoje  = new Date();
  const em8   = new Date(hoje); em8.setDate(hoje.getDate() + 56);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const ha8p  = new Date(hoje); ha8p.setDate(hoje.getDate() - 56);

  // ── Dados próximas ────────────────────────────────────────────────────────────
  const slots               = getAgendaSlots(state.agendas, hoje, em8).sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));
  const scanSlots           = getScanSlots(state.scans, hoje, em8).sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));
  const extrasNoPeriodo     = state.agendasExtras.filter(e => e.data >= fmtDate(hoje) && e.data <= fmtDate(em8)).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  const recheksNoPeriodo    = state.recheks.filter(r => r.data >= fmtDate(hoje) && r.data <= fmtDate(em8)).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  const premsNoPeriodo      = state.prems.filter(p => p.data >= fmtDate(hoje) && p.data <= fmtDate(em8)).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  const atividadesNoPeriodo = state.atividades.filter(a => a.data >= fmtDate(hoje) && a.data <= fmtDate(em8)).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  // ── Pendentes (passados sem confirmação) ──────────────────────────────────────
  const pendRec = getAgendaSlots(state.agendas, ha8p, ontem).filter(s => !state.ocorrencias[`${s.agendaId}_${fmtDate(s.date)}`]?.status);
  const pendEx  = state.agendasExtras.filter(e => e.data < fmtDate(hoje) && e.status !== 'ocorreu' && e.status !== 'nao');
  const pendScn = getScanSlots(state.scans, ha8p, ontem).filter(s => !state.scanOcorrencias[`${s.scanId}_${fmtDate(s.date)}`]?.status);
  const pendRck = state.recheks.filter(r => r.data < fmtDate(hoje) && r.status !== 'ocorreu' && r.status !== 'nao');
  const pendPrm = state.prems.filter(p => p.data < fmtDate(hoje) && p.status !== 'ocorreu' && p.status !== 'nao');
  const pendAtv = state.atividades.filter(a => a.data < fmtDate(hoje) && a.status !== 'ocorreu' && a.status !== 'nao');
  const totalPend = pendRec.length + pendEx.length + pendScn.length + pendRck.length + pendPrm.length + pendAtv.length;

  // ── Seleção de fonte ──────────────────────────────────────────────────────────
  const activeRec  = viewMode === 'pendentes' ? pendRec  : slots;
  const activeEx   = viewMode === 'pendentes' ? pendEx   : extrasNoPeriodo;
  const activeScn  = viewMode === 'pendentes' ? pendScn  : scanSlots;
  const activeRck  = viewMode === 'pendentes' ? pendRck  : recheksNoPeriodo;
  const activePrm  = viewMode === 'pendentes' ? pendPrm  : premsNoPeriodo;
  const activeAtv  = viewMode === 'pendentes' ? pendAtv  : atividadesNoPeriodo;

  // ── porData ───────────────────────────────────────────────────────────────────
  const emptyDay = () => ({ recorrentes: [] as typeof slots, extras: [] as typeof extrasNoPeriodo, scans: [] as typeof scanSlots, recheks: [] as typeof recheksNoPeriodo, prems: [] as typeof premsNoPeriodo, atividades: [] as typeof atividadesNoPeriodo });
  const porData: Record<string, ReturnType<typeof emptyDay>> = {};

  if (filtro === 'todos' || filtro === 'reunioes')   { activeRec.forEach(s  => { const k = fmtDate(s.date); if (!porData[k]) porData[k] = emptyDay(); porData[k].recorrentes.push(s); }); }
  if (filtro === 'todos' || filtro === 'extras')     { activeEx.forEach(e   => { if (!porData[e.data]) porData[e.data] = emptyDay(); porData[e.data].extras.push(e); }); }
  if (filtro === 'todos' || filtro === 'scans')      { activeScn.forEach(s  => { const k = fmtDate(s.date); if (!porData[k]) porData[k] = emptyDay(); porData[k].scans.push(s); }); }
  if (filtro === 'todos' || filtro === 'recheks')    { activeRck.forEach(r  => { if (!porData[r.data]) porData[r.data] = emptyDay(); porData[r.data].recheks.push(r); }); }
  if (filtro === 'todos' || filtro === 'prems')      { activePrm.forEach(p  => { if (!porData[p.data]) porData[p.data] = emptyDay(); porData[p.data].prems.push(p); }); }
  if (filtro === 'todos' || filtro === 'atividades') { activeAtv.forEach(a  => { if (!porData[a.data]) porData[a.data] = emptyDay(); porData[a.data].atividades.push(a); }); }

  const datasOrdenadas = Object.keys(porData).sort(
    viewMode === 'pendentes' ? (a, b) => b.localeCompare(a) : (a, b) => a.localeCompare(b)
  );
  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  // ── Handlers: save ────────────────────────────────────────────────────────────
  function handleSaveRecorrente() {
    if (!agCl) { showToast('Selecione o cliente'); return; }
    addAgenda({ clienteId: agCl, ocorrencia: agOcorr as any, diaSemana: agDia as any, hora: agHora, obs: agObs });
    setShowForm(false); setAgCl(''); setAgObs(''); showToast('Agenda adicionada ✓');
  }
  function handleSaveExtra() {
    if (!exCl || !exData) { showToast('Preencha cliente e data'); return; }
    addAgendaExtra({ clienteId: exCl, data: exData, hora: exHora, duracao: `${exDurH.padStart(2,'0')}:${exDurM.padStart(2,'0')}`, descricao: exDesc });
    setShowForm(false); setExCl(''); setExData(''); setExDesc(''); showToast('Extra adicionado ✓');
  }
  function handleSaveScan() {
    if (!scCl) { showToast('Selecione o cliente'); return; }
    addScan({ clienteId: scCl, ocorrencia: scOcorr as any, diaSemana: scDia as any, hora: scHora, obs: scObs });
    setShowForm(false); setScCl(''); setScObs(''); showToast('Scan adicionado ✓');
  }
  function handleSaveRecheck() {
    if (!rcCl || !rcData) { showToast('Preencha cliente e data'); return; }
    addRecheck({ clienteId: rcCl, data: rcData, hora: rcHora, duracao: `${rcDurH.padStart(2,'0')}:${rcDurM.padStart(2,'0')}`, descricao: rcDesc });
    setShowForm(false); setRcCl(''); setRcData(''); setRcDesc(''); showToast('Recheck adicionado ✓');
  }
  function handleSavePrem() {
    if (!prCl || !prData) { showToast('Preencha cliente e data'); return; }
    addPrem({ clienteId: prCl, data: prData, hora: prHora, duracao: `${prDurH.padStart(2,'0')}:${prDurM.padStart(2,'0')}`, descricao: prDesc });
    setShowForm(false); setPrCl(''); setPrData(''); setPrDesc(''); showToast('PREM adicionado ✓');
  }
  function handleSaveAtividade() {
    if (!atCl || !atData) { showToast('Preencha cliente e data'); return; }
    addAtividade({ clienteId: atCl, data: atData, hora: atHora, duracao: `${atDurH.padStart(2,'0')}:${atDurM.padStart(2,'0')}`, descricao: atDesc });
    setShowForm(false); setAtCl(''); setAtData(''); setAtDesc(''); showToast('Atividade adicionada ✓');
  }
  function handleSaveMotivo() {
    if (!motivoKey) return;
    if      (motivoTipo === 'recorrente') { const [agId, dt] = motivoKey.split('_'); setOcorrencia(agId, dt, 'nao', motivoTxt); }
    else if (motivoTipo === 'extra')      { setAgendaExtraStatus(motivoKey, 'nao', motivoTxt); }
    else if (motivoTipo === 'scan')       { const [scanId, dt] = motivoKey.split('_'); setScanStatus(scanId, dt, 'nao', motivoTxt); }
    else if (motivoTipo === 'recheck')    { setRechekStatus(motivoKey, 'nao', motivoTxt); }
    else if (motivoTipo === 'prem')       { setPremStatus(motivoKey, 'nao', motivoTxt); }
    else                                  { setAtividadeStatus(motivoKey, 'nao', motivoTxt); }
    setMotivoKey(null); setMotivoTxt(''); showToast('Motivo salvo');
  }

  // ── Estilos reutilizáveis ─────────────────────────────────────────────────────
  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, marginBottom: 10, background: 'white', outline: 'none' };
  const diasScan = [{v:1,l:'Segunda'},{v:2,l:'Terça'},{v:3,l:'Quarta'},{v:4,l:'Quinta'},{v:5,l:'Sexta'},{v:6,l:'Sábado'},{v:7,l:'Domingo'}];

  const tag = (label: string, color: string, bgAlpha = 0.1) => (
    <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', background: color === 'var(--cyan)' ? 'var(--cyan-soft)' : `${color}1a`, color, border: `1px solid ${color}33` }}>{label}</span>
  );

  const durInput = (h: string, setH: (v:string)=>void, m: string, setM: (v:string)=>void) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
      <input type="number" min="0" max="23" value={h} onChange={e => setH(e.target.value.padStart(2,'0'))} style={{ width:70, padding:'9px 12px', border:'1px solid var(--border)', borderRadius:5, fontFamily:'inherit', fontSize:12, background:'white', textAlign:'center', outline:'none' }} />
      <span style={{ fontWeight:800, color:'var(--muted)', fontSize:13 }}>h</span>
      <input type="number" min="0" max="59" step="5" value={m} onChange={e => setM(e.target.value.padStart(2,'0'))} style={{ width:70, padding:'9px 12px', border:'1px solid var(--border)', borderRadius:5, fontFamily:'inherit', fontSize:12, background:'white', textAlign:'center', outline:'none' }} />
      <span style={{ fontWeight:800, color:'var(--muted)', fontSize:13 }}>min</span>
    </div>
  );

  const oneTimeForm = (cl: string, setCl: (v:string)=>void, data: string, setData: (v:string)=>void, hora: string, setHora: (v:string)=>void, durH: string, setDurH: (v:string)=>void, durM: string, setDurM: (v:string)=>void, desc: string, setDesc: (v:string)=>void, onSave: ()=>void, btnLabel: string, btnColor: string) => (
    <>
      <select value={cl} onChange={e => setCl(e.target.value)} style={inp as any}><option value="">Cliente...</option>{state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ ...inp, flex:1, marginBottom:0 } as any} />
        <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...inp, flex:1, marginBottom:0 } as any} />
      </div>
      {durInput(durH, setDurH, durM, setDurM)}
      <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (opcional)" style={inp as any} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onSave} style={{ background: btnColor, color: 'white', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>{btnLabel}</button>
        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
      </div>
    </>
  );

  const oneTimeRow = (
    ev: { id: string; clienteId: string; hora: string; status: string; motivo: string; descricao?: string; duracao?: string },
    tipo: MotivoTipo, tagEl: React.ReactElement, horaColor: string,
    onConfirm: ()=>void, onNao: ()=>void, onDel: ()=>void,
  ) => {
    const c = state.clientes.find(x => x.id === ev.clienteId); if (!c) return null;
    const bgMap: Record<string, string> = { ocorreu: 'white', nao: '#fff5f5', '': tipo === 'extra' ? '#fff8f5' : tipo === 'scan' ? '#fffaf0' : tipo === 'recheck' ? '#faf5ff' : tipo === 'prem' ? '#f0fdf4' : '#eff6ff' };
    const bg = bgMap[ev.status] ?? bgMap[''];
    return (
      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12, background: bg }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: horaColor, flexShrink: 0, width: 42 }}>{ev.hora}</div>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{c.nome} {tagEl}</div>
          {ev.descricao && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{ev.descricao}</div>}
          {ev.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {ev.motivo}</div>}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={onConfirm} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: ev.status === 'ocorreu' ? 'var(--success)' : 'none', color: ev.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
          <button onClick={onNao} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: ev.status === 'nao' ? 'var(--danger)' : 'none', color: ev.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
          <button onClick={onDel} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>🗑</button>
        </div>
      </div>
    );
  };

  const filtros: { id: FiltroTipo; label: string; color: string }[] = [
    { id: 'todos',      label: 'Todos',      color: 'var(--muted)'  },
    { id: 'reunioes',   label: 'Reuniões',   color: COR.reuniao     },
    { id: 'extras',     label: 'Extras',     color: COR.extra       },
    { id: 'scans',      label: 'Scans',      color: COR.scan        },
    { id: 'recheks',    label: 'Recheks',    color: COR.recheck     },
    { id: 'prems',      label: 'PREM',       color: COR.prem        },
    { id: 'atividades', label: 'Atividades', color: COR.atividade   },
  ];

  const motivoColor    = COR[motivoTipo] ?? 'var(--cyan)';
  const motivoColorDim = motivoTipo === 'recorrente' ? 'var(--cyan-dim)' : motivoColor;
  const motivoBtnStyle: React.CSSProperties = { background: motivoColor, color: motivoTipo === 'recorrente' ? 'var(--dark)' : 'white', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase', width: '100%' };

  const tabDefs: [FormTab, string, string][] = [
    ['recorrente', '⟳ Reunião',   COR.reuniao   ],
    ['extra',      '+ Extra',     COR.extra      ],
    ['scan',       '🔍 Scan',     COR.scan       ],
    ['recheck',    '↺ Recheck',   COR.recheck    ],
    ['prem',       '📋 PREM',     COR.prem       ],
    ['atividade',  '⚡ Atividade', COR.atividade  ],
  ];

  return (
    <>
      <div>
        {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: viewMode === 'pendentes' ? '#b45309' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 14, height: 2, background: viewMode === 'pendentes' ? '#f59e0b' : 'var(--cyan)', borderRadius: 1 }} />
            {viewMode === 'pendentes' ? '⚠ Pendentes de confirmação' : 'Próximas 8 semanas'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setViewMode(v => v === 'pendentes' ? 'proximas' : 'pendentes')}
              style={{ background: viewMode === 'pendentes' ? '#f59e0b' : totalPend > 0 ? '#fef3c7' : 'white', border: `1.5px solid ${totalPend > 0 || viewMode === 'pendentes' ? '#f59e0b' : 'var(--border)'}`, borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: viewMode === 'pendentes' ? '#78350f' : totalPend > 0 ? '#92400e' : 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}
            >⚠ {totalPend > 0 ? `Pendentes (${totalPend})` : 'Pendentes'}</button>
            <button onClick={() => setShowForm(f => !f)} style={{ background: 'none', border: '1.5px solid var(--cyan-dim)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: 'var(--cyan-dim)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}>+ Adicionar</button>
          </div>
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {filtros.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', cursor: 'pointer', border: `1.5px solid ${filtro === f.id ? f.color : 'var(--border)'}`, background: filtro === f.id ? `${f.color}18` : 'white', color: filtro === f.id ? f.color : 'var(--muted)', transition: 'all .15s' }}>{f.label}</button>
          ))}
        </div>

        {/* ── Formulário ───────────────────────────────────────────────────────── */}
        {showForm && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            {/* Tabs 3×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {tabDefs.map(([tab, label, color]) => (
                <button key={tab} onClick={() => setFormTab(tab)} style={{ padding: '9px 4px', fontFamily: 'inherit', fontWeight: 800, fontSize: 10, letterSpacing: .8, textTransform: 'uppercase', cursor: 'pointer', border: 'none', borderBottom: '1px solid var(--border)', background: formTab === tab ? 'var(--dark)' : 'white', color: formTab === tab ? color : 'var(--muted)' }}>{label}</button>
              ))}
            </div>

            {/* Recorrente */}
            {formTab === 'recorrente' && (
              <>
                <select value={agCl} onChange={e => setAgCl(e.target.value)} style={inp as any}><option value="">Cliente...</option>{state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select value={agOcorr} onChange={e => setAgOcorr(Number(e.target.value))} style={{ ...inp, flex:1, marginBottom:0 } as any}>{[1,2,3,4].map(n => <option key={n} value={n}>{OCORR[n]} do mês</option>)}</select>
                  <select value={agDia} onChange={e => setAgDia(Number(e.target.value))} style={{ ...inp, flex:1, marginBottom:0 } as any}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{DIAS[n]}</option>)}</select>
                </div>
                <input type="time" value={agHora} onChange={e => setAgHora(e.target.value)} style={inp as any} />
                <input type="text" value={agObs} onChange={e => setAgObs(e.target.value)} placeholder="Observação (opcional)" style={inp as any} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveRecorrente} style={{ background: COR.reuniao, color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar</button>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
                </div>
              </>
            )}

            {/* Scan */}
            {formTab === 'scan' && (
              <>
                <select value={scCl} onChange={e => setScCl(e.target.value)} style={inp as any}><option value="">Cliente...</option>{state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <select value={scOcorr} onChange={e => setScOcorr(Number(e.target.value))} style={{ ...inp, flex:1, marginBottom:0 } as any}>{[1,2,3,4].map(n => <option key={n} value={n}>{OCORR[n]} do mês</option>)}</select>
                  <select value={scDia} onChange={e => setScDia(Number(e.target.value))} style={{ ...inp, flex:1, marginBottom:0 } as any}>{diasScan.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}</select>
                </div>
                <input type="time" value={scHora} onChange={e => setScHora(e.target.value)} style={inp as any} />
                <input type="text" value={scObs} onChange={e => setScObs(e.target.value)} placeholder="Observação (opcional)" style={inp as any} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveScan} style={{ background: COR.scan, color: 'white', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar Scan</button>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
                </div>
              </>
            )}

            {/* Extra */}
            {formTab === 'extra'     && oneTimeForm(exCl, setExCl, exData, setExData, exHora, setExHora, exDurH, setExDurH, exDurM, setExDurM, exDesc, setExDesc, handleSaveExtra,     'Salvar Extra',     COR.extra    )}
            {/* Recheck */}
            {formTab === 'recheck'   && oneTimeForm(rcCl, setRcCl, rcData, setRcData, rcHora, setRcHora, rcDurH, setRcDurH, rcDurM, setRcDurM, rcDesc, setRcDesc, handleSaveRecheck,   'Salvar Recheck',   COR.recheck  )}
            {/* PREM */}
            {formTab === 'prem'      && oneTimeForm(prCl, setPrCl, prData, setPrData, prHora, setPrHora, prDurH, setPrDurH, prDurM, setPrDurM, prDesc, setPrDesc, handleSavePrem,      'Salvar PREM',      COR.prem     )}
            {/* Atividade */}
            {formTab === 'atividade' && oneTimeForm(atCl, setAtCl, atData, setAtData, atHora, setAtHora, atDurH, setAtDurH, atDurM, setAtDurM, atDesc, setAtDesc, handleSaveAtividade, 'Salvar Atividade', COR.atividade)}
          </div>
        )}

        {/* ── Lista ────────────────────────────────────────────────────────────── */}
        {datasOrdenadas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
            {viewMode === 'pendentes' ? 'Nenhum item pendente de confirmação nos últimos 2 meses.' : filtro === 'todos' ? 'Nenhuma agenda. Clique em + Adicionar.' : `Nenhum(a) ${filtro} nos próximos 2 meses.`}
          </div>
        ) : (
          datasOrdenadas.map(dt => {
            const { recorrentes, extras, scans: scansNoDia, recheks: recheksNoDia, prems: premsNoDia, atividades: atividadesNoDia } = porData[dt];
            const total = recorrentes.length + extras.length + scansNoDia.length + recheksNoDia.length + premsNoDia.length + atividadesNoDia.length;
            const d = new Date(dt + 'T12:00:00');
            return (
              <div key={dt} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(35,31,32,.06)' }}>
                {/* Header do dia */}
                <div style={{ background: viewMode === 'pendentes' ? '#431407' : 'var(--dark)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: viewMode === 'pendentes' ? '#f59e0b' : 'var(--cyan)', color: 'var(--dark)', borderRadius: 5, padding: '4px 10px', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{fmtBR(dt)}</div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.7)', flex: 1 }}>{diasCurtos[d.getDay()]} · {total} item{total > 1 ? 'ns' : ''}{viewMode === 'pendentes' ? ' · ⚠ não confirmado' : ''}</div>
                </div>

                {/* Reuniões recorrentes */}
                {recorrentes.map(s => {
                  const c = state.clientes.find(x => x.id === s.clienteId); if (!c) return null;
                  const key = `${s.agendaId}_${fmtDate(s.date)}`;
                  const oc  = state.ocorrencias[key] || {};
                  const bg  = oc.status === 'ocorreu' ? 'white' : oc.status === 'nao' ? '#fff5f5' : 'var(--ivory2)';
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12, background: bg }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cyan-dim)', flexShrink: 0, width: 42 }}>{s.hora}</div>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{c.nome} {tag('Reunião', COR.reuniao)}</div>
                        {oc.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {oc.motivo}</div>}
                        {s.obs && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.obs}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => { setOcorrencia(s.agendaId, fmtDate(s.date), 'ocorreu'); showToast('Marcada ✓'); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: oc.status === 'ocorreu' ? 'var(--success)' : 'none', color: oc.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
                        <button onClick={() => { setMotivoKey(key); setMotivoTipo('recorrente'); setMotivoTxt(oc.motivo || ''); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: oc.status === 'nao' ? 'var(--danger)' : 'none', color: oc.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
                        <button onClick={() => setConfirm({ titulo: 'Remover recorrência', mensagem: `Remover a recorrência de ${c.nome}?`, onOk: () => { delAgenda(s.agendaId); showToast('Removida'); } })} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>🗑</button>
                      </div>
                    </div>
                  );
                })}

                {/* Extras */}
                {extras.map(e => oneTimeRow(
                  e, 'extra', tag(`Extra${e.duracao ? ' · ' + e.duracao : ''}`, COR.extra), 'var(--cyan-dim)',
                  () => { setAgendaExtraStatus(e.id, 'ocorreu', ''); showToast('Marcada ✓'); },
                  () => { setMotivoKey(e.id); setMotivoTipo('extra'); setMotivoTxt(e.motivo || ''); },
                  () => setConfirm({ titulo: 'Remover extra', mensagem: `Remover agenda extra?`, onOk: () => { delAgendaExtra(e.id); showToast('Removida'); } }),
                ))}

                {/* Scans */}
                {scansNoDia.map(s => {
                  const c   = state.clientes.find(x => x.id === s.clienteId); if (!c) return null;
                  const key = `${s.scanId}_${fmtDate(s.date)}`;
                  const oc  = state.scanOcorrencias[key] || {};
                  const bg  = oc.status === 'ocorreu' ? 'white' : oc.status === 'nao' ? '#fff5f5' : '#fffaf0';
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12, background: bg }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: COR.scan, flexShrink: 0, width: 42 }}>{s.hora}</div>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{c.nome} {tag('Scan', COR.scan)}</div>
                        {oc.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {oc.motivo}</div>}
                        {s.obs && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.obs}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => { setScanStatus(s.scanId, fmtDate(s.date), 'ocorreu'); showToast('Scan executado ✓'); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: oc.status === 'ocorreu' ? 'var(--success)' : 'none', color: oc.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
                        <button onClick={() => { setMotivoKey(key); setMotivoTipo('scan'); setMotivoTxt((oc as any).motivo || ''); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: oc.status === 'nao' ? 'var(--danger)' : 'none', color: oc.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
                        <button onClick={() => setConfirm({ titulo: 'Remover scan', mensagem: `Remover scan de ${c.nome}?`, onOk: () => { delScan(s.scanId); showToast('Removido'); } })} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>🗑</button>
                      </div>
                    </div>
                  );
                })}

                {/* Recheks */}
                {recheksNoDia.map(r => oneTimeRow(
                  r, 'recheck', tag(`Recheck${r.duracao ? ' · ' + r.duracao : ''}`, COR.recheck), COR.recheck,
                  () => { setRechekStatus(r.id, 'ocorreu', ''); showToast('Recheck executado ✓'); },
                  () => { setMotivoKey(r.id); setMotivoTipo('recheck'); setMotivoTxt(r.motivo || ''); },
                  () => setConfirm({ titulo: 'Remover recheck', mensagem: `Remover recheck?`, onOk: () => { delRecheck(r.id); showToast('Removido'); } }),
                ))}

                {/* PREMs */}
                {premsNoDia.map(p => oneTimeRow(
                  p, 'prem', tag(`PREM${p.duracao ? ' · ' + p.duracao : ''}`, COR.prem), COR.prem,
                  () => { setPremStatus(p.id, 'ocorreu', ''); showToast('PREM registrado ✓'); },
                  () => { setMotivoKey(p.id); setMotivoTipo('prem'); setMotivoTxt(p.motivo || ''); },
                  () => setConfirm({ titulo: 'Remover PREM', mensagem: `Remover PREM?`, onOk: () => { delPrem(p.id); showToast('Removido'); } }),
                ))}

                {/* Atividades */}
                {atividadesNoDia.map(a => oneTimeRow(
                  a, 'atividade', tag(`Atividade${a.duracao ? ' · ' + a.duracao : ''}`, COR.atividade), COR.atividade,
                  () => { setAtividadeStatus(a.id, 'ocorreu', ''); showToast('Atividade registrada ✓'); },
                  () => { setMotivoKey(a.id); setMotivoTipo('atividade'); setMotivoTxt(a.motivo || ''); },
                  () => setConfirm({ titulo: 'Remover atividade', mensagem: `Remover atividade?`, onOk: () => { delAtividade(a.id); showToast('Removida'); } }),
                ))}
              </div>
            );
          })
        )}

        {/* ── Modal motivo ──────────────────────────────────────────────────────── */}
        {motivoKey && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }} onClick={e => { if (e.target === e.currentTarget) setMotivoKey(null); }}>
            <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, borderTop: `2.5px solid ${motivoColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>Motivo <span style={{ color: motivoColorDim }}>Não Ocorreu</span></div>
                <button onClick={() => setMotivoKey(null)} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
              </div>
              <textarea rows={3} value={motivoTxt} onChange={e => setMotivoTxt(e.target.value)} placeholder="Ex: sistema indisponível, cliente cancelou..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12, resize: 'none' }} />
              <button onClick={handleSaveMotivo} style={motivoBtnStyle}>Salvar</button>
            </div>
          </div>
        )}
      </div>

      {/* ── ModalConfirm ─────────────────────────────────────────────────────────── */}
      {confirm && (
        <ModalConfirm
          open={true}
          titulo={confirm.titulo}
          mensagem={confirm.mensagem}
          onConfirm={() => { confirm.onOk(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
