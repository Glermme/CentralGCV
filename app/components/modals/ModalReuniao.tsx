'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { fmtDate } from '@/lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function ModalReuniao({ open, onClose, store, showToast }: Props) {
  const { addReuniao } = store;
  const [data, setData] = useState(fmtDate(new Date()));
  const [obs,  setObs]  = useState('');

  if (!open) return null;

  function handleSave() {
    if (!data) { showToast('Selecione a data'); return; }
    addReuniao(data, obs.trim());
    setObs('');
    onClose();
    showToast('Reunião registrada ✓');
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, borderTop: '2.5px solid var(--cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Registrar <span style={{ color: 'var(--cyan-dim)' }}>Reunião</span></div>
          <button onClick={onClose} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
        </div>

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Data</label>
        <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12 }} />

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Observações (opcional)</label>
        <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Pontos gerais desta reunião..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12, resize: 'none' }} />

        <button onClick={handleSave} style={{ width: '100%', background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8 }}>
          Registrar
        </button>
      </div>
    </div>
  );
}
