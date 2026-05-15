'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  AppState, Tarefa, Ticket, Cliente, AgendaRecorrente, AgendaExtra, Scan, Recheck, Prem, Atividade,
  loadState, saveState, uid, hslToHex,
} from '@/lib/store';
import {
  loadFromDB, loadAllFromDB, upsertPerfil, dbLog,
  dbAddCliente, dbDelCliente,
  dbAddTarefa, dbUpdateTarefaStatus, dbDelTarefa,
  dbAddComentario, dbDelComentario, dbAddAnexo, dbUploadAnexo,
  dbAddReuniao,
  dbAddAgenda, dbDelAgenda,
  dbAddAgendaExtra, dbDelAgendaExtra, dbSetAgendaExtraStatus,
  dbAddScan, dbDelScan, dbSetScanStatus,
  dbAddRecheck, dbDelRecheck, dbSetRechekStatus,
  dbAddPrem, dbDelPrem, dbSetPremStatus,
  dbAddAtividade, dbDelAtividade, dbSetAtividadeStatus,
  dbSetOcorrencia,
  dbAddTicket, dbDelTicket, dbUpdateTicket,
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

  // Helper de log
  const log = useCallback((acao: string, entidade: string, entidadeId = '', detalhe = '') => {
    if (userId) dbLog(userId, userNome, acao, entidade, entidadeId, detalhe);
  }, [userId, userNome]);

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
    log('criar', 'cliente', cliente.id, nome);
    update(s => ({ ...s, clientes: [...s.clientes, cliente] }));
  }, [update, userId, log]);

  const delCliente = useCallback(async (id: string) => {
    const nome = state.clientes.find(c => c.id === id)?.nome || id;
    await dbDelCliente(id);
    log('excluir', 'cliente', id, nome);
    update(s => ({ ...s, clientes: s.clientes.filter(c => c.id !== id), tarefas: s.tarefas.filter(t => t.clienteId !== id), agendas: s.agendas.filter(a => a.clienteId !== id), agendasExtras: s.agendasExtras.filter(e => e.clienteId !== id), scans: s.scans.filter(sc => sc.clienteId !== id) }));
  }, [update, state.clientes, log]);

  // ── TAREFAS ──────────────────────────────
  const addTarefa = useCallback(async (clienteId: string, desc: string, prazo: string, status: Tarefa['status']) => {
    if (!userId) return;
    const last = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
    const tarefa: Tarefa = { id: uid(), clienteId, desc, prazo, status, reuniaoId: last?.id ?? null, criadaEm: new Date().toISOString(), comentarios: [] };
    await dbAddTarefa(tarefa, userId);
    const clienteNome = state.clientes.find(c => c.id === clienteId)?.nome || '';
    log('criar', 'tarefa', tarefa.id, `${clienteNome}: ${desc.slice(0, 60)}`);
    update(s => ({ ...s, tarefas: [...s.tarefas, tarefa] }));
  }, [update, userId, state.reunioes, state.clientes, log]);

  const updateTarefaStatus = useCallback(async (id: string, status: Tarefa['status']) => {
    await dbUpdateTarefaStatus(id, status);
    const t = state.tarefas.find(t => t.id === id);
    log('status', 'tarefa', id, `→ ${status}${t ? ': ' + t.desc.slice(0, 40) : ''}`);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === id ? { ...t, status } : t) }));
  }, [update, state.tarefas, log]);

  const toggleConcluida = useCallback(async (id: string) => {
    const t = state.tarefas.find(t => t.id === id); if (!t) return;
    const next = t.status === 'concluida' ? 'pendente' : 'concluida';
    await dbUpdateTarefaStatus(id, next);
    log('status', 'tarefa', id, `→ ${next}: ${t.desc.slice(0, 40)}`);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === id ? { ...t, status: next } : t) }));
  }, [update, state.tarefas, log]);

  const cycleStatus = useCallback(async (id: string) => {
    const t = state.tarefas.find(t => t.id === id); if (!t) return;
    const ciclo: Tarefa['status'][] = ['pendente', 'andamento', 'concluida', 'finalizado'];
    const next = ciclo[(ciclo.indexOf(t.status) + 1) % ciclo.length];
    await dbUpdateTarefaStatus(id, next);
    log('status', 'tarefa', id, `→ ${next}: ${t.desc.slice(0, 40)}`);
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === id ? { ...t, status: next } : t) }));
  }, [update, state.tarefas, log]);

  const delTarefa = useCallback(async (id: string) => {
    const t = state.tarefas.find(t => t.id === id);
    await dbDelTarefa(id);
    log('excluir', 'tarefa', id, t?.desc.slice(0, 60) || '');
    update(s => ({ ...s, tarefas: s.tarefas.filter(t => t.id !== id) }));
  }, [update, state.tarefas, log]);

  const addTarefasBatch = useCallback(async (clienteId: string, descs: string[], prazo: string) => {
    if (!userId) return;
    const last = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
    const novas: Tarefa[] = descs.map(desc => ({ id: uid(), clienteId, desc, prazo, status: 'pendente' as const, reuniaoId: last?.id ?? null, criadaEm: new Date().toISOString(), comentarios: [] }));
    await Promise.all(novas.map(t => dbAddTarefa(t, userId)));
    const clienteNome = state.clientes.find(c => c.id === clienteId)?.nome || '';
    log('criar', 'tarefa', '', `lote de ${novas.length} tarefas — ${clienteNome}`);
    update(s => ({ ...s, tarefas: [...s.tarefas, ...novas] }));
  }, [update, userId, state.reunioes, state.clientes, log]);

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
    log('comentar', 'tarefa', tarefaId, txt.slice(0, 60) + (arquivos?.length ? ` [+${arquivos.length} anexo(s)]` : ''));
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === tarefaId ? { ...t, comentarios: [...t.comentarios, { txt, at, autorId: userId, autorNome: userNome, autorAvatar: userAvatar, anexos }] } : t) }));
  }, [update, userId, userNome, userAvatar, log]);

  const delComentario = useCallback(async (tarefaId: string, idx: number) => {
    const t = state.tarefas.find(t => t.id === tarefaId);
    const cm = t?.comentarios[idx]; if (!cm) return;
    await dbDelComentario(tarefaId, cm.at);
    log('excluir', 'comentário', tarefaId, cm.txt.slice(0, 60));
    update(s => ({ ...s, tarefas: s.tarefas.map(t => t.id === tarefaId ? { ...t, comentarios: t.comentarios.filter((_, i) => i !== idx) } : t) }));
  }, [update, state.tarefas, log]);

  // ── REUNIÕES ─────────────────────────────
  const addReuniao = useCallback(async (data: string, obs: string) => {
    if (!userId) return;
    const reuniao = { id: uid(), data, obs };
    await dbAddReuniao(reuniao, userId);
    log('criar', 'reunião', reuniao.id, data + (obs ? ' — ' + obs : ''));
    update(s => ({ ...s, reunioes: [...s.reunioes, reuniao] }));
  }, [update, userId, log]);

  // ── AGENDAS ──────────────────────────────
  const addAgenda = useCallback(async (agenda: Omit<AgendaRecorrente, 'id' | 'criadoEm'>) => {
    if (!userId) return;
    const nova: AgendaRecorrente = { id: uid(), criadoEm: new Date().toISOString(), ...agenda };
    await dbAddAgenda(nova, userId);
    const clienteNome = state.clientes.find(c => c.id === agenda.clienteId)?.nome || '';
    log('criar', 'agenda', nova.id, clienteNome);
    update(s => ({ ...s, agendas: [...s.agendas, nova] }));
  }, [update, userId, state.clientes, log]);

  const delAgenda = useCallback(async (id: string) => {
    await dbDelAgenda(id);
    log('excluir', 'agenda', id);
    update(s => ({ ...s, agendas: s.agendas.filter(a => a.id !== id) }));
  }, [update, log]);

  // ── AGENDAS EXTRAS ────────────────────────
  const addAgendaExtra = useCallback(async (extra: Omit<AgendaExtra, 'id' | 'ownerId' | 'status' | 'motivo' | 'criadoEm'>) => {
    if (!userId) return;
    const nova: AgendaExtra = { id: uid(), ownerId: userId, status: '', motivo: '', criadoEm: new Date().toISOString(), ...extra };
    await dbAddAgendaExtra(nova, userId);
    const clienteNome = state.clientes.find(c => c.id === extra.clienteId)?.nome || '';
    log('criar', 'agenda extra', nova.id, `${clienteNome} ${extra.data} ${extra.hora}`);
    update(s => ({ ...s, agendasExtras: [...s.agendasExtras, nova] }));
  }, [update, userId, state.clientes, log]);

  const delAgendaExtra = useCallback(async (id: string) => {
    await dbDelAgendaExtra(id);
    log('excluir', 'agenda extra', id);
    update(s => ({ ...s, agendasExtras: s.agendasExtras.filter(e => e.id !== id) }));
  }, [update, log]);

  const setAgendaExtraStatus = useCallback(async (id: string, status: string, motivo = '') => {
    await dbSetAgendaExtraStatus(id, status, motivo);
    log('status', 'agenda extra', id, `→ ${status}${motivo ? ': ' + motivo : ''}`);
    update(s => ({ ...s, agendasExtras: s.agendasExtras.map(e => e.id === id ? { ...e, status, motivo } : e) }));
  }, [update, log]);

  // ── SCANS ─────────────────────────────────
  const addScan = useCallback(async (scan: Omit<Scan, 'id' | 'criadoEm'>) => {
    if (!userId) return;
    const novo: Scan = { id: uid(), criadoEm: new Date().toISOString(), ...scan };
    await dbAddScan(novo, userId);
    const clienteNome = state.clientes.find(c => c.id === scan.clienteId)?.nome || '';
    log('criar', 'scan', novo.id, clienteNome);
    update(s => ({ ...s, scans: [...s.scans, novo] }));
  }, [update, userId, state.clientes, log]);

  const delScan = useCallback(async (id: string) => {
    await dbDelScan(id);
    log('excluir', 'scan', id);
    update(s => ({ ...s, scans: s.scans.filter(sc => sc.id !== id) }));
  }, [update, log]);

  const setScanStatus = useCallback(async (scanId: string, data: string, status: 'ocorreu' | 'nao', motivo = '') => {
    await dbSetScanStatus(scanId, data, status, motivo);
    log('status', 'scan', scanId, `${data} → ${status}${motivo ? ': ' + motivo : ''}`);
    const key = `${scanId}_${data}`;
    update(s => ({ ...s, scanOcorrencias: { ...s.scanOcorrencias, [key]: { status, motivo: status === 'ocorreu' ? '' : motivo } } }));
  }, [update, log]);

  // ── RECHEKS ───────────────────────────────
  const addRecheck = useCallback(async (recheck: Omit<Recheck, 'id' | 'ownerId' | 'status' | 'motivo' | 'criadoEm'>) => {
    if (!userId) return;
    const nova: Recheck = { id: uid(), ownerId: userId, status: '', motivo: '', criadoEm: new Date().toISOString(), ...recheck };
    await dbAddRecheck(nova, userId);
    const clienteNome = state.clientes.find(c => c.id === recheck.clienteId)?.nome || '';
    log('criar', 'recheck', nova.id, `${clienteNome} ${recheck.data} ${recheck.hora}`);
    update(s => ({ ...s, recheks: [...s.recheks, nova] }));
  }, [update, userId, state.clientes, log]);

  const delRecheck = useCallback(async (id: string) => {
    await dbDelRecheck(id);
    log('excluir', 'recheck', id);
    update(s => ({ ...s, recheks: s.recheks.filter(r => r.id !== id) }));
  }, [update, log]);

  const setRechekStatus = useCallback(async (id: string, status: string, motivo = '') => {
    await dbSetRechekStatus(id, status, motivo);
    log('status', 'recheck', id, `→ ${status}${motivo ? ': ' + motivo : ''}`);
    update(s => ({ ...s, recheks: s.recheks.map(r => r.id === id ? { ...r, status, motivo } : r) }));
  }, [update, log]);

  // ── PREMS ─────────────────────────────────
  const addPrem = useCallback(async (prem: Omit<Prem, 'id' | 'ownerId' | 'status' | 'motivo' | 'criadoEm'>) => {
    if (!userId) return;
    const nova: Prem = { id: uid(), ownerId: userId, status: '', motivo: '', criadoEm: new Date().toISOString(), ...prem };
    await dbAddPrem(nova, userId);
    const clienteNome = state.clientes.find(c => c.id === prem.clienteId)?.nome || '';
    log('criar', 'prem', nova.id, `${clienteNome} ${prem.data} ${prem.hora}`);
    update(s => ({ ...s, prems: [...s.prems, nova] }));
  }, [update, userId, state.clientes, log]);

  const delPrem = useCallback(async (id: string) => {
    await dbDelPrem(id);
    log('excluir', 'prem', id);
    update(s => ({ ...s, prems: s.prems.filter(p => p.id !== id) }));
  }, [update, log]);

  const setPremStatus = useCallback(async (id: string, status: string, motivo = '') => {
    await dbSetPremStatus(id, status, motivo);
    log('status', 'prem', id, `→ ${status}${motivo ? ': ' + motivo : ''}`);
    update(s => ({ ...s, prems: s.prems.map(p => p.id === id ? { ...p, status, motivo } : p) }));
  }, [update, log]);

  // ── ATIVIDADES ────────────────────────────
  const addAtividade = useCallback(async (atv: Omit<Atividade, 'id' | 'ownerId' | 'status' | 'motivo' | 'criadoEm'>) => {
    if (!userId) return;
    const nova: Atividade = { id: uid(), ownerId: userId, status: '', motivo: '', criadoEm: new Date().toISOString(), ...atv };
    await dbAddAtividade(nova, userId);
    const clienteNome = state.clientes.find(c => c.id === atv.clienteId)?.nome || '';
    log('criar', 'atividade', nova.id, `${clienteNome} ${atv.data} ${atv.hora}`);
    update(s => ({ ...s, atividades: [...s.atividades, nova] }));
  }, [update, userId, state.clientes, log]);

  const delAtividade = useCallback(async (id: string) => {
    await dbDelAtividade(id);
    log('excluir', 'atividade', id);
    update(s => ({ ...s, atividades: s.atividades.filter(a => a.id !== id) }));
  }, [update, log]);

  const setAtividadeStatus = useCallback(async (id: string, status: string, motivo = '') => {
    await dbSetAtividadeStatus(id, status, motivo);
    log('status', 'atividade', id, `→ ${status}${motivo ? ': ' + motivo : ''}`);
    update(s => ({ ...s, atividades: s.atividades.map(a => a.id === id ? { ...a, status, motivo } : a) }));
  }, [update, log]);

  // ── OCORRÊNCIAS ──────────────────────────
  const setOcorrencia = useCallback(async (agendaId: string, date: string, status: 'ocorreu' | 'nao', motivo = '') => {
    await dbSetOcorrencia(agendaId, date, status, motivo);
    log('status', 'agenda', agendaId, `${date} → ${status}${motivo ? ': ' + motivo : ''}`);
    const key = `${agendaId}_${date}`;
    update(s => ({ ...s, ocorrencias: { ...s.ocorrencias, [key]: { status, motivo: status === 'ocorreu' ? '' : motivo } } }));
  }, [update, log]);

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
    log('logout', 'auth', userId || '');
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [log, userId]);

  // ── TICKETS ──────────────────────────────
  const addTicket = useCallback(async (data: Omit<Ticket, 'id' | 'ownerId' | 'criadoEm'>) => {
    if (!userId) return;
    const ticket: Ticket = { ...data, id: uid(), ownerId: userId, criadoEm: new Date().toISOString() };
    await dbAddTicket(ticket, userId);
    log('criar', 'ticket', ticket.id, `${data.nome}${data.numero ? ' #' + data.numero : ''}`);
    update(s => ({ ...s, tickets: [...s.tickets, ticket] }));
  }, [update, userId, log]);

  const delTicket = useCallback(async (id: string) => {
    const t = state.tickets.find(t => t.id === id);
    await dbDelTicket(id);
    log('excluir', 'ticket', id, t?.nome || '');
    update(s => ({ ...s, tickets: s.tickets.filter(t => t.id !== id) }));
  }, [update, state.tickets, log]);

  const updateTicket = useCallback(async (id: string, changes: Partial<Omit<Ticket, 'id' | 'ownerId' | 'criadoEm'>>) => {
    await dbUpdateTicket(id, changes);
    update(s => ({ ...s, tickets: s.tickets.map(t => t.id === id ? { ...t, ...changes } : t) }));
  }, [update]);

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
    addRecheck, delRecheck, setRechekStatus,
    addPrem, delPrem, setPremStatus,
    addAtividade, delAtividade, setAtividadeStatus,
    setOcorrencia, randomColor, logout,
    addTicket, delTicket, updateTicket,
  };
}

export type StoreAPI = ReturnType<typeof useStore>;
