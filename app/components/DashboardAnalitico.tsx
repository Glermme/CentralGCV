'use client';

import { StoreAPI } from '@/hooks/useStore';
import { isLate, fmtBR } from '@/lib/store';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function DashboardAnalitico({ store }: Props) {
  const { state } = store;
  const { tarefas, clientes, agendasExtras } = state;

  // ── MÉTRICAS ──
  const total  = tarefas.length;
  const pend   = tarefas.filter(t => t.status === 'pendente').length;
  const anda   = tarefas.filter(t => t.status === 'andamento').length;
  const conc   = tarefas.filter(t => t.status === 'concluida').length;
  const fin    = tarefas.filter(t => t.status === 'finalizado').length;
  const late   = tarefas.filter(t => isLate(t.prazo) && t.status !== 'concluida' && t.status !== 'finalizado').length;
  const taxaConclusao = total ? Math.round((conc + fin) / total * 100) : 0;

  // Duração total de extras (em minutos)
  const totalMinutos = agendasExtras.reduce((acc, e) => {
    if (!e.duracao) return acc;
    const [h, m] = e.duracao.split(':').map(Number);
    return acc + (h || 0) * 60 + (m || 0);
  }, 0);
  const horasExtras = Math.floor(totalMinutos / 60);
  const minutosExtras = totalMinutos % 60;

  // ── RANKING DE CLIENTES ──
  const ranking = clientes
    .map(c => {
      const ts    = tarefas.filter(t => t.clienteId === c.id);
      const abertas = ts.filter(t => t.status !== 'finalizado' && t.status !== 'cancelada').length;
      const atrasadas = ts.filter(t => isLate(t.prazo) && t.status !== 'concluida' && t.status !== 'finalizado').length;
      const concluidas = ts.filter(t => t.status === 'concluida' || t.status === 'finalizado').length;
      const pct = ts.length ? Math.round(concluidas / ts.length * 100) : 0;
      return { c, total: ts.length, abertas, atrasadas, concluidas, pct };
    })
    .filter(r => r.total > 0)
    .sort((a, b) => b.abertas - a.abertas);

  // ── DISTRIBUIÇÃO POR STATUS ──
  const statusData = [
    { label: 'Pendente',     value: pend, color: 'var(--warn)'    },
    { label: 'Em andamento', value: anda, color: 'var(--cyan)'    },
    { label: 'Concluída',    value: conc, color: 'var(--success)' },
    { label: 'Finalizado',   value: fin,  color: 'var(--muted)'   },
  ].filter(s => s.value > 0);

  const maxBar = Math.max(...statusData.map(s => s.value), 1);

  // ── EXTRAS POR CLIENTE ──
  const extrasPorCliente = clientes
    .map(c => {
      const extras = agendasExtras.filter(e => e.clienteId === c.id);
      const mins   = extras.reduce((acc, e) => {
        if (!e.duracao) return acc;
        const [h, m] = e.duracao.split(':').map(Number);
        return acc + (h || 0) * 60 + (m || 0);
      }, 0);
      return { c, count: extras.length, mins };
    })
    .filter(r => r.count > 0)
    .sort((a, b) => b.mins - a.mins);

  const secLabel = (txt: string) => (
    <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
      {txt}
    </div>
  );

  return (
    <div>
      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Taxa de Conclusão', value: `${taxaConclusao}%`, color: 'var(--success)', sub: `${conc} de ${total} tarefas` },
          { label: 'Tarefas Atrasadas', value: late, color: 'var(--danger)', sub: late > 0 ? 'requerem atenção' : 'tudo em dia ✓' },
          { label: 'Horas em Extras', value: `${horasExtras}h${minutosExtras > 0 ? minutosExtras + 'min' : ''}`, color: 'var(--warn)', sub: `${agendasExtras.length} reunião${agendasExtras.length !== 1 ? 'ões' : ''} extra${agendasExtras.length !== 1 ? 's' : ''}` },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--dark)', borderRadius: 10, padding: '16px 18px', borderLeft: `3px solid ${card.color}` }}>
            <div style={{ fontWeight: 800, fontSize: 28, color: card.color, lineHeight: 1, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Distribuição por status */}
      {secLabel('Distribuição por Status')}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
        {statusData.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 10 }}>Nenhuma tarefa ainda</div>
        ) : (
          statusData.map(s => (
            <div key={s.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, background: s.color, width: `${s.value / maxBar * 100}%`, transition: 'width .5s' }} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ranking de clientes */}
      {secLabel('Ranking de Clientes')}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
        {ranking.length === 0 ? (
          <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>Nenhum cliente com tarefas</div>
        ) : (
          ranking.map((r, i) => (
            <div key={r.c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < ranking.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 20, fontWeight: 800, fontSize: 12, color: 'var(--muted)', textAlign: 'center', flexShrink: 0 }}>#{i + 1}</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.c.cor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.c.nome}</div>
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: '100%', borderRadius: 2, background: r.c.cor, width: `${r.pct}%` }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {r.atrasadas > 0 && <span className="badge b-late">⚠{r.atrasadas}</span>}
                {r.abertas > 0   && <span className="badge b-pend">{r.abertas} aberta{r.abertas !== 1 ? 's' : ''}</span>}
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.pct}%</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Extras por cliente */}
      {extrasPorCliente.length > 0 && (
        <>
          {secLabel('Reuniões Extras por Cliente')}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
            {extrasPorCliente.map((r, i) => {
              const h = Math.floor(r.mins / 60);
              const m = r.mins % 60;
              return (
                <div key={r.c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < extrasPorCliente.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.c.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.c.nome}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.count} reunião{r.count !== 1 ? 'ões' : ''}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--warn)' }}>{h}h{m > 0 ? `${m}min` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
