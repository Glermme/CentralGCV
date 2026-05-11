'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';

import Dashboard  from '@/components/Dashboard';
import Clientes   from '@/components/Clientes';
import Agenda     from '@/components/Agenda';
import Historico  from '@/components/Historico';
import Configurar from '@/components/Configurar';

import ModalTarefa  from '@/components/modals/ModalTarefa';
import ModalReuniao from '@/components/modals/ModalReuniao';

type ViewName = 'dashboard' | 'clientes' | 'agenda' | 'historico' | 'config';

const TABS: { id: ViewName; label: string }[] = [
  { id: 'dashboard', label: 'Visão Geral' },
  { id: 'clientes',  label: 'Clientes'    },
  { id: 'agenda',    label: 'Agenda'      },
  { id: 'historico', label: 'Histórico'   },
  { id: 'config',    label: 'Configurar'  },
];

export default function Home() {
  const store = useStore();
  const [view,         setView]         = useState<ViewName>('dashboard');
  const [modalTarefa,  setModalTarefa]  = useState(false);
  const [modalReuniao, setModalReuniao] = useState(false);
  const [toast,        setToast]        = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }, []);

  return (
    <>
      {/* ── HEADER ── */}
      <header style={{
        background: 'var(--dark)', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--cyan)', color: 'var(--dark)', fontWeight: 800, fontSize: 16, letterSpacing: -0.5, padding: '6px 11px', borderRadius: '4px 0 0 4px' }}>OSTEC</div>
          <div style={{ background: 'var(--dark2)', color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', padding: '6px 10px', borderRadius: '0 4px 4px 0', border: '1px solid var(--dark3)', borderLeft: 'none', lineHeight: 1.8 }}>Central GCV</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setModalReuniao(true)}
            style={{ background: 'transparent', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', borderRadius: 5, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}
          >+ Reunião</button>
          <button
            onClick={store.logout}
            style={{ background: 'transparent', border: '1.5px solid var(--dark3)', color: 'rgba(255,255,255,.4)', borderRadius: 5, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}
          >Sair</button>
        </div>
      </header>

      {/* ── CYAN LINE ── */}
      <div style={{ height: 2.5, background: 'linear-gradient(90deg, var(--cyan), #0ab8d8 40%, transparent)' }} />

      {/* ── TABS ── */}
      <div style={{ background: 'var(--dark)', display: 'flex', padding: '0 20px', overflowX: 'auto', gap: 2, borderBottom: '1px solid var(--dark3)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              padding: '12px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11,
              letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
              border: 'none', background: 'none', whiteSpace: 'nowrap',
              color: view === tab.id ? 'var(--cyan)' : 'rgba(255,255,255,.4)',
              borderBottom: view === tab.id ? '2.5px solid var(--cyan)' : '2.5px solid transparent',
              marginBottom: -1,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── LOADING ── */}
      {store.loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--cyan)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          Carregando dados...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* ── VIEWS ── */}
      {!store.loading && (
        <main style={{ maxWidth: 820, margin: '0 auto', padding: 20 }}>
          {view === 'dashboard' && <Dashboard  store={store} showToast={showToast} />}
          {view === 'clientes'  && <Clientes   store={store} showToast={showToast} />}
          {view === 'agenda'    && <Agenda     store={store} showToast={showToast} />}
          {view === 'historico' && <Historico  store={store} showToast={showToast} />}
          {view === 'config'    && <Configurar store={store} showToast={showToast} />}
        </main>
      )}

      {/* ── FAB ── */}
      <button className="fab" onClick={() => setModalTarefa(true)}>+</button>

      {/* ── MODAIS ── */}
      <ModalTarefa  open={modalTarefa}  onClose={() => setModalTarefa(false)}  store={store} showToast={showToast} />
      <ModalReuniao open={modalReuniao} onClose={() => setModalReuniao(false)} store={store} showToast={showToast} />

      {/* ── TOAST ── */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </>
  );
}
