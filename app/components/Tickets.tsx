'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { fmtBR, fmtDT, fmtDate } from '@/lib/store';
import { getAgendaSlots } from '@/lib/agenda';
import ModalConfirm from '@/components/modals/ModalConfirm';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

const STATUS_TICKET = [
  { value: 'aberto',         label: 'Aberto',         color: 'var(--warn)'    },
  { value: 'em_atendimento', label: 'Em Atendimento', color: 'var(--cyan)'    },
  { value: 'resolvido',      label: 'Resolvido',      color: 'var(--success)' },
  { value: 'fechado',        label: 'Fechado',        color: 'var(--muted)'   },
] as const;

function labelTicketStatus(s: string) {
  return STATUS_TICKET.find(x => x.value === s)?.label ?? s;
}
function colorTicketStatus(s: string) {
  return STATUS_TICKET.find(x => x.value === s)?.color ?? 'var(--muted)';
}

export default function Tickets({ store, showToast }: Props) {
  const { state, userId, userRole, addTicket, delTicket, updateTicket } = store;
  const isViewer = userRole === 'viewer';

  const [showForm,  setShowForm]  = useState(false);
  const [filtro,    setFiltro]    = useState<string>('');
  const [filtCli,   setFiltCli]   = useState('');
  const [editId,    setEditId]    = useState<string | null>(null);
  const [confirm,   setConfirm]   = useState<{ titulo: string; mensagem: string; onOk: () => void } | null>(null);

  // form fields
  const [fNome,     setFNome]     = useState('');
  const [fNumero,   setFNumero]   = useState('');
  const [fDesc,     setFDesc]     = useState('');
  const [fCliente,  setFCliente]  = useState('');
  const [fPrevisao, setFPrevisao] = useState('');
  const [fPrazo,    setFPrazo]    = useState('');
  const [fStatus,   setFStatus]   = useState<'aberto' | 'em_atendimento' | 'resolvido' | 'fechado'>('aberto');

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 5, fontFamily: 'inherit', fontSize: 12, marginBottom: 10, background: 'white', outline: 'none' };

  function proximaReuniaoDoCliente(clienteId: string): string {
    if (!clienteId) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const em90 = new Date(hoje); em90.setDate(hoje.getDate() + 90);
    // Reuniões recorrentes
    const agendasCli = state.agendas.filter(a => a.clienteId === clienteId);
    const slots = getAgendaSlots(agendasCli, hoje, em90).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (slots[0]) return fmtDate(slots[0].date);
    // Extras agendadas
    const todayStr = hoje.toISOString().split('T')[0];
    const futura = state.agendasExtras
      .filter(e => e.clienteId === clienteId && e.data >= todayStr)
      .sort((a, b) => a.data.localeCompare(b.data))[0];
    return futura?.data ?? '';
  }

  function handleClienteChange(id: string) {
    setFCliente(id);
    const proxima = proximaReuniaoDoCliente(id);
    if (proxima) setFPrazo(proxima);
  }

  function resetForm() {
    setFNome(''); setFNumero(''); setFDesc(''); setFCliente('');
    setFPrevisao(''); setFPrazo(''); setFStatus('aberto'); setEditId(null);
  }

  async function handleSave() {
    if (!fNome.trim()) { showToast('Informe o nome do ticket'); return; }
    if (editId) {
      await updateTicket(editId, {
        nome: fNome.trim(), numero: fNumero.trim(), descricao: fDesc.trim(),
        clienteId: fCliente, previsaoConclusao: fPrevisao, prazo: fPrazo, status: fStatus,
      });
      showToast('Ticket atualizado ✓');
    } else {
      await addTicket({
        nome: fNome.trim(), numero: fNumero.trim(), descricao: fDesc.trim(),
        clienteId: fCliente, previsaoConclusao: fPrevisao, prazo: fPrazo, status: fStatus,
      });
      showToast('Ticket adicionado ✓');
    }
    resetForm(); setShowForm(false);
  }

  function handleEdit(id: string) {
    const t = state.tickets.find(t => t.id === id); if (!t) return;
    setFNome(t.nome); setFNumero(t.numero); setFDesc(t.descricao);
    setFCliente(t.clienteId); setFPrevisao(t.previsaoConclusao); setFPrazo(t.prazo);
    setFStatus(t.status); setEditId(id); setShowForm(true);
  }

  const tickets = state.tickets.filter(t => {
    if (filtro   && t.status   !== filtro)   return false;
    if (filtCli  && t.clienteId !== filtCli) return false;
    return true;
  }).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const filtros = [
    { id: '',              label: 'Todos'          },
    { id: 'aberto',        label: 'Aberto'         },
    { id: 'em_atendimento',label: 'Em Atendimento' },
    { id: 'resolvido',     label: 'Resolvido'      },
    { id: 'fechado',       label: 'Fechado'        },
  ];

  return (
    <>
      <div>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
            Tickets · {tickets.length}
          </div>
          {!isViewer && (
            <button onClick={() => { resetForm(); setShowForm(f => !f); }}
              style={{ background: 'none', border: '1.5px solid var(--cyan-dim)', borderRadius: 5, padding: '6px 13px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: 'var(--cyan-dim)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}>
              + Novo Ticket
            </button>
          )}
        </div>

        {/* Filtros de status */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {filtros.map(f => {
            const color = f.id ? colorTicketStatus(f.id) : 'var(--muted)';
            return (
              <button key={f.id} onClick={() => setFiltro(f.id)}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: 10, fontFamily: 'inherit', fontWeight: 800, letterSpacing: .5, textTransform: 'uppercase', cursor: 'pointer', border: `1.5px solid ${filtro === f.id ? color : 'var(--border)'}`, background: filtro === f.id ? `${color}18` : 'white', color: filtro === f.id ? color : 'var(--muted)', transition: 'all .15s' }}>
                {f.label}
              </button>
            );
          })}

          <select value={filtCli} onChange={e => setFiltCli(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer', border: `1.5px solid ${filtCli ? 'var(--cyan-dim)' : 'var(--border)'}`, background: filtCli ? 'var(--cyan-soft)' : 'white', color: filtCli ? 'var(--cyan-dim)' : 'var(--muted)', outline: 'none' }}>
            <option value="">Todos os clientes</option>
            {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Formulário */}
        {showForm && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
              {editId ? 'Editar Ticket' : 'Novo Ticket'}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
              <input type="text" value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Nome do ticket *" style={{ ...inp, flex: 2 } as any} />
              <input type="text" value={fNumero} onChange={e => setFNumero(e.target.value)} placeholder="Número (ex: #1234)" style={{ ...inp, flex: 1 } as any} />
            </div>

            <select value={fCliente} onChange={e => handleClienteChange(e.target.value)} style={inp as any}>
              <option value="">Cliente (opcional)</option>
              {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            <textarea rows={2} value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Descrição (opcional)" style={{ ...inp, resize: 'none' } as any} />

            <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Previsão de conclusão</label>
                <input type="date" value={fPrevisao} onChange={e => setFPrevisao(e.target.value)} style={{ ...inp } as any} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Prazo (próx. reunião)</label>
                <input type="date" value={fPrazo} onChange={e => setFPrazo(e.target.value)} style={{ ...inp } as any} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Status</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as any)} style={{ ...inp } as any}>
                  {STATUS_TICKET.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave}
                style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>
                {editId ? 'Atualizar' : 'Salvar'}
              </button>
              <button onClick={() => { resetForm(); setShowForm(false); }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
            Nenhum ticket{filtro || filtCli ? ' com esses filtros' : '. Clique em + Novo Ticket'}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickets.map(t => {
              const cli      = state.clientes.find(c => c.id === t.clienteId);
              const stColor  = colorTicketStatus(t.status);
              const hoje     = new Date().toISOString().split('T')[0];
              const vencido  = t.prazo && t.prazo < hoje && t.status !== 'resolvido' && t.status !== 'fechado';
              return (
                <div key={t.id} style={{ background: 'white', border: `1px solid ${vencido ? '#fecaca' : 'var(--border)'}`, borderLeft: `4px solid ${stColor}`, borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(35,31,32,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Nome + número */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>{t.nome}</span>
                        {t.numero && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>#{t.numero}</span>}
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, background: `${stColor}18`, color: stColor, border: `1px solid ${stColor}33` }}>{labelTicketStatus(t.status)}</span>
                      </div>

                      {/* Cliente */}
                      {cli && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: cli.cor }} />
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{cli.nome}</span>
                        </div>
                      )}

                      {/* Descrição */}
                      {t.descricao && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>{t.descricao}</div>}

                      {/* Datas */}
                      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Criado: {fmtBR(t.criadoEm.split('T')[0])}</span>
                        {t.previsaoConclusao && <span style={{ fontSize: 10, color: 'var(--muted)' }}>Previsão: {fmtBR(t.previsaoConclusao)}</span>}
                        {t.prazo && <span style={{ fontSize: 10, color: vencido ? 'var(--danger)' : 'var(--muted)', fontWeight: vencido ? 700 : 400 }}>{vencido ? '⚠ Prazo: ' : 'Prazo: '}{fmtBR(t.prazo)}</span>}
                      </div>
                    </div>

                    {/* Ações */}
                    {!isViewer && (
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* Ciclo de status rápido */}
                        {STATUS_TICKET.filter(s => s.value !== t.status).slice(0, 2).map(s => (
                          <button key={s.value} onClick={() => { updateTicket(t.id, { status: s.value }); showToast(`Status → ${s.label}`); }}
                            style={{ padding: '4px 9px', borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: 'pointer', border: `1.5px solid ${s.color}`, background: 'none', color: s.color, textTransform: 'uppercase', letterSpacing: .3 }}>
                            {s.label}
                          </button>
                        ))}
                        <button onClick={() => handleEdit(t.id)}
                          style={{ padding: '4px 9px', borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: 'pointer', border: '1.5px solid var(--border)', background: 'none', color: 'var(--muted)' }}>
                          ✎ Editar
                        </button>
                        <button onClick={() => setConfirm({ titulo: 'Remover ticket', mensagem: `Remover "${t.nome}"?`, onOk: async () => { await delTicket(t.id); showToast('Ticket removido'); } })}
                          style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirm && (
        <ModalConfirm
          open={true}
          titulo={confirm.titulo}
          mensagem={confirm.mensagem}
          onConfirm={() => { confirm.onOk(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
