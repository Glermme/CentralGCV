'use client';

import { StoreAPI } from '@/hooks/useStore';
import { fmtBR } from '@/lib/store';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function Historico({ store }: Props) {
  const { state } = store;
  const reunioes = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
        Reuniões Registradas
      </div>

      {reunioes.length === 0 && (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: 10 }}>Nenhuma reunião registrada.</div>
      )}

      {reunioes.map(r => {
        const tDR = state.tarefas.filter(t => t.reuniaoId === r.id);
        return (
          <div key={r.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(35,31,32,.06)' }}>
            <div style={{ background: 'var(--dark)', padding: '9px 14px', fontWeight: 800, fontSize: 12, color: 'var(--cyan)', display: 'flex', gap: 8, alignItems: 'center' }}>
              📅 {fmtBR(r.data)}
              {r.obs && <span style={{ color: 'rgba(255,255,255,.45)', fontWeight: 400 }}>— {r.obs}</span>}
            </div>

            {state.clientes.map(c => {
              const ts = tDR.filter(t => t.clienteId === c.id);
              if (!ts.length) return null;
              const conc = ts.filter(t => t.status === 'concluida').length;
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor }} />
                  <div style={{ flex: 1, fontWeight: 700 }}>{c.nome}</div>
                  <div style={{ color: 'var(--muted)' }}>{ts.length} tarefa{ts.length !== 1 ? 's' : ''}</div>
                  <div>
                    {conc === ts.length
                      ? <span className="badge b-ok">✓ ok</span>
                      : <span className="badge b-pend">{conc}/{ts.length}</span>}
                  </div>
                </div>
              );
            })}

            {tDR.length === 0 && (
              <div style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 11 }}>Sem tarefas nesta reunião</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
