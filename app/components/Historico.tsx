'use client';

import { StoreAPI } from '@/hooks/useStore';
import { fmtBR } from '@/lib/store';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

type Evento = {
  date: string;  // YYYY-MM-DD
  hora?: string;
  tipo: 'reuniao' | 'agenda' | 'extra' | 'scan' | 'recheck';
  status?: 'ocorreu' | 'nao';
  motivo?: string;
  clienteId?: string;
  desc?: string;
  // só para reuniao
  reuniaoId?: string;
  obs?: string;
};

export default function Historico({ store }: Props) {
  const { state } = store;

  /* ── Monta lista unificada de eventos ── */
  const eventos: Evento[] = [];

  // 1. Reuniões registradas manualmente
  state.reunioes.forEach(r => {
    eventos.push({ date: r.data, tipo: 'reuniao', reuniaoId: r.id, obs: r.obs });
  });

  // 2. Ocorrências de agendas recorrentes
  Object.entries(state.ocorrencias).forEach(([key, oc]) => {
    if (!oc?.status) return;
    const [agendaId, date] = key.split('_');
    const agenda  = state.agendas.find(a => a.id === agendaId);
    if (!agenda) return;
    eventos.push({
      date, tipo: 'agenda',
      status: oc.status as 'ocorreu' | 'nao',
      motivo: oc.motivo,
      clienteId: agenda.clienteId,
      hora: agenda.hora,
    });
  });

  // 3. Agendas extras confirmadas
  state.agendasExtras
    .filter(e => e.status === 'ocorreu' || e.status === 'nao')
    .forEach(e => {
      eventos.push({
        date: e.data, tipo: 'extra',
        status: e.status as 'ocorreu' | 'nao',
        motivo: e.motivo,
        clienteId: e.clienteId,
        hora: e.hora,
        desc: e.descricao,
      });
    });

  // 4. Ocorrências de scans
  Object.entries(state.scanOcorrencias).forEach(([key, oc]) => {
    if (!oc?.status) return;
    const [scanId, date] = key.split('_');
    const scan = state.scans.find(s => s.id === scanId);
    if (!scan) return;
    eventos.push({
      date, tipo: 'scan',
      status: oc.status as 'ocorreu' | 'nao',
      motivo: (oc as any).motivo,
      clienteId: scan.clienteId,
      hora: scan.hora,
    });
  });

  // 5. Rechecks confirmados
  state.recheks
    .filter(r => r.status === 'ocorreu' || r.status === 'nao')
    .forEach(r => {
      eventos.push({
        date: r.data, tipo: 'recheck',
        status: r.status as 'ocorreu' | 'nao',
        motivo: r.motivo,
        clienteId: r.clienteId,
        hora: r.hora,
        desc: r.descricao,
      });
    });

  /* ── Agrupa por data (desc) ── */
  const porData: Record<string, Evento[]> = {};
  eventos.forEach(ev => {
    if (!porData[ev.date]) porData[ev.date] = [];
    porData[ev.date].push(ev);
  });
  const datas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

  /* ── Helpers visuais ── */
  const labelTipo: Record<Evento['tipo'], string> = {
    reuniao:  'Reunião',
    agenda:   'Reunião',
    extra:    'Extra',
    scan:     'Scan',
    recheck:  'Recheck',
  };
  const colorTipo: Record<Evento['tipo'], string> = {
    reuniao:  'var(--cyan)',
    agenda:   'var(--cyan)',
    extra:    'var(--danger)',
    scan:     'var(--warn)',
    recheck:  '#7c3aed',
  };
  const bgTipo: Record<Evento['tipo'], string> = {
    reuniao:  'rgba(13,219,255,.1)',
    agenda:   'rgba(13,219,255,.1)',
    extra:    'rgba(232,48,48,.1)',
    scan:     'rgba(232,131,10,.1)',
    recheck:  'rgba(124,58,237,.1)',
  };
  const borderTipo: Record<Evento['tipo'], string> = {
    reuniao:  'rgba(13,219,255,.3)',
    agenda:   'rgba(13,219,255,.3)',
    extra:    'rgba(232,48,48,.2)',
    scan:     'rgba(232,131,10,.2)',
    recheck:  'rgba(124,58,237,.2)',
  };

  const diasCurtos = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
        Histórico de atividades
      </div>

      {datas.length === 0 && (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: 10 }}>Nenhuma atividade confirmada ainda.</div>
      )}

      {datas.map(dt => {
        const evsDoDia = porData[dt].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
        const d = new Date(dt + 'T12:00:00');
        const diaSem = diasCurtos[d.getDay()];

        return (
          <div key={dt} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(35,31,32,.06)' }}>
            {/* Header do dia */}
            <div style={{ background: 'var(--dark)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'var(--cyan)', color: 'var(--dark)', borderRadius: 5, padding: '3px 10px', fontWeight: 800, fontSize: 13 }}>{fmtBR(dt)}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{diaSem} · {evsDoDia.length} registro{evsDoDia.length !== 1 ? 's' : ''}</div>
            </div>

            {evsDoDia.map((ev, i) => {
              const cliente = ev.clienteId ? state.clientes.find(c => c.id === ev.clienteId) : undefined;
              const cor     = colorTipo[ev.tipo];
              const tag     = (
                <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', background: bgTipo[ev.tipo], color: cor, border: `1px solid ${borderTipo[ev.tipo]}` }}>
                  {labelTipo[ev.tipo]}
                </span>
              );

              // Reunião manual: mostra tarefas
              if (ev.tipo === 'reuniao' && ev.reuniaoId) {
                const tarefas = state.tarefas.filter(t => t.reuniaoId === ev.reuniaoId);
                return (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                      {tag}
                      {ev.obs && <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>{ev.obs}</span>}
                    </div>
                    {tarefas.length > 0 ? (
                      state.clientes.map(c => {
                        const ts = tarefas.filter(t => t.clienteId === c.id);
                        if (!ts.length) return null;
                        const conc = ts.filter(t => t.status === 'concluida' || t.status === 'finalizado').length;
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px 7px 24px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                            <div style={{ flex: 1, fontWeight: 700 }}>{c.nome}</div>
                            <div style={{ color: 'var(--muted)' }}>{ts.length} tarefa{ts.length !== 1 ? 's' : ''}</div>
                            <div>{conc === ts.length
                              ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,.12)', color: 'var(--success)', border: '1px solid rgba(34,197,94,.25)' }}>✓ ok</span>
                              : <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: 'rgba(232,48,48,.08)', color: 'var(--danger)', border: '1px solid rgba(232,48,48,.2)' }}>{conc}/{ts.length}</span>}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '7px 14px 7px 24px', color: 'var(--muted)', fontSize: 11 }}>Sem tarefas nesta reunião</div>
                    )}
                  </div>
                );
              }

              // Demais eventos (agenda, extra, scan, recheck)
              const statusOk  = ev.status === 'ocorreu';
              const statusNao = ev.status === 'nao';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: statusNao ? '#fff5f5' : 'white' }}>
                  {ev.hora && (
                    <div style={{ fontWeight: 600, fontSize: 12, color: cor, flexShrink: 0, width: 40 }}>{ev.hora}</div>
                  )}
                  {cliente && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cliente.cor, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{cliente?.nome ?? '—'}</span>
                      {tag}
                    </div>
                    {ev.desc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{ev.desc}</div>}
                    {statusNao && ev.motivo && (
                      <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontStyle: 'italic' }}>✗ {ev.motivo}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {statusOk && (
                      <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: 'rgba(34,197,94,.12)', color: 'var(--success)', border: '1px solid rgba(34,197,94,.25)' }}>✓ Ocorreu</span>
                    )}
                    {statusNao && (
                      <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: 'rgba(232,48,48,.08)', color: 'var(--danger)', border: '1px solid rgba(232,48,48,.2)' }}>✗ Não ocorreu</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
