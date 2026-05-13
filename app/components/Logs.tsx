'use client';

import { useState, useEffect } from 'react';
import { loadLogs } from '@/lib/db';
import { fmtDT } from '@/lib/store';

interface Props {
  showToast: (msg: string) => void;
}

interface Log {
  id:          number;
  user_nome:   string;
  acao:        string;
  entidade:    string;
  entidade_id: string;
  detalhe:     string;
  criado_em:   string;
}

const acaoConfig: Record<string, { cor: string; icone: string }> = {
  criar:    { cor: 'var(--success)', icone: '＋' },
  editar:   { cor: 'var(--cyan-dim)', icone: '✎' },
  excluir:  { cor: 'var(--danger)',  icone: '✕' },
  status:   { cor: 'var(--warn)',    icone: '⟳' },
  login:    { cor: 'var(--muted)',   icone: '→' },
  logout:   { cor: 'var(--muted)',   icone: '←' },
  comentar: { cor: 'var(--cyan-dim)', icone: '💬' },
};

export default function Logs({ showToast }: Props) {
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState('');

  useEffect(() => {
    loadLogs(500).then(data => {
      setLogs(data as Log[]);
      setLoading(false);
    });
  }, []);

  async function handleRefresh() {
    setLoading(true);
    const data = await loadLogs(500);
    setLogs(data as Log[]);
    setLoading(false);
    showToast('Logs atualizados');
  }

  const filtrados = filtro
    ? logs.filter(l =>
        l.user_nome.toLowerCase().includes(filtro.toLowerCase()) ||
        l.acao.toLowerCase().includes(filtro.toLowerCase()) ||
        l.entidade.toLowerCase().includes(filtro.toLowerCase()) ||
        l.detalhe.toLowerCase().includes(filtro.toLowerCase())
      )
    : logs;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
          Logs de Atividade
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Filtrar..."
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, outline: 'none', background: 'white', width: 180 }}
          />
          <button
            onClick={handleRefresh}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px', fontSize: 10, fontFamily: 'inherit', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}
          >↻ Atualizar</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Carregando logs...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
          {filtro ? 'Nenhum log encontrado para esse filtro.' : 'Nenhuma atividade registrada ainda.'}
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {filtrados.map((log, i) => {
            const cfg = acaoConfig[log.acao] || { cor: 'var(--muted)', icone: '·' };
            return (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 16px',
                borderBottom: i < filtrados.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'white' : 'var(--ivory2)',
              }}>
                {/* Ícone de ação */}
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: `${cfg.cor}15`, border: `1px solid ${cfg.cor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: cfg.cor, fontWeight: 800,
                }}>{cfg.icone}</div>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text)' }}>{log.user_nome}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, color: cfg.cor, background: `${cfg.cor}12`, padding: '1px 6px', borderRadius: 3 }}>{log.acao}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{log.entidade}</span>
                    {log.entidade_id && <span style={{ fontSize: 10, color: 'var(--border)', fontFamily: 'monospace' }}>{log.entidade_id.slice(0, 8)}…</span>}
                  </div>
                  {log.detalhe && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>{log.detalhe}</div>
                  )}
                </div>

                {/* Data */}
                <div style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {fmtDT(log.criado_em)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>
        {filtrados.length} de {logs.length} registros
      </div>
    </div>
  );
}
