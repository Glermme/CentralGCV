'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { fmtBR, fmtDate, DIAS, OCORR } from '@/lib/store';
import { getAgendaSlots, ocorrenciaKey } from '@/lib/agenda';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function Agenda({ store, showToast }: Props) {
  const { state, setOcorrencia, addAgenda } = store;
  const [showForm,  setShowForm]  = useState(false);
  const [motivoKey, setMotivoKey] = useState<string | null>(null);
  const [motivoTxt, setMotivoTxt] = useState('');

  // Form nova recorrência
  const [agCl,    setAgCl]    = useState('');
  const [agOcorr, setAgOcorr] = useState(2);
  const [agDia,   setAgDia]   = useState(2);
  const [agHora,  setAgHora]  = useState('14:00');
  const [agObs,   setAgObs]   = useState('');

  const hoje = new Date();
  const em8  = new Date(hoje); em8.setDate(hoje.getDate() + 56);
  const slots = getAgendaSlots(state.agendas, hoje, em8)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.hora.localeCompare(b.hora));

  const porData: Record<string, typeof slots> = {};
  slots.forEach(s => {
    const k = fmtDate(s.date);
    if (!porData[k]) porData[k] = [];
    porData[k].push(s);
  });

  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  function handleSaveRecorrencia() {
    if (!agCl) { showToast('Selecione o cliente'); return; }
    addAgenda({ clienteId: agCl, ocorrencia: agOcorr as any, diaSemana: agDia as any, hora: agHora, obs: agObs });
    setShowForm(false);
    setAgCl(''); setAgObs('');
    showToast('Agenda adicionada ✓');
  }

  function handleSaveMotivo() {
    if (!motivoKey) return;
    const [agId, dt] = motivoKey.split('_');
    setOcorrencia(agId, dt, 'nao', motivoTxt);
    setMotivoKey(null); setMotivoTxt('');
    showToast('Motivo salvo');
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
          Próximas 8 semanas
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{ background: 'none', border: '1.5px solid var(--cyan-dim)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: 'var(--cyan-dim)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}
        >+ Recorrência</button>
      </div>

      {/* Form nova recorrência */}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Nova Recorrência</div>
          <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Cliente</label>
          <select value={agCl} onChange={e => setAgCl(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, marginBottom: 10, background: 'white' }}>
            <option value="">Selecione...</option>
            {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Ocorrência</label>
              <select value={agOcorr} onChange={e => setAgOcorr(Number(e.target.value))} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, background: 'white' }}>
                {[1,2,3,4].map(n => <option key={n} value={n}>{OCORR[n]} do mês</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Dia da semana</label>
              <select value={agDia} onChange={e => setAgDia(Number(e.target.value))} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, background: 'white' }}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{DIAS[n]}-feira</option>)}
              </select>
            </div>
          </div>
          <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Horário</label>
          <input type="time" value={agHora} onChange={e => setAgHora(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, marginBottom: 10, background: 'white' }} />
          <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Observação (opcional)</label>
          <input type="text" value={agObs} onChange={e => setAgObs(e.target.value)} placeholder="Ex: revisão mensal de segurança" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, marginBottom: 12, background: 'white' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveRecorrencia} style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Slots */}
      {slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
          Nenhuma agenda recorrente cadastrada.<br />
          Clique em <strong>+ Recorrência</strong> para adicionar.
        </div>
      ) : (
        Object.entries(porData).map(([dt, ss]) => {
          const diaNome = diasCurtos[new Date(dt + 'T12:00:00').getDay()];
          return (
            <div key={dt} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(35,31,32,.06)' }}>
              <div style={{ background: 'var(--dark)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'var(--cyan)', color: 'var(--dark)', borderRadius: 5, padding: '4px 10px', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{fmtBR(dt)}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.7)', flex: 1 }}>{diaNome} · {ss.length} reunião{ss.length > 1 ? 'ões' : ''}</div>
              </div>

              {ss.map(s => {
                const c   = state.clientes.find(x => x.id === s.clienteId);
                if (!c) return null;
                const key = `${s.agendaId}_${fmtDate(s.date)}`;
                const oc  = state.ocorrencias[key] || {};
                const bg  = oc.status === 'ocorreu' ? 'white' : oc.status === 'nao' ? '#fff5f5' : 'var(--ivory2)';

                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 12, background: bg }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cyan-dim)', flexShrink: 0, width: 42 }}>{s.hora}</div>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {c.nome}
                        {c.empresa && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>{c.empresa}</span>}
                      </div>
                      {oc.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {oc.motivo}</div>}
                      {s.obs     && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.obs}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => { setOcorrencia(s.agendaId, fmtDate(s.date), 'ocorreu'); showToast('Reunião marcada como ocorrida ✓'); }}
                        style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: `1.5px solid var(--success)`, background: oc.status === 'ocorreu' ? 'var(--success)' : 'none', color: oc.status === 'ocorreu' ? 'white' : 'var(--success)' }}
                      >✓</button>
                      <button
                        onClick={() => { setMotivoKey(key); setMotivoTxt(oc.motivo || ''); }}
                        style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: `1.5px solid var(--danger)`, background: oc.status === 'nao' ? 'var(--danger)' : 'none', color: oc.status === 'nao' ? 'white' : 'var(--danger)' }}
                      >✗</button>
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
          <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, borderTop: '2.5px solid var(--cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Motivo <span style={{ color: 'var(--cyan-dim)' }}>Não Ocorreu</span></div>
              <button onClick={() => setMotivoKey(null)} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
            </div>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Qual o motivo?</label>
            <textarea rows={3} value={motivoTxt} onChange={e => setMotivoTxt(e.target.value)} placeholder="Ex: cliente cancelou, reagendado..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12, resize: 'none' }} />
            <button onClick={handleSaveMotivo} style={{ width: '100%', background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
