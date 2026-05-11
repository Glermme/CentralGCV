'use client';

import { useState } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { COLORS, DIAS, OCORR } from '@/lib/store';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

export default function Configurar({ store, showToast }: Props) {
  const { state, addCliente, delCliente, delAgenda, randomColor } = store;
  const [nome,          setNome]          = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  function handleAdd() {
    if (!nome.trim()) { showToast('Digite o nome'); return; }
    const used = state.clientes.map(c => c.cor.toLowerCase());
    if (used.includes(selectedColor.toLowerCase())) {
      showToast('Essa cor já está em uso — escolha outra ou use Aleatória');
      return;
    }
    addCliente(nome.trim(), nome.trim(), selectedColor);
    setNome('');
    const next = (COLORS.indexOf(selectedColor) + 1) % COLORS.length;
    setSelectedColor(COLORS[next] || COLORS[0]);
    showToast('Cliente adicionado ✓');
  }

  function handleRandom() {
    const c = randomColor();
    setSelectedColor(c);
    showToast('Cor aleatória gerada!');
  }

  function handleDel(id: string) {
    if (!confirm('Remover cliente e todas as tarefas?')) return;
    delCliente(id);
  }

  function handleDelAgenda(id: string) {
    if (!confirm('Remover esta recorrência?')) return;
    delAgenda(id);
    showToast('Recorrência removida');
  }

  const secLabel = (txt: string) => (
    <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
      {txt}
    </div>
  );

  return (
    <div>
      {/* Adicionar cliente */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
          Adicionar <span style={{ color: 'var(--cyan-dim)' }}>Cliente</span>
        </div>
        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Cliente / Empresa</label>
        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nome da empresa"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white', marginBottom: 12 }}
        />

        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Cor</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {COLORS.map(c => (
            <div
              key={c}
              onClick={() => setSelectedColor(c)}
              style={{
                width: 28, height: 28, borderRadius: 5, background: c, cursor: 'pointer',
                border: c === selectedColor ? '3px solid var(--dark)' : '3px solid transparent',
                transition: 'transform .15s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <input
            type="color"
            value={selectedColor}
            onChange={e => setSelectedColor(e.target.value)}
            style={{ width: 36, height: 36, padding: 2, border: '2px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none' }}
          />
          <button onClick={handleRandom} style={{ background: 'none', border: '1.5px dashed var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 10, fontFamily: 'inherit', fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase' }}>
            🎲 Aleatória
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 6, border: '2px solid var(--border)', background: selectedColor }} />
        </div>

        <button onClick={handleAdd} style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 5, padding: '9px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5 }}>
          Adicionar Cliente
        </button>
      </div>

      {/* Lista clientes */}
      {secLabel('Clientes Cadastrados')}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '0 18px', marginBottom: 20 }}>
        {state.clientes.length === 0
          ? <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 12 }}>Nenhum cliente.</div>
          : state.clientes.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 4, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 13, flexShrink: 0 }}>{c.nome.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.nome}</div>
                {c.empresa && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.empresa}</div>}
              </div>
              <button onClick={() => handleDel(c.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 4, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Remover</button>
            </div>
          ))}
      </div>

      {/* Lista agendas */}
      {secLabel('Agendas Recorrentes')}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '0 18px' }}>
        {state.agendas.length === 0
          ? <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 12 }}>Nenhuma agenda recorrente.</div>
          : state.agendas.map(ag => {
              const c    = state.clientes.find(x => x.id === ag.clienteId) || { nome: '?', cor: '#ccc' };
              const rule = `${OCORR[ag.ocorrencia]} ${DIAS[ag.diaSemana]} do mês · ${ag.hora}`;
              return (
                <div key={ag.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{rule}{ag.obs ? ' — ' + ag.obs : ''}</div>
                  </div>
                  <button onClick={() => handleDelAgenda(ag.id)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 4, padding: '5px 9px', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              );
            })}
      </div>
    </div>
  );
}
