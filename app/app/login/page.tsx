'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email,   setEmail]   = useState('');
  const [senha,   setSenha]   = useState('');
  const [erro,    setErro]    = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setErro(''); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) { setErro('E-mail ou senha incorretos.'); return; }
    window.location.href = '/';
  }

  async function handleEsqueci() {
    if (!email) { setErro('Digite seu e-mail primeiro.'); return; }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    setErro('');
    alert('E-mail de recuperação enviado!');
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#231F20',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Isidora Sans', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 429 113" style={{ width: 180, height: 'auto' }}>
            <path fill="white" d="m159.52,51.27c-.02,9.3,7.09,17.25,16.44,17.28,9.1.02,16.37-7.9,16.39-17.2.02-9.3-7.22-17.01-16.32-17.03-9.34-.02-16.49,7.65-16.51,16.96m49.79.23c-.04,18.6-14.7,33.46-33.39,33.41-18.81-.04-33.29-14.96-33.25-33.56.04-18.61,14.58-33.46,33.39-33.41,18.69.04,33.29,14.96,33.25,33.56"/>
            <path fill="white" d="m296.28,68.07c-3.99,1.77-12.35,2.5-12.36-7.12l.06-21.75h10.61s7.17-16.92,7.17-16.92v-.34s-17.74-.04-17.74-.04l.04-20.59-17.66.04-.04,19.74-.05,15.94-.06,23.89c-.02,15.84,8.54,24.23,23.13,24.26,5.15.01,12.52-2.12,16.2-3.6l-9.29-13.51Z"/>
            <path fill="white" d="m322.31,35.21c2.48-2.29,5.61-3.44,9.39-3.43,4.1,0,7.4,1.38,9.88,4.1,2.05,2.13,3.31,5.01,3.78,8.61l-27.52-.06c.49-3.85,1.98-6.92,4.46-9.22m28.72,28.31c-4.3,4.62-9.94,6.94-16.95,6.93-4.42,0-8.16-1.28-11.21-3.79-3.05-2.52-4.78-4.65-5.17-9.38l45.86.1c.24-1.55.37-4.76.38-6.64.02-9.67-2.98-17.64-9-23.93-6.02-6.04-13.6-9.07-22.73-9.09-9.61-.02-17.52,3.16-23.7,9.55-6.19,6.39-9.29,14.46-9.31,24.21-.02,9.96,3.19,18.05,9.63,24.28,6.44,6.23,14.57,9.35,24.39,9.37,5.27.01,10.42-.95,15.45-2.88,4.91-1.89,8.95-4.74,12.14-8.53l-9.76-10.2Z"/>
            <path fill="white" d="m253.04,49.41c-2.71-1.56-7.77-3.53-15.02-5.87-1.7-.61-2.99-1.09-3.87-1.45-.84-.34-1.83-.82-2.92-1.44-.99-.56-1.7-1.17-2.12-1.83-.41-.65-.61-1.37-.61-2.2,0-1.46.67-2.59,2.03-3.45,1.47-.93,3.42-1.4,5.79-1.4h.05c5.31.04,10.19,2.32,14.52,6.75l10.4-10.4v-.29s-.21-.25-.21-.25c-2.53-3.01-6.05-5.48-10.46-7.33-4.39-1.84-9.25-2.78-14.46-2.79h-.09c-7.35,0-13.42,1.84-18.04,5.47-4.71,3.69-7.11,8.55-7.12,14.45,0,3.01.6,5.75,1.8,8.15,1.2,2.4,2.92,4.43,5.11,6.04,2.12,1.55,4.23,2.83,6.3,3.81,2.06.98,4.42,1.89,7.03,2.7.87.26,2.12.63,3.74,1.1,1.61.47,2.77.82,3.5,1.05.69.21,1.58.56,2.65,1.01,1.01.43,1.74.84,2.17,1.2.4.34.75.81,1.05,1.42.29.61.44,1.26.44,2,0,1.62-.78,2.88-2.37,3.85-1.71,1.05-4.06,1.54-7.07,1.57-2.95,0-6.07-.81-9.27-2.4-3.22-1.59-5.89-3.57-7.93-5.87l-.06-.06-10.27,11.03.19.23c2.98,3.69,7.02,6.65,12.02,8.8,4.97,2.13,10.42,3.22,16.21,3.24h.1c7.33,0,13.55-1.81,18.51-5.37,5.07-3.65,7.64-8.72,7.66-15.08-.02-7.09-3.17-12.6-9.39-16.37"/>
            <path fill="white" d="m416.23,64.77c-3.76,3.62-8.42,5.47-13.91,5.47-5.13,0-9.51-1.76-13.02-5.24-3.5-3.47-5.28-7.93-5.28-13.25s1.78-9.77,5.28-13.23c3.51-3.46,7.89-5.21,13.02-5.21,6.3,0,11.52,2.43,15.53,7.21l11.11-11.11c-3.09-3.48-6.81-6.33-11.14-8.41-4.77-2.28-9.98-3.44-15.5-3.44-10.1,0-18.68,3.29-25.5,9.78-6.83,6.5-10.29,14.72-10.29,24.42s3.47,17.93,10.32,24.45c6.83,6.5,15.34,9.81,25.28,9.81,5.71,0,11.01-1.17,15.76-3.47,3.39-1.64,6.4-3.75,9.03-6.27l-10.7-11.49Z"/>
            <path fill="#0DDBFF" d="m19.07,1.43H6.4C3.41,1.43.98,3.85.98,6.84v12.67c0,4.83,5.84,7.25,9.25,3.83l12.67-12.67c3.41-3.41,1-9.25-3.83-9.25"/>
            <path fill="#0DDBFF" d="m93.89,111.94h12.67c2.99,0,5.42-2.43,5.42-5.42v-12.67c0-4.83-5.84-7.25-9.25-3.83l-12.67,12.67c-3.41,3.41-1,9.25,3.83,9.25"/>
            <path fill="#0DDBFF" d="m110.07,48.43c-3.3-3.3-8.65-3.3-11.94,0l-21.28,21.28-.02-.02-4.27,4.27c-3.04,3.04-7.97,3.04-11.01,0-3.04-3.04-3.04-7.97,0-11.01l31.08-31.08c.38-.38.79-.71,1.22-1l8.19-8.19,9.93,9.93V1.43h-31.17l9.3,9.3-6.64,6.64c-.32.53-.69,1.05-1.15,1.51l-8.1,8.11c-3.04,3.04-7.97,3.04-11.01,0-3.04-3.04-3.04-7.97,0-11.01l.2-.21-.02-.02,1.32-1.32c3.3-3.3,3.3-8.65,0-11.94-3.3-3.3-8.65-3.3-11.94,0L2.47,52.75c-3.3,3.3-3.3,8.65,0,11.94,3.3,3.3,8.65,3.3,11.94,0l21.41-21.41.02.03,3.98-3.98c3.04-3.04,7.97-3.04,11.01,0,3.04,3.04,3.04,7.97,0,11.01l-31.08,31.08c-.46.46-.97.83-1.51,1.15l-7.74,7.74L.98,80.77v31.17h31.17l-9.69-9.69,6.86-6.86c.29-.43.62-.84,1-1.22l8.1-8.1c3.04-3.04,7.97-3.04,11.01,0,3.01,3.01,3.03,7.87.08,10.92l.03.03-1.7,1.7c-3.3,3.3-3.3,8.65,0,11.94,3.3,3.3,8.65,3.3,11.95,0l50.28-50.28c3.3-3.3,3.3-8.65,0-11.94"/>
          </svg>
        </div>

        {/* Card */}
        <div style={{ background: '#2e2a2b', border: '1px solid #3a3537', borderTop: '2.5px solid #0DDBFF', borderRadius: 12, padding: 32 }}>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 24px', textAlign: 'center' }}>
            Acesso ao sistema
          </p>

          {erro && (
            <div style={{ background: 'rgba(232,48,48,.12)', border: '1px solid rgba(232,48,48,.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#e83030' }}>
              {erro}
            </div>
          )}

          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>E-mail</label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="seu@email.com"
            style={{ width: '100%', padding: '11px 14px', background: '#231F20', border: '1px solid #3a3537', borderRadius: 6, color: 'white', fontSize: 13, outline: 'none', marginBottom: 16, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
          />

          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Senha</label>
          <input
            type="password" value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width: '100%', padding: '11px 14px', background: '#231F20', border: '1px solid #3a3537', borderRadius: 6, color: 'white', fontSize: 13, outline: 'none', marginBottom: 24, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
          />

          <button
            onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: 13, background: loading ? '#0ab8d888' : '#0ab8d8', color: '#231F20', border: 'none', borderRadius: 6, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: .8, textTransform: 'uppercase' as const }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 11, color: 'rgba(255,255,255,.3)' }}>
            <span onClick={handleEsqueci} style={{ color: '#0ab8d8', cursor: 'pointer' }}>Esqueci minha senha</span>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 10, color: 'rgba(255,255,255,.2)', letterSpacing: 1 }}>
          OSTEC SEGURANÇA DIGITAL © 2025
        </p>
      </div>
    </div>
  );
}
