'use client';

import { useState, useRef } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { isLate, fmtBR, fmtDT, labelStatus } from '@/lib/store';
import ModalCompartilhar from '@/components/modals/ModalCompartilhar';
import ModalConfirm      from '@/components/modals/ModalConfirm';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

const PRESET_COLORS = ['#0ab8d8', '#2aaa5a', '#e8830a', '#7c3aed', '#c0392b', '#0f766e'];

export default function Clientes({ store, showToast }: Props) {
  const { state, userId, userRole, toggleConcluida, cycleStatus, delTarefa, addTarefa, addTarefasBatch, addComentario, delComentario, addCliente, delCliente, randomColor } = store;

  const [novoNome, setNovoNome] = useState('');
  const [novaCor,  setNovaCor]  = useState(PRESET_COLORS[0]);
  const pickerRef = useRef<HTMLInputElement>(null);

  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({});
  const [formOpen,  setFormOpen]  = useState<Record<string, boolean>>({});
  const [cmntOpen,  setCmntOpen]  = useState<Record<string, boolean>>({});
  const [batchOpen, setBatchOpen] = useState<string | null>(null);

  const [compartilharCliente, setCompartilharCliente] = useState<{ id: string; nome: string; cor: string; ownerId: string } | null>(null);

  // ModalConfirm state
  const [confirm, setConfirm] = useState<{ titulo: string; mensagem: string; onOk: () => void } | null>(null);

  const [formDesc,   setFormDesc]   = useState<Record<string, string>>({});
  const [formPrazo,  setFormPrazo]  = useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = useState<Record<string, string>>({});
  const [batchTxt,   setBatchTxt]   = useState('');
  const [batchPrazo, setBatchPrazo] = useState('');
  const [cmntInput,  setCmntInput]  = useState<Record<string, string>>({});
  const [cmntFiles,  setCmntFiles]  = useState<Record<string, File[]>>({});
  const [cmntLoading, setCmntLoading] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isViewer  = userRole === 'viewer';
  const usedCores = state.clientes.map(c => c.cor.toLowerCase());
  const isPickerActive = !PRESET_COLORS.includes(novaCor);

  function askConfirm(titulo: string, mensagem: string, onOk: () => void) {
    setConfirm({ titulo, mensagem, onOk });
  }

  async function handleAddCliente() {
    if (!novoNome.trim()) { showToast('Digite o nome'); return; }
    if (usedCores.includes(novaCor.toLowerCase())) { showToast('Essa cor já está em uso'); return; }
    await addCliente(novoNome.trim(), novoNome.trim(), novaCor);
    setNovoNome('');
    const next = PRESET_COLORS.find(c => !usedCores.includes(c.toLowerCase()) && c !== novaCor) || randomColor();
    setNovaCor(next);
    showToast('Cliente adicionado ✓');
  }

  function handleDelCliente(id: string, nome: string) {
    askConfirm(
      'Remover cliente',
      `Tem certeza que deseja remover "${nome}"? Todas as tarefas e agendas associadas serão excluídas.`,
      async () => { await delCliente(id); showToast('Cliente removido'); }
    );
  }

  function toggle(id: string) { setExpanded(p => ({ ...p, [id]: !p[id] })); }

  function handleAddInline(cid: string) {
    const desc = (formDesc[cid] || '').trim();
    if (!desc) { showToast('Descreva a tarefa'); return; }
    addTarefa(cid, desc, formPrazo[cid] || '', (formStatus[cid] || 'pendente') as any);
    setFormDesc(p => ({ ...p, [cid]: '' })); setFormPrazo(p => ({ ...p, [cid]: '' }));
    setFormOpen(p => ({ ...p, [cid]: false })); showToast('Tarefa adicionada ✓');
  }

  function handleBatch(cid: string) {
    const ps = batchTxt.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (!ps.length) { showToast('Nenhum parágrafo encontrado'); return; }
    addTarefasBatch(cid, ps, batchPrazo);
    setBatchTxt(''); setBatchPrazo(''); setBatchOpen(null);
    showToast(`${ps.length} tarefa${ps.length > 1 ? 's' : ''} importada${ps.length > 1 ? 's' : ''} ✓`);
  }

  async function handleAddCmnt(tid: string) {
    const txt   = (cmntInput[tid] || '').trim();
    const files = cmntFiles[tid] || [];
    if (!txt && !files.length) return;
    setCmntLoading(p => ({ ...p, [tid]: true }));
    await addComentario(tid, txt, files);
    setCmntInput(p => ({ ...p, [tid]: '' }));
    setCmntFiles(p => ({ ...p, [tid]: [] }));
    setCmntLoading(p => ({ ...p, [tid]: false }));
    showToast('Comentário adicionado');
  }

  function handleDelTarefa(id: string, desc: string) {
    askConfirm('Remover tarefa', `Remover "${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}"?`, async () => {
      await delTarefa(id); showToast('Tarefa removida');
    });
  }

  function handleDelCmnt(tid: string, idx: number, txt: string) {
    askConfirm('Remover comentário', `Remover este comentário?`, async () => {
      await delComentario(tid, idx); showToast('Comentário removido');
    });
  }

  function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url); }

  function Avatar({ nome, avatar, size = 28 }: { nome: string; avatar: string; size?: number }) {
    return avatar ? (
      <img src={avatar} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--dark)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * .45, flexShrink: 0 }}>
        {nome?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ══ CARD NOVO CLIENTE ══ */}
        {!isViewer && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 78, boxShadow: '0 4px 20px rgba(35,31,32,.08)' }}>
            <div style={{ background: 'var(--dark)', padding: '20px 20px 16px', borderBottom: `3px solid ${novaCor}`, transition: 'border-color .3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: novaCor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'white', flexShrink: 0, transition: 'background .3s', boxShadow: `0 4px 12px ${novaCor}55` }}>
                  {novoNome ? novoNome.charAt(0).toUpperCase() : '+'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>{novoNome || 'Novo Cliente'}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2, letterSpacing: .5 }}>CENTRAL GCV</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '18px 20px 20px' }}>
              <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 6 }}>Nome da Empresa</label>
              <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCliente()} placeholder="Ex: Acme Corp"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 16, transition: 'border-color .2s' }}
                onFocus={e => (e.target.style.borderColor = novaCor)} onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />

              <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 10 }}>Cor Identificadora</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7, marginBottom: 12 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setNovaCor(c)} style={{ aspectRatio: '1', border: 'none', borderRadius: 8, background: c, cursor: 'pointer', outline: novaCor === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: 2, transform: novaCor === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform .15s, outline .15s', boxShadow: novaCor === c ? `0 3px 10px ${c}66` : '0 2px 6px rgba(0,0,0,.12)' }} />
                ))}
                <div style={{ aspectRatio: '1', borderRadius: 8, position: 'relative', outline: isPickerActive ? `3px solid ${novaCor}` : '3px solid transparent', outlineOffset: 2, transform: isPickerActive ? 'scale(1.15)' : 'scale(1)', transition: 'transform .15s', overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', inset: 0, background: isPickerActive ? novaCor : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', borderRadius: 8 }} />
                  <input ref={pickerRef} type="color" value={novaCor} onChange={e => setNovaCor(e.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: novaCor, flexShrink: 0, border: '2px solid var(--border)', transition: 'background .2s', boxShadow: `0 3px 10px ${novaCor}44` }} />
                <button onClick={() => setNovaCor(randomColor())}
                  style={{ flex: 1, background: 'var(--ivory2)', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = novaCor; (e.currentTarget as HTMLElement).style.color = novaCor; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
                >🎲 Aleatória</button>
              </div>

              <button onClick={handleAddCliente}
                style={{ width: '100%', padding: '12px', background: novaCor, color: 'white', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8, transition: 'all .2s', boxShadow: `0 6px 18px ${novaCor}44` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
              >+ Adicionar Cliente</button>
            </div>
          </div>
        )}

        {/* ══ LISTA ══ */}
        <div>
          {state.clientes.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>Nenhum cliente. Adicione pelo painel ao lado.</div>}

          {state.clientes.map(c => {
            const ts      = state.tarefas.filter(t => t.clienteId === c.id);
            const tAtivas = ts.filter(t => t.status !== 'cancelada');
            const tPend   = tAtivas.filter(t => t.status === 'pendente');
            const tAnda   = tAtivas.filter(t => t.status === 'andamento');
            const tConc   = tAtivas.filter(t => t.status === 'concluida');
            const tFinal  = tAtivas.filter(t => t.status === 'finalizado');
            const pend    = ts.filter(t => t.status !== 'finalizado' && t.status !== 'cancelada');
            const late    = pend.filter(t => isLate(t.prazo));
            const total   = tAtivas.length;
            const pctP    = total ? Math.round(tPend.length  / total * 100) : 0;
            const pctA    = total ? Math.round(tAnda.length  / total * 100) : 0;
            const pctC    = total ? Math.round(tConc.length  / total * 100) : 0;
            const pctF    = total ? Math.round(tFinal.length / total * 100) : 0;
            const open = expanded[c.id];

            return (
              <div key={c.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(35,31,32,.06)' }}>
                <div onClick={() => toggle(c.id)} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `4px solid ${c.cor}`, background: 'white', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--ivory2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'white'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: 'white', flexShrink: 0 }}>{c.nome.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{c.nome}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 10, color: 'var(--muted)' }}>
                      {tPend.length  > 0 && <span style={{ color: 'var(--warn)' }}   >● {pctP}% pendente</span>}
                      {tAnda.length  > 0 && <span style={{ color: 'var(--cyan-dim)' }}>● {pctA}% andamento</span>}
                      {tConc.length  > 0 && <span style={{ color: 'var(--success)' }}>● {pctC}% concluído</span>}
                      {tFinal.length > 0 && <span>● {pctF}% finalizado</span>}
                      {total === 0 && <span>{ts.length} tarefa{ts.length !== 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ display: 'flex', height: 4, borderRadius: 2, marginTop: 5, overflow: 'hidden', background: 'var(--border)' }}>
                      <div style={{ width: `${pctP}%`, background: 'var(--warn)',    transition: 'width .5s' }} />
                      <div style={{ width: `${pctA}%`, background: 'var(--cyan)',    transition: 'width .5s' }} />
                      <div style={{ width: `${pctC}%`, background: 'var(--success)', transition: 'width .5s' }} />
                      <div style={{ width: `${pctF}%`, background: 'var(--muted)',   transition: 'width .5s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    {late.length > 0 && <span className="badge b-late">⚠{late.length}</span>}
                    {pend.length > 0 ? <span className="badge b-pend">{pend.length}</span> : total > 0 ? <span className="badge b-ok">✓</span> : null}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
                </div>

                {open && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {ts.length === 0 && <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Nenhuma tarefa ainda</div>}

                    {ts.map(t => {
                      const isLateT  = isLate(t.prazo) && t.status !== 'concluida' && t.status !== 'finalizado';
                      const isFinal  = t.status === 'finalizado';
                      const isConc   = t.status === 'concluida';
                      const hasC     = t.comentarios.length > 0;
                      const files    = cmntFiles[t.id] || [];
                      const loading  = cmntLoading[t.id];
                      return (
                        <div key={t.id} style={{ background: 'var(--ivory2)', borderBottom: '1px solid var(--border)', opacity: isFinal ? .45 : 1 }}>
                          <div style={{ padding: '10px 16px 10px 20px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div onClick={() => { if (!isViewer) { toggleConcluida(t.id); showToast(t.status === 'concluida' ? 'Reaberta' : 'Concluída ✓'); } }}
                              style={{ width: 18, height: 18, border: `2px solid ${isConc || isFinal ? 'var(--success)' : 'var(--border)'}`, borderRadius: 4, flexShrink: 0, cursor: isViewer ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, marginTop: 2, background: isConc || isFinal ? 'var(--success)' : 'white', color: 'white' }}
                            >{isConc || isFinal ? '✓' : ''}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, lineHeight: 1.5, color: isFinal ? 'var(--muted)' : 'var(--text)', textDecoration: isFinal ? 'line-through' : 'none' }}>{t.desc}</div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                                {t.prazo && <span style={{ fontSize: 11, color: isLateT ? 'var(--danger)' : 'var(--muted)', fontWeight: isLateT ? 600 : 400 }}>{isLateT ? '⚠ ' : ''}{fmtBR(t.prazo)}</span>}
                                <button className={`spill sp-${t.status}`} onClick={() => { if (!isViewer) cycleStatus(t.id); }} style={{ cursor: isViewer ? 'default' : 'pointer' }}>{labelStatus(t.status)}</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', flexShrink: 0 }}>
                              <button onClick={() => setCmntOpen(p => ({ ...p, [t.id]: !p[t.id] }))} style={{ fontSize: 10, cursor: 'pointer', borderRadius: 3, padding: '3px 7px', fontWeight: 700, whiteSpace: 'nowrap', background: hasC ? 'var(--cyan-soft)' : 'white', border: hasC ? '1px solid rgba(13,219,255,.3)' : '1px solid var(--border)', color: hasC ? 'var(--cyan-dim)' : 'var(--muted)' }}>💬 {hasC ? t.comentarios.length : '+'}</button>
                              {!isViewer && <button onClick={() => handleDelTarefa(t.id, t.desc)} style={{ fontSize: 12, color: 'var(--border)', cursor: 'pointer', background: 'none', border: 'none', padding: '3px 5px', borderRadius: 3 }}>✕</button>}
                            </div>
                          </div>

                          {cmntOpen[t.id] && (
                            <div style={{ padding: '10px 16px 14px 20px', background: 'var(--ivory3)', borderTop: '1px solid var(--border)' }}>
                              {t.comentarios.map((cm, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                  <Avatar nome={cm.autorNome} avatar={cm.autorAvatar} size={30} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                      <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text)' }}>{cm.autorNome || '?'}</span>
                                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDT(cm.at)}</span>
                                      {!isViewer && <button onClick={() => handleDelCmnt(t.id, i, cm.txt)} style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--border)', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>}
                                    </div>
                                    {cm.txt && <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text)', background: 'white', border: '1px solid var(--border)', borderRadius: '0 8px 8px 8px', padding: '8px 10px', marginBottom: cm.anexos?.length ? 6 : 0 }}>{cm.txt}</div>}
                                    {cm.anexos?.length > 0 && (
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                        {cm.anexos.map((a, ai) => isImage(a.url) ? (
                                          <a key={ai} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.nome} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} /></a>
                                        ) : (
                                          <a key={ai} href={a.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--cyan-dim)', textDecoration: 'none' }}>📎 {a.nome}</a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {!isViewer && (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
                                  <Avatar nome={store.userNome} avatar={store.userAvatar} size={30} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: files.length ? 6 : 0 }}>
                                      <input type="text" value={cmntInput[t.id] || ''} onChange={e => setCmntInput(p => ({ ...p, [t.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddCmnt(t.id)} placeholder="Escreva um comentário..." style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white' }} />
                                      <button onClick={() => fileRefs.current[t.id]?.click()} style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14, color: 'var(--muted)', flexShrink: 0 }} title="Anexar">📎</button>
                                      <input ref={el => { fileRefs.current[t.id] = el; }} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) setCmntFiles(p => ({ ...p, [t.id]: [...(p[t.id] || []), ...Array.from(e.target.files!)] })); }} />
                                      <button onClick={() => handleAddCmnt(t.id)} disabled={loading} style={{ padding: '7px 12px', background: loading ? 'var(--border)' : 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>{loading ? '...' : 'Enviar'}</button>
                                    </div>
                                    {files.length > 0 && (
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {files.map((f, fi) => (
                                          <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}>
                                            <span style={{ color: 'var(--text)' }}>{f.name.length > 20 ? f.name.slice(0, 20) + '…' : f.name}</span>
                                            <button onClick={() => setCmntFiles(p => ({ ...p, [t.id]: p[t.id].filter((_, i) => i !== fi) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0 }}>✕</button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

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

                    <div style={{ padding: '10px 16px', background: 'white', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {!isViewer && (
                        <>
                          <button onClick={() => setFormOpen(p => ({ ...p, [c.id]: !p[c.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px dashed var(--border)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}>+ Tarefa</button>
                          <button onClick={() => setBatchOpen(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px dashed var(--border)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}>⊞ Lote</button>
                        </>
                      )}
                      <button onClick={() => setCompartilharCliente({ id: c.id, nome: c.nome, cor: c.cor, ownerId: userId || '' })} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px solid var(--border)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}>⇄ Compartilhar</button>
                      {!isViewer && (
                        <button onClick={() => handleDelCliente(c.id, c.nome)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px solid rgba(232,48,48,.3)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', color: 'var(--danger)', cursor: 'pointer' }}>🗑 Remover</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {compartilharCliente && userId && (
        <ModalCompartilhar clienteId={compartilharCliente.id} clienteNome={compartilharCliente.nome} clienteCor={compartilharCliente.cor} ownerId={compartilharCliente.ownerId} userId={userId} onClose={() => setCompartilharCliente(null)} showToast={showToast} />
      )}

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
