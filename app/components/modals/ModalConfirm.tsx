'use client';

interface Props {
  open:      boolean;
  titulo:    string;
  mensagem:  string;
  onConfirm: () => void;
  onCancel:  () => void;
  corBotao?: string; // default: var(--danger)
  labelOk?:  string; // default: 'Remover'
}

export default function ModalConfirm({
  open, titulo, mensagem, onConfirm, onCancel,
  corBotao = 'var(--danger)', labelOk = 'Remover',
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(35,31,32,.75)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--ivory)', borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 400, borderTop: `3px solid ${corBotao}`, boxShadow: '0 20px 60px rgba(35,31,32,.25)', animation: 'popIn .18s ease' }}>
        <style>{`@keyframes popIn { from { transform: scale(.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>

        {/* Ícone */}
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${corBotao}15`, border: `1.5px solid ${corBotao}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
          {corBotao === 'var(--danger)' ? '🗑' : '⚠️'}
        </div>

        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>{mensagem}</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '11px', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'var(--muted)', transition: 'all .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--muted)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
          >Cancelar</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '11px', background: corBotao, border: 'none', borderRadius: 8, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: 'white', transition: 'all .15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '.85'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
          >{labelOk}</button>
        </div>
      </div>
    </div>
  );
}
