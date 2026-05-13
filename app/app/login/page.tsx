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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

            {/* Ícone + wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

              {/* Ícone OSTEC (grid de setas cruzadas em ciano) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 113" style={{ width: 52, height: 'auto' }}>
                <path fill="#0DDBFF" d="m19.07,1.43H6.4C3.41,1.43.98,3.85.98,6.84v12.67c0,4.83,5.84,7.25,9.25,3.83l12.67-12.67c3.41-3.41,1-9.25-3.83-9.25"/>
                <path fill="#0DDBFF" d="m93.89,111.94h12.67c2.99,0,5.42-2.43,5.42-5.42v-12.67c0-4.83-5.84-7.25-9.25-3.83l-12.67,12.67c-3.41,3.41-1,9.25,3.83,9.25"/>
                <path fill="#0DDBFF" d="m110.07,48.43c-3.3-3.3-8.65-3.3-11.94,0l-21.28,21.28-.02-.02-4.27,4.27c-3.04,3.04-7.97,3.04-11.01,0-3.04-3.04-3.04-7.97,0-11.01l31.08-31.08c.38-.38.79-.71,1.22-1l8.19-8.19,9.93,9.93V1.43h-31.17l9.3,9.3-6.64,6.64c-.32.53-.69,1.05-1.15,1.51l-8.1,8.11c-3.04,3.04-7.97,3.04-11.01,0-3.04-3.04-3.04-7.97,0-11.01l.2-.21-.02-.02,1.32-1.32c3.3-3.3,3.3-8.65,0-11.94-3.3-3.3-8.65-3.3-11.94,0L2.47,52.75c-3.3,3.3-3.3,8.65,0,11.94,3.3,3.3,8.65,3.3,11.94,0l21.41-21.41.02.03,3.98-3.98c3.04-3.04,7.97-3.04,11.01,0,3.04,3.04,3.04,7.97,0,11.01l-31.08,31.08c-.46.46-.97.83-1.51,1.15l-7.74,7.74L.98,80.77v31.17h31.17l-9.69-9.69,6.86-6.86c.29-.43.62-.84,1-1.22l8.1-8.1c3.04-3.04,7.97-3.04,11.01,0,3.01,3.01,3.03,7.87.08,10.92l.03.03-1.7,1.7c-3.3,3.3-3.3,8.65,0,11.94,3.3,3.3,8.65,3.3,11.95,0l50.28-50.28c3.3-3.3,3.3-8.65,0-11.94"/>
              </svg>

              {/* Wordmark "ostec" */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" style={{ width: 148, height: 'auto' }}>
                <text
                  x="0" y="68"
                  fontFamily="'Isidora Sans', 'Montserrat', 'Arial Black', sans-serif"
                  fontWeight="800"
                  fontSize="80"
                  fill="white"
                  letterSpacing="-2"
                >ostec</text>
              </svg>
            </div>

            {/* Subtítulo "Portal GCV" com linhas */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginTop: 6,
            }}>
              <div style={{ width: 48, height: 1, background: 'linear-gradient(to right, transparent, #0DDBFF88)' }} />
              <span style={{
                fontSize: 13, fontWeight: 500, color: 'white',
                letterSpacing: 2, whiteSpace: 'nowrap',
              }}>Portal GCV</span>
              <div style={{ width: 48, height: 1, background: 'linear-gradient(to left, transparent, #0DDBFF88)' }} />
            </div>

          </div>
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
