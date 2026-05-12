'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { fmtBR, fmtDate, DIAS, OCORR } from '@/lib/store';
import { getAgendaSlots, getScanSlots } from '@/lib/agenda';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

type FormTab   = 'recorrente' | 'extra' | 'scan';
type FiltroTipo = 'todos' | 'reunioes' | 'extras' | 'scans';

export default function Agenda({ store, showToast }: Props) {
  const { state, setOcorrencia, addAgenda, delAgenda, addAgendaExtra, delAgendaExtra, setAgendaExtraStatus, addScan, delScan, setScanStatus } = store;

  const [showForm,   setShowForm]   = useState(false);
  const [formTab,    setFormTab]    = useState<FormTab>('recorrente');
  const [filtro,     setFiltro]     = useState<FiltroTipo>('todos');
  const [motivoKey,  setMotivoKey]  = useState<string | null>(null);
  const [motivoTipo, setMotivoTipo] = useState<'recorrente' | 'extra' | 'scan'>('recorrente');
  const [motivoTxt,  setMotivoTxt]  = useState('');

  // Forms
  const [agCl, setAgCl] = useState(''); const [agOcorr, setAgOcorr] = useState(2); const [agDia, setAgDia] = useState(2); const [agHora, setAgHora] = useState('14:00'); const [agObs, setAgObs] = useState('');
  const [exCl, setExCl] = useState(''); const [exData, setExData] = useState(''); const [exHora, setExHora] = useState('14:00'); const [exDurH, setExDurH] = useState('01'); const [exDurM, setExDurM] = useState('00'); const [exDesc, setExDesc] = useState('');
  const [scCl, setScCl] = useState(''); const [scOcorr, setScOcorr] = useState(1); const [scDia, setScDia] = useState(6); const [scHora, setScHora] = useState('10:00'); const [scObs, setScObs] = useState('');

  const hoje = new Date();
  const em8  = new Date(hoje); em8.setDate(hoje.getDate() + 56);

  const slots     = getAgendaSlots(state.agendas, hoje, em8).sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));
  const scanSlots = getScanSlots(state.scans, hoje, em8).sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));
  const extrasNoPeriodo = state.agendasExtras.filter(e => e.data >= fmtDate(hoje) && e.data <= fmtDate(em8)).sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  // Agrupa por data respeitando o filtro
  const porData: Record<string, {
    recorrentes: typeof slots;
    extras: typeof extrasNoPeriodo;
    scans: typeof scanSlots;
  }> = {};

  if (filtro === 'todos' || filtro === 'reunioes') {
    slots.forEach(s => { const k = fmtDate(s.date); if (!porData[k]) porData[k] = { recorrentes: [], extras: [], scans: [] }; porData[k].recorrentes.push(s); });
  }
  if (filtro === 'todos' || filtro === 'extras') {
    extrasNoPeriodo.forEach(e => { if (!porData[e.data]) porData[e.data] = { recorrentes: [], extras: [], scans: [] }; porData[e.data].extras.push(e); });
  }
  if (filtro === 'todos' || filtro === 'scans') {
    scanSlots.forEach(s => { const k = fmtDate(s.date); if (!porData[k]) porData[k] = { recorrentes: [], extras: [], scans: [] }; porData[k].scans.push(s); });
  }

  const datasOrdenadas = Object.keys(porData).sort();
  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  function handleSaveRecorrente() {
    if (!agCl) { showToast('Selecione o cliente'); return; }
    addAgenda({ clienteId: agCl, ocorrencia: agOcorr as any, diaSemana: agDia as any, hora: agHora, obs: agObs });
    setShowForm(false); setAgCl(''); setAgObs(''); showToast('Agenda adicionada ✓');
  }
  function handleSaveExtra() {
    if (!exCl || !exData) { showToast('Preencha cliente e data'); return; }
    addAgendaExtra({ clienteId: exCl, data: exData, hora: exHora, duracao: `${exDurH.padStart(2,'0')}:${exDurM.padStart(2,'0')}`, descricao: exDesc });
    setShowForm(false); setExCl(''); setExData(''); setExDesc(''); showToast('Agenda extra adicionada ✓');
  }
  function handleSaveScan() {
    if (!scCl) { showToast('Selecione o cliente'); return; }
    addScan({ clienteId: scCl, ocorrencia: scOcorr as any, diaSemana: scDia as any, hora: scHora, obs: scObs });
    setShowForm(false); setScCl(''); setScObs(''); showToast('Scan adicionado ✓');
  }
  function handleSaveMotivo() {
    if (!motivoKey) return;
    if (motivoTipo === 'recorrente') { const [agId, dt] = motivoKey.split('_'); setOcorrencia(agId, dt, 'nao', motivoTxt); }
    else if (motivoTipo === 'extra') { setAgendaExtraStatus(motivoKey, 'nao', motivoTxt); }
    else { const [scanId, dt] = motivoKey.split('_'); setScanStatus(scanId, dt, 'nao', motivoTxt); }
    setMotivoKey(null); setMotivoTxt(''); showToast('Motivo salvo');
  }

  const tagRecorrente = <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', background: 'var(--cyan-soft)', color: 'var(--cyan)', border: '1px solid rgba(13,219,255,.3)' }}>Reunião</span>;
  const tagExtra = (dur?: string) => <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', background: 'rgba(232,48,48,.1)', color: 'var(--danger)', border: '1px solid rgba(232,48,48,.2)' }}>Extra{dur ? ` · ${dur}` : ''}</span>;
  const tagScan = <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', background: 'rgba(232,131,10,.1)', color: 'var(--warn)', border: '1px solid rgba(232,131,10,.2)' }}>Scan</span>;
  const inp = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, marginBottom: 10, background: 'white', outline: 'none' };
  const diasScan = [{ v:1,l:'Segunda'},{v:2,l:'Terça'},{v:3,l:'Quarta'},{v:4,l:'Quinta'},{v:5,l:'Sexta'},{v:6,l:'Sábado'},{v:7,l:'Domingo'}];

  const filtros: { id: FiltroTipo; label: string; color: string }[] = [
    { id: 'todos',    label: 'Todos',    color: 'var(--muted)'    },
    { id: 'reunioes', label: 'Reuniões', color: 'var(--cyan)'     },
    { id: 'extras',   label: 'Extras',   color: 'var(--danger)'   },
    { id: 'scans',    label: 'Scans',    color: 'var(--warn)'     },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
          Próximas 8 semanas
        </div>
        <button onClick={() => setShowForm(f => !f)} style={{ background: 'none', border: '1.5px solid var(--cyan-dim)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: 'var(--cyan-dim)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}>+ Adicionar</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filtros.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 10, fontFamily: 'inherit',
              fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', cursor: 'pointer',
              border: `1.5px solid ${filtro === f.id ? f.color : 'var(--border)'}`,
              background: filtro === f.id ? `${f.color}18` : 'white',
              color: filtro === f.id ? f.color : 'var(--muted)',
              transition: 'all .15s',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            {([['recorrente','⟳ Reunião','var(--cyan)'],['extra','+ Extra','var(--danger)'],['scan','🔍 Scan','var(--warn)']] as [FormTab,string,string][]).map(([tab,label,color]) => (
              <button key={tab} onClick={() => setFormTab(tab)} style={{ flex: 1, padding: '8px', fontFamily: 'inherit', fontWeight: 800, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: formTab === tab ? 'var(--dark)' : 'white', color: formTab === tab ? color : 'var(--muted)' }}>{label}</button>
            ))}
          </div>

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
                <button onClick={handleSaveRecorrente} style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar</button>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
              </div>
            </>
          )}

          {formTab === 'extra' && (
            <>
              <select value={exCl} onChange={e => setExCl(e.target.value)} style={inp as any}><option value="">Cliente...</option>{state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="date" value={exData} onChange={e => setExData(e.target.value)} style={{ ...inp, flex:1, marginBottom:0 } as any} />
                <input type="time" value={exHora} onChange={e => setExHora(e.target.value)} style={{ ...inp, flex:1, marginBottom:0 } as any} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <input type="number" min="0" max="23" value={exDurH} onChange={e => setExDurH(e.target.value.padStart(2,'0'))} style={{ width:70, padding:'9px 12px', border:'1px solid var(--border)', borderRadius:5, fontFamily:'inherit', fontSize:12, background:'white', textAlign:'center', outline:'none' }} />
                <span style={{ fontWeight:800, color:'var(--muted)', fontSize:13 }}>h</span>
                <input type="number" min="0" max="59" step="5" value={exDurM} onChange={e => setExDurM(e.target.value.padStart(2,'0'))} style={{ width:70, padding:'9px 12px', border:'1px solid var(--border)', borderRadius:5, fontFamily:'inherit', fontSize:12, background:'white', textAlign:'center', outline:'none' }} />
                <span style={{ fontWeight:800, color:'var(--muted)', fontSize:13 }}>min</span>
              </div>
              <input type="text" value={exDesc} onChange={e => setExDesc(e.target.value)} placeholder="Descrição (opcional)" style={inp as any} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveExtra} style={{ background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar Extra</button>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
              </div>
            </>
          )}

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
                <button onClick={handleSaveScan} style={{ background: 'var(--warn)', color: 'white', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar Scan</button>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lista unificada */}
      {datasOrdenadas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
          {filtro === 'todos' ? 'Nenhuma agenda. Clique em + Adicionar.' : `Nenhum(a) ${filtro === 'reunioes' ? 'reunião' : filtro === 'extras' ? 'agenda extra' : 'scan'} nos próximos 2 meses.`}
        </div>
      ) : (
        datasOrdenadas.map(dt => {
          const { recorrentes, extras, scans: scansNoDia } = porData[dt];
          const total = recorrentes.length + extras.length + scansNoDia.length;
          const d = new Date(dt + 'T12:00:00');

          return (
            <div key={dt} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(35,31,32,.06)' }}>
              <div style={{ background: 'var(--dark)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--cyan)', color: 'var(--dark)', borderRadius: 5, padding: '4px 10px', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{fmtBR(dt)}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.7)', flex: 1 }}>{diasCurtos[d.getDay()]} · {total} item{total > 1 ? 'ns' : ''}</div>
              </div>

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
                      <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{c.nome} {tagRecorrente}</div>
                      {oc.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {oc.motivo}</div>}
                      {s.obs && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.obs}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => { setOcorrencia(s.agendaId, fmtDate(s.date), 'ocorreu'); showToast('Marcada ✓'); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: oc.status === 'ocorreu' ? 'var(--success)' : 'none', color: oc.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
                      <button onClick={() => { setMotivoKey(key); setMotivoTipo('recorrente'); setMotivoTxt(oc.motivo || ''); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: oc.status === 'nao' ? 'var(--danger)' : 'none', color: oc.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
                      <button onClick={() => { if (confirm('Remover recorrência?')) { delAgenda(s.agendaId); showToast('Removida'); } }} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>🗑</button>
                    </div>
                  </div>
                );
              })}

              {extras.map(e => {
                const c = state.clientes.find(x => x.id === e.clienteId); if (!c) return null;
                const bg = e.status === 'ocorreu' ? 'white' : e.status === 'nao' ? '#fff5f5' : '#fff8f5';
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12, background: bg }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cyan-dim)', flexShrink: 0, width: 42 }}>{e.hora}</div>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{c.nome} {tagExtra(e.duracao)}</div>
                      {e.descricao && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{e.descricao}</div>}
                      {e.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {e.motivo}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => { setAgendaExtraStatus(e.id, 'ocorreu', ''); showToast('Marcada ✓'); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: e.status === 'ocorreu' ? 'var(--success)' : 'none', color: e.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
                      <button onClick={() => { setMotivoKey(e.id); setMotivoTipo('extra'); setMotivoTxt(e.motivo || ''); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: e.status === 'nao' ? 'var(--danger)' : 'none', color: e.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
                      <button onClick={() => { if (confirm('Remover?')) { delAgendaExtra(e.id); showToast('Removida'); } }} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>🗑</button>
                    </div>
                  </div>
                );
              })}

              {scansNoDia.map(s => {
                const c   = state.clientes.find(x => x.id === s.clienteId); if (!c) return null;
                const key = `${s.scanId}_${fmtDate(s.date)}`;
                const oc  = state.scanOcorrencias[key] || {};
                const bg  = oc.status === 'ocorreu' ? 'white' : oc.status === 'nao' ? '#fff5f5' : '#fffaf0';
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12, background: bg }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--warn)', flexShrink: 0, width: 42 }}>{s.hora}</div>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{c.nome} {tagScan}</div>
                      {oc.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {oc.motivo}</div>}
                      {s.obs && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.obs}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => { setScanStatus(s.scanId, fmtDate(s.date), 'ocorreu'); showToast('Scan executado ✓'); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: oc.status === 'ocorreu' ? 'var(--success)' : 'none', color: oc.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
                      <button onClick={() => { setMotivoKey(key); setMotivoTipo('scan'); setMotivoTxt((oc as any).motivo || ''); }} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: oc.status === 'nao' ? 'var(--danger)' : 'none', color: oc.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
                      <button onClick={() => { if (confirm('Remover scan?')) { delScan(s.scanId); showToast('Removido'); } }} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Modal motivo */}
      {motivoKey && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }} onClick={e => { if (e.target === e.currentTarget) setMotivoKey(null); }}>
          <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, borderTop: `2.5px solid ${motivoTipo === 'scan' ? 'var(--warn)' : motivoTipo === 'extra' ? 'var(--danger)' : 'var(--cyan)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Motivo <span style={{ color: motivoTipo === 'scan' ? 'var(--warn)' : motivoTipo === 'extra' ? 'var(--danger)' : 'var(--cyan-dim)' }}>Não Ocorreu</span></div>
              <button onClick={() => setMotivoKey(null)} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
            </div>
            <textarea rows={3} value={motivoTxt} onChange={e => setMotivoTxt(e.target.value)} placeholder="Ex: sistema indisponível, cliente cancelou..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12, resize: 'none' }} />
            <button onClick={handleSaveMotivo} style={{ width: '100%', background: motivoTipo === 'scan' ? 'var(--warn)' : motivoTipo === 'extra' ? 'var(--danger)' : 'var(--cyan-dim)', color: motivoTipo === 'scan' || motivoTipo === 'extra' ? 'white' : 'var(--dark)', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
