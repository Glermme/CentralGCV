'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { isLate, fmtBR, labelStatus, fmtDate } from '@/lib/store';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

const COLUNAS = [
  { status: 'pendente',  label: 'Pendente',      color: 'var(--warn)'    },
  { status: 'andamento', label: 'Em Andamento',   color: 'var(--cyan)'    },
  { status: 'concluida', label: 'Concluída',      color: 'var(--success)' },
] as const;

export default function Kanban({ store, showToast }: Props) {
  const { state, cycleStatus, delTarefa } = store;
  const { tarefas, clientes, reunioes } = state;

  const [filtCliente, setFiltCliente] = useState('');
  const [filtStatus,  setFiltStatus]  = useState('');
  const [filtReuniao, setFiltReuniao] = useState('');

  // Semanas disponíveis das reuniões
  const semanasReuniao = [...reunioes]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 10);

  // Filtra tarefas
  const tarefasFiltradas = tarefas.filter(t => {
    if (filtCliente && t.clienteId !== filtCliente) return false;
    if (filtStatus  && t.status    !== filtStatus)  return false;
    if (filtReuniao && t.reuniaoId !== filtReuniao)  return false;
    return true;
  });

  const tarefasPorStatus = (status: string) =>
    tarefasFiltradas.filter(t => t.status === status);

  const totalFiltradas = tarefasFiltradas.length;
  const temFiltro = filtCliente || filtStatus || filtReuniao;

  return (
    <div>
      {/* Filtros */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Filtros</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filtCliente}
            onChange={e => setFiltCliente(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, background: 'white', cursor: 'pointer', color: filtCliente ? 'var(--dark)' : 'var(--muted)' }}
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <select
            value={filtStatus}
            onChange={e => setFiltStatus(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, background: 'white', cursor: 'pointer', color: filtStatus ? 'var(--dark)' : 'var(--muted)' }}
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="andamento">Em andamento</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <select
            value={filtReuniao}
            onChange={e => setFiltReuniao(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, background: 'white', cursor: 'pointer', color: filtReuniao ? 'var(--dark)' : 'var(--muted)' }}
          >
            <option value="">Todas as reuniões</option>
            {semanasReuniao.map(r => <option key={r.id} value={r.id}>{fmtBR(r.data)}{r.obs ? ` — ${r.obs}` : ''}</option>)}
          </select>

          {temFiltro && (
            <button
              onClick={() => { setFiltCliente(''); setFiltStatus(''); setFiltReuniao(''); }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}
            >✕ Limpar</button>
          )}

          {temFiltro && (
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
              {totalFiltradas} tarefa{totalFiltradas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {COLUNAS.map(col => {
          const items = tarefasPorStatus(col.status);
          return (
            <div key={col.status}>
              {/* Header da coluna */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--dark)' }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 800, color: 'var(--muted)' }}>{items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
                {items.length === 0 && (
                  <div style={{ border: '1.5px dashed var(--border)', borderRadius: 8, padding: '20px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                    Nenhuma
                  </div>
                )}
                {items.map(t => {
                  const c    = clientes.find(x => x.id === t.clienteId);
                  const l    = isLate(t.prazo) && t.status !== 'concluida';
                  const hasC = t.comentarios.length > 0;
                  if (!c) return null;
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: 'white',
                        border: `1px solid ${l ? '#fecaca' : 'var(--border)'}`,
                        borderLeft: `3px solid ${c.cor}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        boxShadow: '0 1px 4px rgba(35,31,32,.05)',
                      }}
                    >
                      {/* Cliente */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.cor }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: c.cor, textTransform: 'uppercase', letterSpacing: .5 }}>{c.nome}</span>
                        {hasC && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--cyan-dim)' }}>💬{t.comentarios.length}</span>}
                      </div>

                      {/* Descrição */}
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: t.status === 'concluida' ? 'var(--muted)' : 'var(--dark)', textDecoration: t.status === 'concluida' ? 'line-through' : 'none', marginBottom: 8 }}>
                        {t.desc}
                      </div>

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {t.prazo && (
                          <span style={{ fontSize: 10, color: l ? 'var(--danger)' : 'var(--muted)', fontWeight: l ? 700 : 400 }}>
                            {l ? '⚠ ' : ''}{fmtBR(t.prazo)}
                          </span>
                        )}
                        <button
                          className={`spill sp-${t.status}`}
                          onClick={() => { cycleStatus(t.id); showToast('Status atualizado'); }}
                          style={{ fontSize: 9 }}
                        >{labelStatus(t.status)}</button>
                        <button
                          onClick={() => { delTarefa(t.id); showToast('Tarefa removida'); }}
                          style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--border)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px', borderRadius: 3 }}
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
