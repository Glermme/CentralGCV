'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  AppState, Tarefa, Cliente, AgendaRecorrente, AgendaExtra, Scan,
  loadState, saveState, uid, hslToHex,
} from '@/lib/store';
import {
  loadFromDB, loadAllFromDB, upsertPerfil,
  dbAddCliente, dbDelCliente,
  dbAddTarefa, dbUpdateTarefaStatus, dbDelTarefa,
  dbAddComentario, dbDelComentario, dbAddAnexo, dbUploadAnexo,
  dbAddReuniao,
  dbAddAgenda, dbDelAgenda,
  dbAddAgendaExtra, dbDelAgendaExtra, dbSetAgendaExtraStatus,
  dbAddScan, dbDelScan, dbSetScanStatus,
  dbSetOcorrencia,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';

export function useStore() {
  const [state,      setState]      = useState<AppState>(() => loadState());
  const [loading,    setLoading]    = useState(true);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [userEmail,  setUserEmail]  = useState('');
  const [userNome,   setUserNome]   = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [userRole,   setUserRole]   = useState<'admin' | 'analista' | 'viewer'>('analista');
  const [globalView, setGlobalView] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid_ = session?.user?.id ?? null;
        const email = session?.user?.email ?? '';
        setUserId(uid_); setUserEmail(email);
        if (!uid_) { setLoading(false); return; }
        await upsertPerfil(uid_, email);
        const { data: perfil } = await supabase.from('perfis').select('role, nome, avatar_url').eq('id', uid_).single();
        setUserRole(perfil?.role ?? 'analista');
        setUserNome(perfil?.nome || email.split('@')[0]);
        setUserAvatar(perfil?.avatar_url || '');
        const data = await loadFromDB();
        setState(data); saveState(data);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar dados');
        setState(loadState());
      } finally { setLoading(false); }
    }
    init();
  }, []);

  const toggleGlobalView = useCallback(async () => {
    if (userRole !== 'admin') return;
    const next = !globalView; setGlobalView(next); setLoading(true);
    try {
      const data = next ? await loadAllFromDB() : await loadFromDB();
      setState(data); saveState(data);
    } catch (err: any) { setError(err?.message || 'Erro'); }
    finally { setLoading(false); }
  }, [globalView, userRole]);

  const update = useCallback((fn: (draft: AppState) => AppState) => {
    setState(prev => { const next = fn(structuredClone(prev)); saveState(next); return next; });
  }, []);

  const getCliente = useCallback((id: string) => state.clientes.find(c => c.id === id), [state.clientes]);

  // ── CLIENTES ─────────────────────────────
  const addCliente = useCallback(async (nome: string, empresa: string, cor: string) => {
    if (!userId) return;
    const cliente: Cliente = { id: uid(), nome, empresa, cor };
    await dbAddCliente(cliente, userId);
    update(s => ({ ...s, clientes: [...s.clientes, cliente] }));
  }, [update, userId]);

  const delCliente = useCallback(async (id: string) => {
    await dbDelCliente(id);
    update(s => ({ ...s, clientes: s.clientes.filter(c => c.id !== id), tarefas: s.tarefas.filter(t => t.clienteId !== id), agendas: s.agendas.filter(a => a.clienteId !== id), agendasExtras: s.agendasExtras.filter(e => e.clienteId !== id), scans: s.scans.filter(sc => sc.clienteId !== id) }));
  }, [update]);

  // ── TAREFAS ──────────────────────────────
  const addTarefa = useCallback(async (clienteId: string, desc: string, prazo: string, status: Tarefa['status']) => {
    if (!userId) return;
    const last = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
    const tarefa: Tarefa = { id: uid(), clienteId, desc, prazo, status, reuniaoId: last?.id ?? null, criadaEm: new Date().toISOString(), comentarios: [] };
    await dbAddTarefa(tarefa, userId);
    update(s => ({ ...s, tarefas: [...s.tarefas, tarefa] }));
  }, [update, userId, state.reunioes]);

  const updateTarefaStatus = useCallback(async (id: string, status: Tarefa['status']) => {
    await dbUpdateTarefaStatus(id, status);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === id ? { ...t, status } : t) }));
  }, [update]);

  const toggleConcluida = useCallback(async (id: string) => {
    const t = state.tarefas.find(t => t.id === id); if (!t) return;
    const next = t.status === 'concluida' ? 'pendente' : 'concluida';
    await dbUpdateTarefaStatus(id, next);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === id ? { ...t, status: next } : t) }));
  }, [update, state.tarefas]);

  const cycleStatus = useCallback(async (id: string) => {
    const t = state.tarefas.find(t => t.id === id); if (!t) return;
    const ciclo: Tarefa['status'][] = ['pendente', 'andamento', 'concluida'];
    const next = ciclo[(ciclo.indexOf(t.status) + 1) % ciclo.length];
    await dbUpdateTarefaStatus(id, next);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === id ? { ...t, status: next } : t) }));
  }, [update, state.tarefas]);

  const delTarefa = useCallback(async (id: string) => {
    await dbDelTarefa(id);
    update(s => ({ ...s, tarefas: s.tarefas.filter(t => t.id !== id) }));
  }, [update]);

  const addTarefasBatch = useCallback(async (clienteId: string, descs: string[], prazo: string) => {
    if (!userId) return;
    const last = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
    const novas: Tarefa[] = descs.map(desc => ({ id: uid(), clienteId, desc, prazo, status: 'pendente' as const, reuniaoId: last?.id ?? null, criadaEm: new Date().toISOString(), comentarios: [] }));
    await Promise.all(novas.map(t => dbAddTarefa(t, userId)));
    update(s => ({ ...s, tarefas: [...s.tarefas, ...novas] }));
  }, [update, userId, state.reunioes]);

  // ── COMENTÁRIOS ──────────────────────────
  const addComentario = useCallback(async (tarefaId: string, txt: string, arquivos?: File[]) => {
    if (!userId) return;
    const data = await dbAddComentario(tarefaId, txt, userId);
    const at = data?.criado_em || new Date().toISOString();
    const comentarioId = data?.id;
    const anexos: any[] = [];
    if (arquivos?.length && comentarioId) {
      for (const file of arquivos) {
        const url = await dbUploadAnexo(file, userId);
        if (url) {
          const tipo = file.type.startsWith('image/') ? 'image' : 'file';
          await dbAddAnexo(tarefaId, comentarioId, file.name, url, tipo);
          anexos.push({ id: comentarioId, nome: file.name, url, tipo });
        }
      }
    }
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === tarefaId ? { ...t, comentarios: [...t.comentarios, { txt, at, autorId: userId, autorNome: userNome, autorAvatar: userAvatar, anexos }] } : t) }));
  }, [update, userId, userNome, userAvatar]);

  const delComentario = useCallback(async (tarefaId: string, idx: number) => {
    const t = state.tarefas.find(t => t.id === tarefaId);
    const cm = t?.comentarios[idx]; if (!cm) return;
    await dbDelComentario(tarefaId, cm.at);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === tarefaId ? { ...t, comentarios: t.comentarios.filter((_, i) => i !== idx) } : t) }));
  }, [update, state.tarefas]);

  // ── REUNIÕES ─────────────────────────────
  const addReuniao = useCallback(async (data: string, obs: string) => {
    if (!userId) return;
    const reuniao = { id: uid(), data, obs };
    await dbAddReuniao(reuniao, userId);
    update(s => ({ ...s, reunioes: [...s.reunioes, reuniao] }));
  }, [update, userId]);

  // ── AGENDAS ──────────────────────────────
  const addAgenda = useCallback(async (agenda: Omit<AgendaRecorrente, 'id'>) => {
    if (!userId) return;
    const nova = { id: uid(), ...agenda };
    await dbAddAgenda(nova, userId);
    update(s => ({ ...s, agendas: [...s.agendas, nova] }));
  }, [update, userId]);

  const delAgenda = useCallback(async (id: string) => {
    await dbDelAgenda(id);
    update(s => ({ ...s, agendas: s.agendas.filter(a => a.id !== id) }));
  }, [update]);

  // ── AGENDAS EXTRAS ────────────────────────
  const addAgendaExtra = useCallback(async (extra: Omit<AgendaExtra, 'id' | 'ownerId' | 'status' | 'motivo' | 'criadoEm'>) => {
    if (!userId) return;
    const nova: AgendaExtra = { id: uid(), ownerId: userId, status: '', motivo: '', criadoEm: new Date().toISOString(), ...extra };
    await dbAddAgendaExtra(nova, userId);
    update(s => ({ ...s, agendasExtras: [...s.agendasExtras, nova] }));
  }, [update, userId]);

  const delAgendaExtra = useCallback(async (id: string) => {
    await dbDelAgendaExtra(id);
    update(s => ({ ...s, agendasExtras: s.agendasExtras.filter(e => e.id !== id) }));
  }, [update]);

  const setAgendaExtraStatus = useCallback(async (id: string, status: string, motivo = '') => {
    await dbSetAgendaExtraStatus(id, status, motivo);
    update(s => ({ ...s, agendasExtras: s.agendasExtras.map(e => e.id === id ? { ...e, status, motivo } : e) }));
  }, [update]);

  // ── SCANS ─────────────────────────────────
  const addScan = useCallback(async (scan: Omit<Scan, 'id'>) => {
    if (!userId) return;
    const novo = { id: uid(), ...scan };
    await dbAddScan(novo, userId);
    update(s => ({ ...s, scans: [...s.scans, novo] }));
  }, [update, userId]);

  const delScan = useCallback(async (id: string) => {
    await dbDelScan(id);
    update(s => ({ ...s, scans: s.scans.filter(sc => sc.id !== id) }));
  }, [update]);

  const setScanStatus = useCallback(async (scanId: string, data: string, status: 'ocorreu' | 'nao', motivo = '') => {
    await dbSetScanStatus(scanId, data, status, motivo);
    const key = `${scanId}_${data}`;
    update(s => ({ ...s, scanOcorrencias: { ...s.scanOcorrencias, [key]: { status, motivo: status === 'ocorreu' ? '' : motivo } } }));
  }, [update]);

  // ── OCORRÊNCIAS ──────────────────────────
  const setOcorrencia = useCallback(async (agendaId: string, date: string, status: 'ocorreu' | 'nao', motivo = '') => {
    await dbSetOcorrencia(agendaId, date, status, motivo);
    const key = `${agendaId}_${date}`;
    update(s => ({ ...s, ocorrencias: { ...s.ocorrencias, [key]: { status, motivo: status === 'ocorreu' ? '' : motivo } } }));
  }, [update]);

  // ── COR ALEATÓRIA ────────────────────────
  const randomColor = useCallback(() => {
    const used = new Set(state.clientes.map(c => c.cor.toLowerCase()));
    let attempts = 0, candidate = '';
    do {
      const h = Math.floor(Math.random() * 360);
      const s = 55 + Math.floor(Math.random() * 35);
      const l = 38 + Math.floor(Math.random() * 22);
      candidate = hslToHex(h, s, l); attempts++;
    } while (used.has(candidate.toLowerCase()) && attempts < 50);
    return candidate;
  }, [state.clientes]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  return {
    state, loading, error,
    userId, userEmail, userNome, userAvatar, userRole, globalView,
    toggleGlobalView, getCliente,
    addCliente, delCliente,
    addTarefa, updateTarefaStatus, toggleConcluida, cycleStatus, delTarefa, addTarefasBatch,
    addComentario, delComentario,
    addReuniao,
    addAgenda, delAgenda,
    addAgendaExtra, delAgendaExtra, setAgendaExtraStatus,
    addScan, delScan, setScanStatus,
    setOcorrencia, randomColor, logout,
  };
}

export type StoreAPI = ReturnType<typeof useStore>;
