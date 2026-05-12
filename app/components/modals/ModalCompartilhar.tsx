'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { loadPerfis } from '@/lib/db';

interface Props {
  clienteId:   string;
  clienteNome: string;
  clienteCor:  string;
  ownerId:     string;
  userId:      string;
  onClose:     () => void;
  showToast:   (msg: string) => void;
}

interface Perfil {
  id:         string;
  nome:       string;
  email:      string;
  avatar_url: string;
}

interface Membro {
  user_id: string;
  role:    string;
}

export default function ModalCompartilhar({
  clienteId, clienteNome, clienteCor, ownerId, userId, onClose, showToast
}: Props) {
  const [perfis,  setPerfis]  = useState<Perfil[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ps, { data: ms }] = await Promise.all([
        loadPerfis(),
        supabase.from('cliente_membros').select('user_id, role').eq('cliente_id', clienteId),
      ]);
      setPerfis((ps as Perfil[]).filter(p => p.id !== ownerId));
      setMembros(ms || []);
      setLoading(false);
    }
    load();
  }, [clienteId, ownerId]);

  async function handleToggle(uid: string, role: string) {
    const isMembro = membros.find(m => m.user_id === uid);
    if (isMembro) {
      await supabase.from('cliente_membros')
        .delete().eq('cliente_id', clienteId).eq('user_id', uid);
      setMembros(p => p.filter(m => m.user_id !== uid));
      showToast('Acesso removido');
    } else {
      await supabase.from('cliente_membros')
        .insert({ cliente_id: clienteId, user_id: uid, role });
      setMembros(p => [...p, { user_id: uid, role }]);
      showToast('Acesso concedido ✓');
    }
  }

  async function handleRoleChange(uid: string, role: string) {
    await supabase.from('cliente_membros')
      .update({ role }).eq('cliente_id', clienteId).eq('user_id', uid);
    setMembros(p => p.map(m => m.user_id === uid ? { ...m, role } : m));
    showToast('Permissão atualizada ✓');
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--ivory)', borderRadius: '16px 16px 0 0', padding: '22px 20px 28px', width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto', borderTop: '2.5px solid var(--cyan)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: clienteCor }} />
            <div style={{ fontWeight: 800, fontSize: 17 }}>
              Compartilhar <span style={{ color: 'var(--cyan-dim)' }}>{clienteNome}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 5, width: 30, height: 30, cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Carregando...</div>
        ) : perfis.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            Nenhum outro usuário cadastrado ainda.
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {perfis.map((p, i) => {
              const membro = membros.find(m => m.user_id === p.id);
              const ativo  = !!membro;

              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < perfis.length - 1 ? '1px solid var(--border)' : 'none',
                  background: ativo ? 'rgba(13,219,255,.04)' : 'white',
                }}>
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--cyan)' }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (p.nome || p.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nome || p.email.split('@')[0]}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.email}</div>
                  </div>

                  {/* Role (só se ativo) */}
                  {ativo && (
                    <select
                      value={membro.role}
                      onChange={e => handleRoleChange(p.id, e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, background: 'white', color: membro.role === 'editor' ? 'var(--success)' : 'var(--muted)', cursor: 'pointer' }}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(p.id, 'editor')}
                    style={{
                      padding: '5px 12px', borderRadius: 5, fontSize: 10, fontWeight: 800,
                      cursor: 'pointer', border: 'none', letterSpacing: .5, textTransform: 'uppercase',
                      background: ativo ? 'rgba(232,48,48,.1)' : 'var(--cyan-soft)',
                      color: ativo ? 'var(--danger)' : 'var(--cyan-dim)',
                      border: ativo ? '1px solid rgba(232,48,48,.2)' : '1px solid rgba(13,219,255,.2)',
                    } as any}
                  >
                    {ativo ? 'Remover' : 'Compartilhar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--success)' }}>Editor</strong> — pode ver e editar tarefas deste cliente.<br />
          <strong style={{ color: 'var(--muted)' }}>Viewer</strong> — pode ver mas não editar.
        </div>
      </div>
    </div>
  );
}
