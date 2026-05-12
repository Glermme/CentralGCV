'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { exportTarefasXLS, exportAgendaXLS } from '@/lib/export';

interface Props {
  open:      boolean;
  onClose:   () => void;
  store:     StoreAPI;
  showToast: (msg: string) => void;
}

type Aba = 'tarefas' | 'agenda';

export default function ModalExport({ open, onClose, store, showToast }: Props) {
  const { state } = store;
  const [aba, setAba] = useState<Aba>('tarefas');

  // Filtros tarefas
  const [tCliente, setTCliente] = useState('');
  const [tStatus,  setTStatus]  = useState('');
  const [tDe,      setTDe]      = useState('');
  const [tAte,     setTAte]     = useState('');

  // Filtros agenda
  const [aCliente,    setACliente]    = useState('');
  const [aDe,         setADe]         = useState('');
  const [aAte,        setAAte]        = useState('');
  const [aRecorr,     setARecorr]     = useState(true);
  const [aExtras,     setAExtras]     = useState(true);
  const [aNaoOcorr,   setANaoOcorr]   = useState(false);

  if (!open) return null;

  function handleExportTarefas() {
    const ok = exportTarefasXLS(state, {
      clienteId: tCliente, status: tStatus, de: tDe, ate: tAte,
    });
    if (!ok) { showToast('Nenhuma tarefa encontrada com esses filtros'); return; }
    showToast('Tarefas exportadas ✓');
    onClose();
  }

  function handleExportAgenda() {
    if (!aRecorr && !aExtras) { showToast('Selecione pelo menos um tipo de agenda'); return; }
    const ok = exportAgendaXLS(state, {
      clienteId: aCliente, de: aDe, ate: aAte,
      recorrentes: aRecorr, extras: aExtras, naoOcorridas: aNaoOcorr,
    });
    if (!ok) { showToast('Nenhuma agenda encontrada com esses filtros'); return; }
    showToast('Agenda exportada ✓');
    onClose();
  }

  const lbl = (txt: string) => (
    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>{txt}</label>
  );

  const sel = (value: string, onChange: (v: string) => void, children: React.ReactNode) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, background: 'white', marginBottom: 12, cursor: 'pointer' }}>
      {children}
    </select>
  );

  const dateRow = (de: string, setDe: (v: string) => void, ate: string, setAte: (v: string) => void) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        {lbl('De')}
        <input type="date" value={de} onChange={e => setDe(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white' }} />
      </div>
      <div style={{ flex: 1 }}>
        {lbl('Até')}
        <input type="date" value={ate} onChange={e => setAte(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white' }} />
      </div>
    </div>
  );

  const chk = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, fontSize: 13 }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${value ? 'var(--cyan-dim)' : 'var(--border)'}`,
          background: value ? 'var(--cyan-dim)' : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
          color: 'white', fontSize: 10, fontWeight: 800,
        }}
      >{value ? '✓' : ''}</div>
      <span style={{ color: 'var(--text)' }}>{label}</span>
    </label>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto', borderTop: '2.5px solid var(--cyan)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Exportar <span style={{ color: 'var(--cyan-dim)' }}>Relatório</span></div>
          <button onClick={onClose} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['tarefas', 'agenda'] as Aba[]).map(t => (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{
                flex: 1, padding: '10px', fontFamily: 'inherit', fontWeight: 800,
                fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                border: 'none', background: aba === t ? 'var(--dark)' : 'white',
                color: aba === t ? 'var(--cyan)' : 'var(--muted)',
                transition: 'all .15s',
              }}
            >{t === 'tarefas' ? '📋 Tarefas' : '📅 Agenda'}</button>
          ))}
        </div>

        {/* ── TAREFAS ── */}
        {aba === 'tarefas' && (
          <>
            {lbl('Cliente')}
            {sel(tCliente, setTCliente, <>
              <option value="">Todos os clientes</option>
              {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </>)}

            {lbl('Status')}
            {sel(tStatus, setTStatus, <>
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </>)}

            {lbl('Período de criação')}
            {dateRow(tDe, setTDe, tAte, setTAte)}

            <div style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
              O relatório incluirá: tarefa, cliente, status, prazo, data de criação e todos os comentários com data/hora e autor.
            </div>

            <button onClick={handleExportTarefas} style={{ width: '100%', background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8 }}>
              ↓ Exportar Tarefas XLS
            </button>
          </>
        )}

        {/* ── AGENDA ── */}
        {aba === 'agenda' && (
          <>
            {lbl('Cliente')}
            {sel(aCliente, setACliente, <>
              <option value="">Todos os clientes</option>
              {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </>)}

            {lbl('Período')}
            {dateRow(aDe, setADe, aAte, setAAte)}

            {lbl('Tipos de agenda')}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              {chk('Agendas recorrentes', aRecorr, setARecorr)}
              {chk('Agendas extras (com duração)', aExtras, setAExtras)}
              {chk('Somente as que NÃO ocorreram', aNaoOcorr, setANaoOcorr)}
            </div>

            <div style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
              Cada tipo de agenda gera uma aba separada no XLS. Extras incluem duração e descrição.
            </div>

            <button onClick={handleExportAgenda} style={{ width: '100%', background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .8 }}>
              ↓ Exportar Agenda XLS
            </button>
          </>
        )}
      </div>
    </div>
  );
}
