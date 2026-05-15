'use client';

import { useState, useMemo } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { gerarHTMLRelatorio, buildRelatorioData, semanasDoMes } from '@/lib/relatorio';

interface Props {
  open:      boolean;
  onClose:   () => void;
  store:     StoreAPI;
  showToast: (msg: string) => void;
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function ModalRelatorio({ open, onClose, store, showToast }: Props) {
  const hoje = new Date();
  const [mesBase,   setMesBase]   = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [semanaIdx, setSemanaIdx] = useState(0);
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [gerando,   setGerando]   = useState(false);

  if (!open) return null;

  const semanas = semanasDoMes(mesBase);
  const semana  = semanas[Math.min(semanaIdx, semanas.length - 1)];

  const todosDaSemana = semana
    ? buildRelatorioData(store.state, semana.de, semana.ate, []).clientes
    : [];

  const selecionados = todosDaSemana.filter(c => !excluidos.has(c.id));

  const totalTarefas     = selecionados.reduce((s, c) => s + c.tarefas.length, 0);
  const totalComentarios = selecionados.reduce((s, c) => s + c.tarefas.reduce((a, t) => a + t.comentarios.length, 0), 0);

  function navMes(delta: number) {
    setMesBase(m => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSemanaIdx(0);
    setExcluidos(new Set());
  }

  function changeSemana(i: number) {
    setSemanaIdx(i);
    setExcluidos(new Set());
  }

  function toggleCliente(id: string) {
    setExcluidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExportar() {
    if (!semana || !selecionados.length) return;
    setGerando(true);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1px;border:none;';
    document.body.appendChild(iframe);

    try {
      const filtroIds = selecionados.length < todosDaSemana.length ? selecionados.map(c => c.id) : [];
      const mesStr    = semana.mesLabel.replace(/\s+/g, '_');
      const filename  = `GCV_Relatorio_Semana${semana.ocorrencia}_${mesStr}.pdf`;
      const html      = gerarHTMLRelatorio(store.state, semana.de, semana.ate, filtroIds, filename);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Sem acesso ao iframe');
      iframeDoc.open(); iframeDoc.write(html); iframeDoc.close();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout ao gerar PDF')), 30000);
        const handler = (e: MessageEvent) => {
          if (e.data === 'gcv-pdf-done')  { clearTimeout(timeout); window.removeEventListener('message', handler); resolve(); }
          if (e.data === 'gcv-pdf-error') { clearTimeout(timeout); window.removeEventListener('message', handler); reject(new Error('Erro no PDF')); }
        };
        window.addEventListener('message', handler);
      });

      showToast('PDF baixado ✓');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF');
    } finally {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      setGerando(false);
    }
  }

  const lbl = (txt: string) => (
    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{txt}</label>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto', borderTop: '2.5px solid var(--cyan)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Relatório <span style={{ color: 'var(--cyan-dim)' }}>Semanal GCV</span></div>
          <button onClick={onClose} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
        </div>

        {/* Navegador de mês */}
        {lbl('Mês')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: 'var(--dark)', borderRadius: 8, padding: '10px 14px' }}>
          <button onClick={() => navMes(-1)} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,.7)', fontSize: 13 }}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 14, color: 'white' }}>
            {MESES[mesBase.getMonth()]} {mesBase.getFullYear()}
          </div>
          <button onClick={() => navMes(1)} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,.7)', fontSize: 13 }}>›</button>
        </div>

        {/* Semanas do mês */}
        {lbl('Semana do mês')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
          {semanas.map((s, i) => (
            <button key={i} onClick={() => changeSemana(i)} style={{ padding: '10px 6px', borderRadius: 6, border: `1.5px solid ${semanaIdx === i ? 'var(--cyan-dim)' : 'var(--border)'}`, background: semanaIdx === i ? 'var(--cyan-dim)' : 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: semanaIdx === i ? 'var(--dark)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5 }}>{s.ocorrencia}ª Sem</div>
              <div style={{ fontSize: 9, color: semanaIdx === i ? 'rgba(35,31,32,.6)' : 'var(--muted)', marginTop: 3 }}>
                {s.de.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} –<br/>
                {s.ate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
            </button>
          ))}
        </div>

        {/* Clientes da semana */}
        {semana && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              {lbl(`Clientes (${selecionados.length}/${todosDaSemana.length})`)}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setExcluidos(new Set())} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1px solid var(--cyan-dim)', background: 'none', color: 'var(--cyan-dim)' }}>Todos</button>
                <button onClick={() => setExcluidos(new Set(todosDaSemana.map(c => c.id)))} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)' }}>Nenhum</button>
              </div>
            </div>

            {todosDaSemana.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>
                Nenhum cliente com agenda e tarefas nesta semana
              </div>
            ) : (
              <div style={{ background: 'var(--dark)', borderRadius: 10, padding: '8px 4px', marginBottom: 16 }}>
                {todosDaSemana.map(c => {
                  const sel = !excluidos.has(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleCliente(c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', borderRadius: 6, border: 'none', background: sel ? 'rgba(255,255,255,.06)' : 'transparent', cursor: 'pointer', marginBottom: 2 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${sel ? c.cor : 'rgba(255,255,255,.2)'}`, background: sel ? c.cor : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sel && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <span style={{ fontWeight: 800, fontSize: 12, color: sel ? 'white' : 'rgba(255,255,255,.3)' }}>{c.nome}</span>
                        {c.data && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginLeft: 8 }}>{c.diaNome} {c.data}{c.hora ? ' · ' + c.hora : ''}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: sel ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.2)' }}>{c.tarefas.length}t</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Preview stats */}
        {selecionados.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Clientes',    value: selecionados.length, color: 'var(--cyan)'    },
              { label: 'Tarefas',     value: totalTarefas,        color: 'var(--warn)'    },
              { label: 'Comentários', value: totalComentarios,    color: 'var(--success)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--dark)', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 24, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handleExportar}
          disabled={gerando || selecionados.length === 0}
          style={{
            width: '100%', padding: 13,
            background: gerando || selecionados.length === 0 ? 'var(--border)' : 'var(--cyan-dim)',
            color: gerando || selecionados.length === 0 ? 'var(--muted)' : 'var(--dark)',
            border: 'none', borderRadius: 6, fontFamily: 'inherit',
            fontWeight: 800, fontSize: 13,
            cursor: gerando || selecionados.length === 0 ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', letterSpacing: .8,
            transition: 'background .15s',
          }}
        >
          {gerando ? 'Gerando PDF...' : selecionados.length === 0 ? 'Selecione ao menos um cliente' : `↓ Baixar PDF (${selecionados.length} cliente${selecionados.length !== 1 ? 's' : ''})`}
        </button>

        {gerando && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
            Aguarde — carregando fontes e gerando o arquivo...
          </div>
        )}
      </div>
    </div>
  );
}
