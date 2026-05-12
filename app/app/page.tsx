'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';

import VizaoGeral         from '@/components/VizaoGeral';
import DashboardAnalitico from '@/components/DashboardAnalitico';
import Clientes           from '@/components/Clientes';
import Kanban             from '@/components/Kanban';
import Agenda             from '@/components/Agenda';
import Historico          from '@/components/Historico';
import Usuarios           from '@/components/Usuarios';

import ModalTarefa  from '@/components/modals/ModalTarefa';
import ModalReuniao from '@/components/modals/ModalReuniao';
import ModalExport  from '@/components/modals/ModalExport';

type ViewName = 'geral' | 'dashboard' | 'clientes' | 'kanban' | 'agenda' | 'historico' | 'usuarios';

export default function Home() {
  const store = useStore();
  const [view,          setView]          = useState<ViewName>('geral');
  const [modalTarefa,   setModalTarefa]   = useState(false);
  const [modalReuniao,  setModalReuniao]  = useState(false);
  const [modalExport,   setModalExport]   = useState(false);
  const [toast,         setToast]         = useState('');
  const [toastVisible,  setToastVisible]  = useState(false);

  const isAdmin  = store.userRole === 'admin';
  const isViewer = store.userRole === 'viewer';

  const showToast = useCallback((msg: string) => {
    setToast(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const tabs = [
    { id: 'geral'     as ViewName, label: 'Visão Geral' },
    { id: 'dashboard' as ViewName, label: 'Dashboard'   },
    { id: 'clientes'  as ViewName, label: 'Clientes'    },
    { id: 'kanban'    as ViewName, label: 'Kanban'       },
    { id: 'agenda'    as ViewName, label: 'Agenda'       },
    { id: 'historico' as ViewName, label: 'Histórico'   },
    ...(isAdmin ? [{ id: 'usuarios' as ViewName, label: 'Usuários' }] : []),
  ];

  return (
    <>
      <header style={{ background: 'var(--dark)', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'var(--cyan)', color: 'var(--dark)', fontWeight: 800, fontSize: 16, letterSpacing: -0.5, padding: '6px 11px', borderRadius: '4px 0 0 4px' }}>OSTEC</div>
          <div style={{ background: 'var(--dark2)', color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', padding: '6px 10px', borderRadius: '0 4px 4px 0', border: '1px solid var(--dark3)', borderLeft: 'none', lineHeight: 1.8 }}>Central GCV</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Exportar */}
          <button onClick={() => setModalExport(true)} style={{ background: 'transparent', border: '1.5px solid var(--dark3)', color: 'rgba(255,255,255,.5)', borderRadius: 5, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--success)'; (e.currentTarget as HTMLElement).style.color = 'var(--success)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--dark3)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.5)'; }}
          >↓ XLS</button>

          {isAdmin && (
            <button onClick={store.toggleGlobalView} style={{ background: store.globalView ? 'var(--cyan)' : 'transparent', border: `1.5px solid ${store.globalView ? 'var(--cyan)' : 'var(--dark3)'}`, color: store.globalView ? 'var(--dark)' : 'rgba(255,255,255,.4)', borderRadius: 5, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s' }}>⊞ Global</button>
          )}
          <button onClick={store.logout} style={{ background: 'transparent', border: '1.5px solid var(--dark3)', color: 'rgba(255,255,255,.4)', borderRadius: 5, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>Sair</button>
        </div>
      </header>

      <div style={{ height: 2.5, background: 'linear-gradient(90deg, var(--cyan), #0ab8d8 40%, transparent)' }} />

      <div style={{ background: 'var(--dark)', display: 'flex', padding: '0 20px', overflowX: 'auto', gap: 2, borderBottom: '1px solid var(--dark3)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{ padding: '12px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: 'none', whiteSpace: 'nowrap', color: view === tab.id ? 'var(--cyan)' : 'rgba(255,255,255,.4)', borderBottom: view === tab.id ? '2.5px solid var(--cyan)' : '2.5px solid transparent', marginBottom: -1 }}>{tab.label}</button>
        ))}
      </div>

      {store.globalView && (
        <div style={{ background: 'var(--cyan)', padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--dark)' }}>⊞ Visão Global — todos os usuários</span>
          <button onClick={store.toggleGlobalView} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--dark)', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer', color: 'var(--dark)', textTransform: 'uppercase' }}>Voltar</button>
        </div>
      )}

      {store.error && (
        <div style={{ background: 'rgba(232,48,48,.1)', borderBottom: '1px solid rgba(232,48,48,.2)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ {store.error}</span>
          <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--danger)', borderRadius: 4, padding: '2px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer', color: 'var(--danger)' }}>Recarregar</button>
        </div>
      )}

      {store.loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--cyan)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          Carregando dados...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!store.loading && (
        <main style={{ maxWidth: 820, margin: '0 auto', padding: 20 }}>
          {view === 'geral'     && <VizaoGeral         store={store} showToast={showToast} onOpenReuniao={() => setModalReuniao(true)} />}
          {view === 'dashboard' && <DashboardAnalitico store={store} showToast={showToast} />}
          {view === 'clientes'  && <Clientes           store={store} showToast={showToast} />}
          {view === 'kanban'    && <Kanban             store={store} showToast={showToast} />}
          {view === 'agenda'    && <Agenda             store={store} showToast={showToast} />}
          {view === 'historico' && <Historico          store={store} showToast={showToast} />}
          {view === 'usuarios'  && isAdmin && <Usuarios store={store} showToast={showToast} />}
        </main>
      )}

      {!isViewer && <button className="fab" onClick={() => setModalTarefa(true)}>+</button>}

      <ModalTarefa  open={modalTarefa}  onClose={() => setModalTarefa(false)}  store={store} showToast={showToast} />
      <ModalReuniao open={modalReuniao} onClose={() => setModalReuniao(false)} store={store} showToast={showToast} />
      <ModalExport  open={modalExport}  onClose={() => setModalExport(false)}  store={store} showToast={showToast} />

      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </>
  );
}
