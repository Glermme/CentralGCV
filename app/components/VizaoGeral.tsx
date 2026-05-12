'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { isLate, fmtBR, fmtDate, labelStatus } from '@/lib/store';
import { getAgendaSlots, getScanSlots } from '@/lib/agenda';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
  onOpenReuniao: () => void;
}

export default function VizaoGeral({ store, showToast, onOpenReuniao }: Props) {
  const { state, cycleStatus, setScanStatus } = store;
  const { tarefas, clientes } = state;

  const [reunIdx,      setReunIdx]      = useState(0);
  const [scanIdx,      setScanIdx]      = useState(0);
  const [reunOpen,     setReunOpen]     = useState(true);
  const [scanOpen,     setScanOpen]     = useState(true);
  const [motivoScan,   setMotivoScan]   = useState<{ scanId: string; data: string } | null>(null);
  const [motivoTxt,    setMotivoTxt]    = useState('');

  const pend = tarefas.filter(t => t.status !== 'concluida' && t.status !== 'cancelada');
  const late = pend.filter(t => isLate(t.prazo));
  const anda = tarefas.filter(t => t.status === 'andamento');
  const conc = tarefas.filter(t => t.status === 'concluida');

  const clientesComAbertas = clientes.filter(c => tarefas.some(t => t.clienteId === c.id && t.status !== 'concluida' && t.status !== 'cancelada')).length;
  const clientesComAtraso  = clientes.filter(c => tarefas.some(t => t.clienteId === c.id && isLate(t.prazo) && t.status !== 'concluida')).length;

  const hoje = new Date();
  const em14 = new Date(hoje); em14.setDate(hoje.getDate() + 14);

  const slots = getAgendaSlots(state.agendas, hoje, em14).sort((a, b) => a.date.getTime() - b.date.getTime());
  const porData: Record<string, typeof slots> = {};
  slots.forEach(s => { const k = fmtDate(s.date); if (!porData[k]) porData[k] = []; porData[k].push(s); });
  const datas = Object.keys(porData).sort();
  const reunIdxSafe = Math.min(reunIdx, Math.max(0, datas.length - 1));

  const scanSlots = getScanSlots(state.scans, hoje, em14).sort((a, b) => a.date.getTime() - b.date.getTime());
  const porDataScan: Record<string, typeof scanSlots> = {};
  scanSlots.forEach(s => { const k = fmtDate(s.date); if (!porDataScan[k]) porDataScan[k] = []; porDataScan[k].push(s); });
  const datasScan = Object.keys(porDataScan).sort();
  const scanIdxSafe = Math.min(scanIdx, Math.max(0, datasScan.length - 1));

  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const stats = [
    { label: 'Em Aberto',    value: pend.length, color: 'var(--warn)'    },
    { label: 'Atrasadas',    value: late.length, color: 'var(--danger)'  },
    { label: 'Em Andamento', value: anda.length, color: 'var(--cyan)'    },
    { label: 'Concluídas',   value: conc.length, color: 'var(--success)' },
  ];

  function NavBtns({ idx, setIdx, total }: { idx: number; setIdx: (n: number) => void; total: number }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}
          style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid var(--dark3)', background: 'none', color: idx === 0 ? 'var(--dark3)' : 'rgba(255,255,255,.5)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 700 }}>{idx + 1}/{total}</span>
        <button onClick={() => setIdx(Math.min(total - 1, idx + 1))} disabled={idx >= total - 1}
          style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid var(--dark3)', background: 'none', color: idx >= total - 1 ? 'var(--dark3)' : 'rgba(255,255,255,.5)', cursor: idx >= total - 1 ? 'default' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
    );
  }

  // ── Accordion genérico ──
  function AccordionHeader({ label, accent, open, onToggle, right }: { label: string; accent: string; open: boolean; onToggle: () => void; right?: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 8 : 12 }}>
        <button
          onClick={onToggle}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          <span style={{ display: 'inline-block', width: 14, height: 2, background: accent, borderRadius: 1 }} />
          <span style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
        </button>
        {right}
      </div>
    );
  }

  return (
    <div>
      {/* ── PRÓXIMAS REUNIÕES ── */}
      <AccordionHeader
        label="Próximas Reuniões"
        accent="var(--cyan)"
        open={reunOpen}
        onToggle={() => setReunOpen(o => !o)}
        right={
          <button onClick={onOpenReuniao} style={{ background: 'transparent', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', borderRadius: 5, padding: '5px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>+ Registrar</button>
        }
      />

      {reunOpen && (
        <div style={{ background: 'var(--dark)', borderRadius: 10, overflow: 'hidden', marginBottom: 12, border: '1px solid var(--dark3)' }}>
          {datas.length === 0 ? (
            <div style={{ padding: 14, color: 'rgba(255,255,255,.3)', fontSize: 12, textAlign: 'center' }}>Nenhuma agenda nos próximos 14 dias</div>
          ) : (
            <>
              <div style={{ background: 'var(--dark2)', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--dark3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>
                    {diasCurtos[new Date(datas[reunIdxSafe] + 'T12:00:00').getDay()]}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--cyan)' }}>{fmtBR(datas[reunIdxSafe])}</span>
                </div>
                {datas.length > 1 && <NavBtns idx={reunIdxSafe} setIdx={setReunIdx} total={datas.length} />}
              </div>
              {porData[datas[reunIdxSafe]]?.map(s => {
                const c = clientes.find(x => x.id === s.clienteId); if (!c) return null;
                const pTasks = tarefas.filter(t => t.clienteId === c.id && t.status !== 'concluida' && t.status !== 'cancelada');
                const atrs   = pTasks.filter(t => isLate(t.prazo));
                return (
                  <div key={s.agendaId} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--dark3)', gap: 12 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>{c.nome}</div>
                      {c.empresa && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{c.empresa}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 500 }}>{s.hora}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {atrs.length > 0 && <span className="badge b-late">⚠{atrs.length}</span>}
                      {pTasks.length > 0 ? <span className="badge b-pend">{pTasks.length}</span> : <span className="badge b-ok">✓</span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── PRÓXIMOS SCANS ── */}
      {state.scans.length > 0 && (
        <>
          <AccordionHeader
            label="Próximos Scans"
            accent="var(--warn)"
            open={scanOpen}
            onToggle={() => setScanOpen(o => !o)}
          />

          {scanOpen && (
            <div style={{ background: 'var(--dark)', borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--dark3)' }}>
              {datasScan.length === 0 ? (
                <div style={{ padding: 14, color: 'rgba(255,255,255,.3)', fontSize: 12, textAlign: 'center' }}>Nenhum scan nos próximos 14 dias</div>
              ) : (
                <>
                  <div style={{ background: 'var(--dark2)', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--dark3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>
                        {diasCurtos[new Date(datasScan[scanIdxSafe] + 'T12:00:00').getDay()]}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--warn)' }}>{fmtBR(datasScan[scanIdxSafe])}</span>
                    </div>
                    {datasScan.length > 1 && <NavBtns idx={scanIdxSafe} setIdx={setScanIdx} total={datasScan.length} />}
                  </div>
                  {porDataScan[datasScan[scanIdxSafe]]?.map(s => {
                    const c   = clientes.find(x => x.id === s.clienteId); if (!c) return null;
                    const key = `${s.scanId}_${fmtDate(s.date)}`;
                    const oc  = state.scanOcorrencias[key] || {};
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--dark3)', gap: 12, background: oc.status === 'ocorreu' ? 'rgba(42,170,90,.05)' : oc.status === 'nao' ? 'rgba(232,48,48,.05)' : 'transparent' }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>{c.nome}</div>
                          {oc.motivo && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2, fontStyle: 'italic' }}>✗ {oc.motivo}</div>}
                          {s.obs && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>{s.obs}</div>}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 500 }}>{s.hora}</span>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => { setScanStatus(s.scanId, fmtDate(s.date), 'ocorreu'); showToast('Scan executado ✓'); }}
                            style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--success)', background: oc.status === 'ocorreu' ? 'var(--success)' : 'none', color: oc.status === 'ocorreu' ? 'white' : 'var(--success)' }}>✓</button>
                          <button onClick={() => { setMotivoScan({ scanId: s.scanId, data: fmtDate(s.date) }); setMotivoTxt((oc as any).motivo || ''); }}
                            style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--danger)', background: oc.status === 'nao' ? 'var(--danger)' : 'none', color: oc.status === 'nao' ? 'white' : 'var(--danger)' }}>✗</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CLIENTES & SAÚDE + STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '14px 14px 12px', borderLeft: '3px solid var(--cyan)' }}>
          <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, color: 'var(--cyan)', marginBottom: 4 }}>{clientes.length}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase', marginBottom: 6 }}>Clientes</div>
          <div style={{ fontSize: 10, color: clientesComAbertas > 0 ? 'var(--warn)' : 'var(--success)', fontWeight: 700 }}>
            {clientesComAbertas > 0 ? `${clientesComAbertas} com abertos` : '✓ todos ok'}
          </div>
          {clientesComAtraso > 0 && <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700, marginTop: 2 }}>⚠ {clientesComAtraso} atrasados</div>}
        </div>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--dark)', borderRadius: 8, padding: '14px 14px 12px', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── TAREFAS EM ABERTO ── */}
      <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
        Tarefas em Aberto
      </div>

      {pend.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Nenhuma tarefa em aberto 🎉</div>
      ) : (
        [...pend].sort((a, b) => (isLate(a.prazo) ? -1 : 0) - (isLate(b.prazo) ? -1 : 0)).map(t => {
          const c = clientes.find(x => x.id === t.clienteId); if (!c) return null;
          const l = isLate(t.prazo);
          return (
            <div key={t.id} style={{ background: 'white', border: `1px solid ${l ? '#fecaca' : 'var(--border)'}`, borderLeft: `4px solid ${c.cor}`, borderRadius: 8, padding: '11px 14px', marginBottom: 8, boxShadow: '0 1px 4px rgba(35,31,32,.05)' }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{t.desc}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: c.cor }}>{c.nome}</span>
                {t.prazo && <span style={{ fontSize: 11, color: l ? 'var(--danger)' : 'var(--muted)' }}>{l ? '⚠ ' : ''}{fmtBR(t.prazo)}</span>}
                <button className={`spill sp-${t.status}`} onClick={() => { cycleStatus(t.id); showToast('Status atualizado'); }}>{labelStatus(t.status)}</button>
                {t.comentarios.length > 0 && <span style={{ fontSize: 10, color: 'var(--cyan-dim)', fontWeight: 700 }}>💬 {t.comentarios.length}</span>}
              </div>
            </div>
          );
        })
      )}

      {/* Modal motivo scan */}
      {motivoScan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }} onClick={e => { if (e.target === e.currentTarget) setMotivoScan(null); }}>
          <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, borderTop: '2.5px solid var(--warn)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Motivo <span style={{ color: 'var(--warn)' }}>Scan Não Executado</span></div>
              <button onClick={() => setMotivoScan(null)} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
            </div>
            <textarea rows={3} value={motivoTxt} onChange={e => setMotivoTxt(e.target.value)} placeholder="Ex: sistema indisponível, reagendado..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12, resize: 'none' }} />
            <button onClick={() => { setScanStatus(motivoScan.scanId, motivoScan.data, 'nao', motivoTxt); setMotivoScan(null); setMotivoTxt(''); showToast('Motivo salvo'); }}
              style={{ width: '100%', background: 'var(--warn)', color: 'white', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase' }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
