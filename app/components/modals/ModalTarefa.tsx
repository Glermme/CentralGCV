'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';

interface Props {
  open: boolean;
  onClose: () => void;
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function ModalTarefa({ open, onClose, store, showToast }: Props) {
  const { state, addTarefa } = store;
  const [cid,    setCid]    = useState('');
  const [desc,   setDesc]   = useState('');
  const [prazo,  setPrazo]  = useState('');
  const [status, setStatus] = useState<'pendente' | 'andamento'>('pendente');

  if (!open) return null;

  function handleSave() {
    const clienteId = cid || state.clientes[0]?.id;
    if (!clienteId) { showToast('Nenhum cliente cadastrado'); return; }
    if (!desc.trim()) { showToast('Descreva a tarefa'); return; }
    addTarefa(clienteId, desc.trim(), prazo, status);
    setDesc(''); setPrazo(''); setStatus('pendente');
    onClose();
    showToast('Tarefa salva ✓');
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto', borderTop: '2.5px solid var(--cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Nova <span style={{ color: 'var(--cyan-dim)' }}>Tarefa</span></div>
          <button onClick={onClose} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
        </div>

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Cliente</label>
        <select value={cid} onChange={e => setCid(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, background: 'white', marginBottom: 12 }}>
          {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Descrição</label>
        <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="O que precisa ser feito..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12, resize: 'none' }} />

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Prazo</label>
        <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12 }} />

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as any)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, background: 'white', marginBottom: 12 }}>
          <option value="pendente">Pendente</option>
          <option value="andamento">Em andamento</option>
        </select>

        <button onClick={handleSave} style={{ width: '100%', background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8 }}>
          Salvar Tarefa
        </button>
      </div>
    </div>
  );
}
