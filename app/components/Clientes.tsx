'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { isLate, fmtBR, fmtDT, labelStatus } from '@/lib/store';
import ModalCompartilhar from '@/components/modals/ModalCompartilhar';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function Clientes({ store, showToast }: Props) {
  const { state, userId, userRole, toggleConcluida, cycleStatus, delTarefa, addTarefa, addTarefasBatch, addComentario, delComentario } = store;
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({});
  const [formOpen,  setFormOpen]  = useState<Record<string, boolean>>({});
  const [cmntOpen,  setCmntOpen]  = useState<Record<string, boolean>>({});
  const [batchOpen, setBatchOpen] = useState<string | null>(null);
  const [compartilharCliente, setCompartilharCliente] = useState<{ id: string; nome: string; cor: string; ownerId: string } | null>(null);

  const [formDesc,   setFormDesc]   = useState<Record<string, string>>({});
  const [formPrazo,  setFormPrazo]  = useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = useState<Record<string, string>>({});
  const [batchTxt,   setBatchTxt]   = useState('');
  const [batchPrazo, setBatchPrazo] = useState('');
  const [cmntInput,  setCmntInput]  = useState<Record<string, string>>({});

  const isViewer = userRole === 'viewer';

  function toggle(id: string) {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }

  function handleAddInline(cid: string) {
    const desc = (formDesc[cid] || '').trim();
    if (!desc) { showToast('Descreva a tarefa'); return; }
    addTarefa(cid, desc, formPrazo[cid] || '', (formStatus[cid] || 'pendente') as any);
    setFormDesc(p  => ({ ...p, [cid]: '' }));
    setFormPrazo(p => ({ ...p, [cid]: '' }));
    setFormOpen(p  => ({ ...p, [cid]: false }));
    showToast('Tarefa adicionada ✓');
  }

  function handleBatch(cid: string) {
    const ps = batchTxt.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (!ps.length) { showToast('Nenhum parágrafo encontrado'); return; }
    addTarefasBatch(cid, ps, batchPrazo);
    setBatchTxt(''); setBatchPrazo(''); setBatchOpen(null);
    showToast(`${ps.length} tarefa${ps.length > 1 ? 's' : ''} importada${ps.length > 1 ? 's' : ''} ✓`);
  }

  function handleAddCmnt(tid: string) {
    const txt = (cmntInput[tid] || '').trim();
    if (!txt) return;
    addComentario(tid, txt);
    setCmntInput(p => ({ ...p, [tid]: '' }));
    showToast('Comentário adicionado');
  }

  return (
    <div>
      {state.clientes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>
          Nenhum cliente. Vá em Configurar.
        </div>
      )}

      {state.clientes.map(c => {
        const ts   = state.tarefas.filter(t => t.clienteId === c.id);
        const pend = ts.filter(t => t.status !== 'concluida' && t.status !== 'cancelada');
        const conc = ts.filter(t => t.status === 'concluida');
        const late = pend.filter(t => isLate(t.prazo));
        const pct  = ts.length ? Math.round(conc.length / ts.length * 100) : 0;
        const open = expanded[c.id];

        return (
          <div key={c.id} style={{ background: 'var(--ivory)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(35,31,32,.06)' }}>
            {/* Header */}
            <div onClick={() => toggle(c.id)} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `4px solid ${c.cor}`, background: 'white' }}>
              <div style={{ width: 38, height: 38, borderRadius: 6, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'white', flexShrink: 0 }}>{c.nome.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.empresa || '—'} · {ts.length} tarefa{ts.length !== 1 ? 's' : ''} · {pct}%</div>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: c.cor, width: `${pct}%`, transition: 'width .5s' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                {late.length > 0 && <span className="badge b-late">⚠{late.length}</span>}
                {pend.length > 0 ? <span className="badge b-pend">{pend.length}</span> : ts.length > 0 ? <span className="badge b-ok">✓</span> : null}
              </div>
              <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>

            {/* Tarefas */}
            {open && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {ts.length === 0 && (
                  <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Nenhuma tarefa ainda</div>
                )}

                {ts.map(t => {
                  const late = isLate(t.prazo) && t.status !== 'concluida';
                  const hasC = t.comentarios.length > 0;
                  return (
                    <div key={t.id} style={{ background: 'var(--ivory2)', borderBottom: '1px solid var(--border)', opacity: t.status === 'concluida' ? .5 : 1 }}>
                      <div style={{ padding: '10px 16px 10px 20px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div
                          onClick={() => { if (!isViewer) { toggleConcluida(t.id); showToast(t.status === 'concluida' ? 'Reaberta' : 'Concluída ✓'); } }}
                          style={{ width: 18, height: 18, border: `2px solid ${t.status === 'concluida' ? 'var(--success)' : 'var(--border)'}`, borderRadius: 4, flexShrink: 0, cursor: isViewer ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, marginTop: 2, background: t.status === 'concluida' ? 'var(--success)' : 'white', color: 'white' }}
                        >{t.status === 'concluida' ? '✓' : ''}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, lineHeight: 1.5, textDecoration: t.status === 'concluida' ? 'line-through' : 'none', color: t.status === 'concluida' ? 'var(--muted)' : 'var(--dark)' }}>{t.desc}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                            {t.prazo && <span style={{ fontSize: 11, color: late ? 'var(--danger)' : 'var(--muted)', fontWeight: late ? 600 : 400 }}>{late ? '⚠ ' : ''}{fmtBR(t.prazo)}</span>}
                            <button
                              className={`spill sp-${t.status}`}
                              onClick={() => { if (!isViewer) cycleStatus(t.id); }}
                              style={{ cursor: isViewer ? 'default' : 'pointer' }}
                            >{labelStatus(t.status)}</button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', flexShrink: 0 }}>
                          <button
                            onClick={() => setCmntOpen(p => ({ ...p, [t.id]: !p[t.id] }))}
                            style={{ fontSize: 10, cursor: 'pointer', borderRadius: 3, padding: '3px 7px', fontWeight: 700, whiteSpace: 'nowrap', background: hasC ? 'var(--cyan-soft)' : 'white', border: hasC ? '1px solid rgba(13,219,255,.3)' : '1px solid var(--border)', color: hasC ? 'var(--cyan-dim)' : 'var(--muted)' }}
                          >💬 {hasC ? t.comentarios.length : '+'}</button>
                          {!isViewer && (
                            <button onClick={() => { delTarefa(t.id); showToast('Tarefa removida'); }} style={{ fontSize: 12, color: 'var(--border)', cursor: 'pointer', background: 'none', border: 'none', padding: '3px 5px', borderRadius: 3 }}>✕</button>
                          )}
                        </div>
                      </div>

                      {/* Comentários */}
                      {cmntOpen[t.id] && (
                        <div style={{ padding: '8px 16px 12px 48px', background: 'var(--ivory3)', borderTop: '1px solid var(--border)' }}>
                          {t.comentarios.map((cm, i) => (
                            <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px', marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDT(cm.at)}</span>
                                {!isViewer && <button onClick={() => delComentario(t.id, i)} style={{ fontSize: 11, color: 'var(--border)', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>}
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.5 }}>{cm.txt}</div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <input
                              type="text"
                              value={cmntInput[t.id] || ''}
                              onChange={e => setCmntInput(p => ({ ...p, [t.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleAddCmnt(t.id)}
                              placeholder="Escreva um comentário..."
                              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white' }}
                            />
                            <button onClick={() => handleAddCmnt(t.id)} style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 4, padding: '7px 12px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Enviar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Inline form */}
                {formOpen[c.id] && (
                  <div style={{ padding: '12px 16px', background: 'var(--ivory2)', borderTop: '1px solid var(--border)' }}>
                    <textarea rows={2} placeholder="Descreva a tarefa..." value={formDesc[c.id] || ''} onChange={e => setFormDesc(p => ({ ...p, [c.id]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 8, resize: 'none' }} />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input type="date" value={formPrazo[c.id] || ''} onChange={e => setFormPrazo(p => ({ ...p, [c.id]: e.target.value }))} style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white' }} />
                      <select value={formStatus[c.id] || 'pendente'} onChange={e => setFormStatus(p => ({ ...p, [c.id]: e.target.value }))} style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer' }}>
                        <option value="pendente">Pendente</option>
                        <option value="andamento">Em andamento</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleAddInline(c.id)} style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}>Salvar</button>
                      <button onClick={() => setFormOpen(p => ({ ...p, [c.id]: false }))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Batch */}
                {batchOpen === c.id && (
                  <div style={{ padding: '12px 16px', background: 'var(--ivory2)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 800, fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>IMPORTAR EM LOTE — {c.nome}</div>
                    <textarea rows={5} placeholder="Cole os parágrafos aqui..." value={batchTxt} onChange={e => setBatchTxt(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white', marginBottom: 8, resize: 'vertical', minHeight: 100 }} />
                    {batchTxt.split(/\n\s*\n/).filter(p => p.trim()).length > 0 && (
                      <div style={{ background: 'var(--cyan-soft)', border: '1px solid rgba(13,219,255,.25)', borderRadius: 5, padding: '6px 10px', fontSize: 12, color: 'var(--cyan-dim)', fontWeight: 700, marginBottom: 8 }}>
                        {batchTxt.split(/\n\s*\n/).filter(p => p.trim()).length} tarefa(s) detectada(s)
                      </div>
                    )}
                    <input type="date" value={batchPrazo} onChange={e => setBatchPrazo(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleBatch(c.id)} style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>Importar</button>
                      <button onClick={() => setBatchOpen(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div style={{ padding: '10px 16px', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {!isViewer && (
                    <>
                      <button onClick={() => setFormOpen(p => ({ ...p, [c.id]: !p[c.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px dashed var(--border)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}>+ Tarefa</button>
                      <button onClick={() => setBatchOpen(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px dashed var(--border)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}>⊞ Lote</button>
                    </>
                  )}
                  {/* Botão compartilhar — só dono ou admin */}
                  {(userRole === 'admin' || userId === c.id) && (
                    <button
                      onClick={() => setCompartilharCliente({ id: c.id, nome: c.nome, cor: c.cor, ownerId: userId || '' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px solid var(--border)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}
                    >⇄ Compartilhar</button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal compartilhar */}
      {compartilharCliente && userId && (
        <ModalCompartilhar
          clienteId={compartilharCliente.id}
          clienteNome={compartilharCliente.nome}
          clienteCor={compartilharCliente.cor}
          ownerId={compartilharCliente.ownerId}
          userId={userId}
          onClose={() => setCompartilharCliente(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
