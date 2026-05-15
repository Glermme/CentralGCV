'use client';

import { StoreAPI } from '@/hooks/useStore';
import { isLate, fmtBR, fmtDate, labelStatus } from '@/lib/store';
import { getAgendaSlots } from '@/lib/agenda';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function Dashboard({ store, showToast }: Props) {
  const { state, cycleStatus } = store;
  const { tarefas, clientes } = state;

  const pend  = tarefas.filter(t => t.status !== 'finalizado' && t.status !== 'cancelada');
  const late  = pend.filter(t => isLate(t.prazo) && t.status !== 'concluida');
  const anda  = tarefas.filter(t => t.status === 'andamento');
  const conc  = tarefas.filter(t => t.status === 'concluida');

  // Próximas reuniões — 14 dias
  const hoje = new Date();
  const em14 = new Date(hoje); em14.setDate(hoje.getDate() + 14);
  const slots = getAgendaSlots(state.agendas, hoje, em14).sort((a, b) => a.date.getTime() - b.date.getTime());

  const porData: Record<string, typeof slots> = {};
  slots.forEach(s => {
    const k = fmtDate(s.date);
    if (!porData[k]) porData[k] = [];
    porData[k].push(s);
  });

  const stats = [
    { label: 'Em Aberto',    value: pend.length, color: 'var(--warn)'    },
    { label: 'Atrasadas',    value: late.length, color: 'var(--danger)'  },
    { label: 'Em Andamento', value: anda.length, color: 'var(--cyan)'    },
    { label: 'Concluídas',   value: conc.length, color: 'var(--success)' },
  ];

  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  return (
    <div>
      {/* Próximas reuniões */}
      {Object.entries(porData).slice(0, 3).map(([dt, ss]) => {
        const diaNome = diasCurtos[new Date(dt + 'T12:00:00').getDay()];
        return (
          <div key={dt} style={{
            background: 'var(--dark)', borderRadius: 10,
            overflow: 'hidden', marginBottom: 12,
            border: '1px solid var(--dark3)',
          }}>
            <div style={{
              background: 'var(--dark2)', padding: '11px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--dark3)',
            }}>
              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>{diaNome}</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--cyan)' }}>{fmtBR(dt)}</span>
            </div>
            {ss.map(s => {
              const c = clientes.find(x => x.id === s.clienteId);
              if (!c) return null;
              const pTasks = tarefas.filter(t => t.clienteId === c.id && t.status !== 'finalizado' && t.status !== 'cancelada');
              const atrs   = pTasks.filter(t => isLate(t.prazo));
              return (
                <div key={s.agendaId} style={{
                  display: 'flex', alignItems: 'center', padding: '11px 16px',
                  borderBottom: '1px solid var(--dark3)', gap: 12,
                }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>{c.nome}</div>
                    {c.empresa && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{c.empresa}</div>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 500 }}>{s.hora}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {atrs.length   > 0 && <span className="badge b-late">⚠{atrs.length}</span>}
                    {pTasks.length > 0
                      ? <span className="badge b-pend">{pTasks.length}</span>
                      : <span className="badge b-ok">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {Object.keys(porData).length === 0 && (
        <div style={{
          background: 'var(--dark)', borderRadius: 10, overflow: 'hidden',
          marginBottom: 12, border: '1px solid var(--dark3)',
        }}>
          <div style={{ background: 'var(--dark2)', padding: '11px 16px', borderBottom: '1px solid var(--dark3)' }}>
            <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Próximas Reuniões</span>
          </div>
          <div style={{ padding: 14, color: 'rgba(255,255,255,.3)', fontSize: 12, textAlign: 'center' }}>
            Nenhuma agenda nos próximos 14 dias
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--dark)', borderRadius: 8,
            padding: '14px 14px 12px',
            borderLeft: `3px solid ${s.color}`,
          }}>
            <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tarefas abertas */}
      <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
        Tarefas em Aberto
      </div>

      {pend.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>
          Nenhuma tarefa em aberto 🎉
        </div>
      ) : (
        [...pend]
          .sort((a, b) => (isLate(a.prazo) ? -1 : 0) - (isLate(b.prazo) ? -1 : 0))
          .map(t => {
            const c = clientes.find(x => x.id === t.clienteId);
            if (!c) return null;
            const l = isLate(t.prazo);
            return (
              <div key={t.id} style={{
                background: 'white',
                border: `1px solid ${l ? '#fecaca' : 'var(--border)'}`,
                borderLeft: `4px solid ${c.cor}`,
                borderRadius: 8, padding: '11px 14px', marginBottom: 8,
                boxShadow: '0 1px 4px rgba(35,31,32,.05)',
              }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{t.desc}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c.cor }}>{c.nome}</span>
                  {t.prazo && (
                    <span style={{ fontSize: 11, color: l ? 'var(--danger)' : 'var(--muted)' }}>
                      {l ? '⚠ ' : ''}{fmtBR(t.prazo)}
                    </span>
                  )}
                  <button
                    className={`spill sp-${t.status}`}
                    onClick={() => { cycleStatus(t.id); showToast('Status atualizado'); }}
                  >
                    {labelStatus(t.status)}
                  </button>
                  {t.comentarios.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--cyan-dim)', fontWeight: 700 }}>
                      💬 {t.comentarios.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}
