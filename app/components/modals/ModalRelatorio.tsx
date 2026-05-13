'use client';

import { useState, useMemo } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { gerarHTMLRelatorio, buildRelatorioData, proximasSemanas } from '@/lib/relatorio';

interface Props {
  open:      boolean;
  onClose:   () => void;
  store:     StoreAPI;
  showToast: (msg: string) => void;
}

export default function ModalRelatorio({ open, onClose, store, showToast }: Props) {
  const semanas = useMemo(() => proximasSemanas(4), []);

  const [semanaIdx,       setSemanaIdx]       = useState(0);
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [gerando,         setGerando]         = useState(false);

  if (!open) return null;

  const semanaAtual = semanas[semanaIdx];
  const { clientes, totalTarefas, totalComentarios } = buildRelatorioData(
    store.state, semanaAtual.de, semanaAtual.ate, filtroClienteId
  );

  async function handleExportar() {
    setGerando(true);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1px;border:none;';
    document.body.appendChild(iframe);

    try {
      const nomeCliente = filtroClienteId
        ? store.state.clientes.find(c => c.id === filtroClienteId)?.nome?.replace(/\s+/g, '_') || 'cliente'
        : 'todos';
      const semanaLabel = `semana${semanaIdx + 1}`;
      const filename = `GCV_Relatorio_${nomeCliente}_${semanaLabel}.pdf`;

      // Gera o HTML do relatório — inclui o script do html2pdf e chama window.print() de dentro
      const html = gerarHTMLRelatorio(
        store.state, semanaAtual.de, semanaAtual.ate, filtroClienteId,
        filename,
      );

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Sem acesso ao iframe');

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Aguarda o script interno do iframe terminar e disparar o evento 'gcv-pdf-done'
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout ao gerar PDF')), 30000);

        // O HTML gerado dispara window.parent.postMessage quando termina
        const handler = (e: MessageEvent) => {
          if (e.data === 'gcv-pdf-done') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            resolve();
          }
          if (e.data === 'gcv-pdf-error') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            reject(new Error('Erro interno no iframe'));
          }
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
      <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, borderTop: '2.5px solid var(--cyan)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Relatório <span style={{ color: 'var(--cyan-dim)' }}>Semanal GCV</span></div>
          <button onClick={onClose} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            {lbl('Semana')}
            <select
              value={semanaIdx}
              onChange={e => setSemanaIdx(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              {semanas.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            {lbl('Cliente')}
            <select
              value={filtroClienteId}
              onChange={e => setFiltroClienteId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, background: 'white', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Todos os clientes</option>
              {store.state.clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        <div style={{ background: 'var(--dark)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 14 }}>
            Prévia — {semanaAtual.label}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: clientes.length > 0 ? 16 : 0 }}>
            {[
              { label: 'Clientes',    value: clientes.length,    color: 'var(--cyan)'    },
              { label: 'Tarefas',     value: totalTarefas,        color: 'var(--warn)'    },
              { label: 'Comentários', value: totalComentarios,    color: 'var(--success)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 28, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {clientes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>
              Nenhum cliente com agenda e tarefas abertas nesse período
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clientes.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,.05)', borderRadius: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'white' }}>{c.nome}</span>
                    {c.data && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginLeft: 8 }}>{c.diaNome} {c.data}{c.hora ? ' · ' + c.hora : ''}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{c.tarefas.length} tarefa{c.tarefas.length !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão */}
        <button
          onClick={handleExportar}
          disabled={gerando || clientes.length === 0}
          style={{
            width: '100%', padding: 13,
            background: gerando || clientes.length === 0 ? 'var(--border)' : 'var(--cyan-dim)',
            color: gerando || clientes.length === 0 ? 'var(--muted)' : 'var(--dark)',
            border: 'none', borderRadius: 6, fontFamily: 'inherit',
            fontWeight: 800, fontSize: 13,
            cursor: gerando || clientes.length === 0 ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', letterSpacing: .8,
            transition: 'background .15s',
          }}
        >{gerando ? 'Gerando PDF...' : '↓ Baixar PDF'}</button>

        {gerando && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
            Aguarde — carregando fontes e gerando o arquivo...
          </div>
        )}
      </div>
    </div>
  );
}