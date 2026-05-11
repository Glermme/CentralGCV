'use client';

import { useState, useEffect, useRef } from 'react';
import { StoreAPI } from '@/hooks/useStore';
import { loadPerfis, updatePerfilRole, updatePerfilNome } from '@/lib/db';
import { supabase } from '@/lib/supabase';

interface Props {
  store: StoreAPI;
  showToast: (msg: string) => void;
}

interface Perfil {
  id:         string;
  nome:       string;
  email:      string;
  role:       string;
  avatar_url: string;
  criado_em:  string;
}

const ROLES = ['admin', 'analista', 'viewer'];

const roleColor: Record<string, string> = {
  admin:    'var(--cyan-dim)',
  analista: 'var(--success)',
  viewer:   'var(--muted)',
};

export default function Usuarios({ store, showToast }: Props) {
  const { userId } = store;
  const [perfis,        setPerfis]        = useState<Perfil[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingNome,   setEditingNome]   = useState<Record<string, string>>({});
  const [uploadingId,   setUploadingId]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingForId = useRef<string | null>(null);

  useEffect(() => {
    loadPerfis().then(data => {
      setPerfis(data as Perfil[]);
      setLoading(false);
    });
  }, []);

  async function handleRoleChange(uid: string, role: string) {
    await updatePerfilRole(uid, role);
    setPerfis(p => p.map(u => u.id === uid ? { ...u, role } : u));
    showToast('Role atualizada ✓');
  }

  async function handleNomeSave(uid: string) {
    const nome = editingNome[uid];
    if (!nome?.trim()) return;
    await updatePerfilNome(uid, nome.trim());
    setPerfis(p => p.map(u => u.id === uid ? { ...u, nome: nome.trim() } : u));
    setEditingNome(p => { const n = { ...p }; delete n[uid]; return n; });
    showToast('Nome atualizado ✓');
  }

  function handleAvatarClick(uid: string) {
    if (uid !== userId) return; // só edita o próprio
    uploadingForId.current = uid;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const uid  = uploadingForId.current;
    if (!file || !uid) return;
    e.target.value = '';

    setUploadingId(uid);
    const ext  = file.name.split('.').pop();
    const path = `${uid}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatares')
      .upload(path, file, { upsert: true });

    if (error) { showToast('Erro ao enviar foto'); setUploadingId(null); return; }

    const { data: { publicUrl } } = supabase.storage
      .from('avatares')
      .getPublicUrl(path);

    await supabase.from('perfis').update({ avatar_url: publicUrl }).eq('id', uid);
    setPerfis(p => p.map(u => u.id === uid ? { ...u, avatar_url: publicUrl } : u));
    setUploadingId(null);
    showToast('Foto atualizada ✓');
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) { showToast('Digite o e-mail'); return; }
    setInviteLoading(true);
    const { error } = await supabase.auth.signUp({
      email: inviteEmail.trim(),
      password: Math.random().toString(36).slice(2, 10) + 'A1!',
      options: { emailRedirectTo: window.location.origin + '/login' }
    });
    setInviteLoading(false);
    if (error) { showToast('Erro: ' + error.message); return; }
    showToast(`Convite enviado para ${inviteEmail} ✓`);
    setInviteEmail('');
    const data = await loadPerfis();
    setPerfis(data as Perfil[]);
  }

  const secLabel = (txt: string) => (
    <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-block', width: 14, height: 2, background: 'var(--cyan)', borderRadius: 1 }} />
      {txt}
    </div>
  );

  return (
    <div>
      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Convidar usuário */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>
          Convidar <span style={{ color: 'var(--cyan-dim)' }}>Usuário</span>
        </div>
        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>E-mail</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="colaborador@email.com"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'white' }}
          />
          <button
            onClick={handleInvite}
            disabled={inviteLoading}
            style={{ background: 'var(--cyan-dim)', color: 'var(--dark)', border: 'none', borderRadius: 6, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 800, fontSize: 11, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .5, opacity: inviteLoading ? .6 : 1 }}
          >
            {inviteLoading ? 'Enviando...' : 'Convidar'}
          </button>
        </div>
      </div>

      {secLabel('Usuários do Sistema')}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Carregando...</div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {perfis.map((u, i) => {
            const isMe     = u.id === userId;
            const nomEdit  = editingNome[u.id] ?? u.nome ?? u.email.split('@')[0];
            const uploading = uploadingId === u.id;

            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: i < perfis.length - 1 ? '1px solid var(--border)' : 'none',
                background: isMe ? 'var(--ivory2)' : 'white',
              }}>
                {/* Avatar */}
                <div
                  onClick={() => handleAvatarClick(u.id)}
                  title={isMe ? 'Clique para trocar a foto' : ''}
                  style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    overflow: 'hidden', position: 'relative',
                    cursor: isMe ? 'pointer' : 'default',
                    border: isMe ? '2px solid var(--cyan-dim)' : '2px solid transparent',
                  }}
                >
                  {uploading ? (
                    <div style={{ width: '100%', height: '100%', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 14, height: 14, border: '2px solid var(--cyan)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    </div>
                  ) : u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: 'var(--cyan)' }}>
                      {(u.nome || u.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isMe && !uploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      <span style={{ fontSize: 16 }}>📷</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    {isMe ? (
                      <input
                        value={nomEdit}
                        onChange={e => setEditingNome(p => ({ ...p, [u.id]: e.target.value }))}
                        onBlur={() => handleNomeSave(u.id)}
                        onKeyDown={e => e.key === 'Enter' && handleNomeSave(u.id)}
                        style={{ fontWeight: 700, fontSize: 13, border: 'none', borderBottom: '1px dashed var(--border)', outline: 'none', background: 'transparent', fontFamily: 'inherit', color: 'var(--dark)', maxWidth: 200, padding: '0 2px' }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark)' }}>{u.nome || u.email.split('@')[0]}</span>
                    )}
                    {isMe && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyan-dim)', background: 'var(--cyan-soft)', border: '1px solid rgba(13,219,255,.2)', borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: .5 }}>você</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                </div>

                {/* Role selector */}
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  disabled={isMe}
                  style={{
                    padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 4,
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 800,
                    cursor: isMe ? 'not-allowed' : 'pointer',
                    background: 'white', color: roleColor[u.role] || 'var(--muted)',
                    opacity: isMe ? .6 : 1,
                  }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            );
          })}

          {perfis.length === 0 && (
            <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>Nenhum usuário encontrado.</div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--ivory2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--cyan-dim)' }}>Admin</strong> — acesso total, gerencia usuários e vê dados de todos.<br />
        <strong style={{ color: 'var(--success)' }}>Analista</strong> — cria e edita clientes, tarefas e agenda.<br />
        <strong style={{ color: 'var(--muted)' }}>Viewer</strong> — somente visualização, sem edição.
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
