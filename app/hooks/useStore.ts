/* ════════════════════════════════════════════
   hooks/useStore.ts
   Hook global de estado — substitui o S do state.js
   ════════════════════════════════════════════ */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  AppState, Tarefa, Cliente, Reuniao, AgendaRecorrente, OcorrenciaStatus,
  Comentario, loadState, saveState, uid, fmtDate, COLORS, hslToHex,
} from '@/lib/store';

export function useStore() {
  const [state, setState] = useState<AppState>(() => loadState());

  // Persiste sempre que o estado mudar
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Helper interno
  const update = useCallback((fn: (draft: AppState) => AppState) => {
    setState(prev => {
      const next = fn(structuredClone(prev));
      saveState(next);
      return next;
    });
  }, []);

  // ── GETTERS ──────────────────────────────

  const getCliente = useCallback(
    (id: string) => state.clientes.find(c => c.id === id),
    [state.clientes]
  );

  // ── CLIENTES ─────────────────────────────

  const addCliente = useCallback((nome: string, empresa: string, cor: string) => {
    update(s => ({
      ...s,
      clientes: [...s.clientes, { id: uid(), nome, empresa, cor }],
    }));
  }, [update]);

  const delCliente = useCallback((id: string) => {
    update(s => ({
      ...s,
      clientes: s.clientes.filter(c => c.id !== id),
      tarefas:  s.tarefas.filter(t => t.clienteId !== id),
      agendas:  s.agendas.filter(a => a.clienteId !== id),
    }));
  }, [update]);

  // ── TAREFAS ──────────────────────────────

  const addTarefa = useCallback((
    clienteId: string,
    desc: string,
    prazo: string,
    status: Tarefa['status']
  ) => {
    const last = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
    update(s => ({
      ...s,
      tarefas: [...s.tarefas, {
        id: uid(), clienteId, desc, prazo, status,
        reuniaoId: last?.id ?? null,
        criadaEm: new Date().toISOString(),
        comentarios: [],
      }],
    }));
  }, [update, state.reunioes]);

  const updateTarefaStatus = useCallback((id: string, status: Tarefa['status']) => {
    update(s => ({
      ...s,
      tarefas: s.tarefas.map(t => t.id === id ? { ...t, status } : t),
    }));
  }, [update]);

  const toggleConcluida = useCallback((id: string) => {
    update(s => ({
      ...s,
      tarefas: s.tarefas.map(t =>
        t.id === id ? { ...t, status: t.status === 'concluida' ? 'pendente' : 'concluida' } : t
      ),
    }));
  }, [update]);

  const cycleStatus = useCallback((id: string) => {
    const ciclo: Tarefa['status'][] = ['pendente', 'andamento', 'concluida'];
    update(s => ({
      ...s,
      tarefas: s.tarefas.map(t => {
        if (t.id !== id) return t;
        const next = ciclo[(ciclo.indexOf(t.status) + 1) % ciclo.length];
        return { ...t, status: next };
      }),
    }));
  }, [update]);

  const delTarefa = useCallback((id: string) => {
    update(s => ({ ...s, tarefas: s.tarefas.filter(t => t.id !== id) }));
  }, [update]);

  const addTarefasBatch = useCallback((
    clienteId: string,
    descs: string[],
    prazo: string
  ) => {
    const last = [...state.reunioes].sort((a, b) => b.data.localeCompare(a.data))[0];
    update(s => ({
      ...s,
      tarefas: [
        ...s.tarefas,
        ...descs.map(desc => ({
          id: uid(), clienteId, desc, prazo,
          status: 'pendente' as const,
          reuniaoId: last?.id ?? null,
          criadaEm: new Date().toISOString(),
          comentarios: [],
        })),
      ],
    }));
  }, [update, state.reunioes]);

  // ── COMENTÁRIOS ──────────────────────────

  const addComentario = useCallback((tarefaId: string, txt: string) => {
    update(s => ({
      ...s,
      tarefas: s.tarefas.map(t =>
        t.id === tarefaId
          ? { ...t, comentarios: [...t.comentarios, { txt, at: new Date().toISOString() }] }
          : t
      ),
    }));
  }, [update]);

  const delComentario = useCallback((tarefaId: string, idx: number) => {
    update(s => ({
      ...s,
      tarefas: s.tarefas.map(t =>
        t.id === tarefaId
          ? { ...t, comentarios: t.comentarios.filter((_, i) => i !== idx) }
          : t
      ),
    }));
  }, [update]);

  // ── REUNIÕES ─────────────────────────────

  const addReuniao = useCallback((data: string, obs: string) => {
    update(s => ({
      ...s,
      reunioes: [...s.reunioes, { id: uid(), data, obs }],
    }));
  }, [update]);

  // ── AGENDAS ──────────────────────────────

  const addAgenda = useCallback((agenda: Omit<AgendaRecorrente, 'id'>) => {
    update(s => ({
      ...s,
      agendas: [...s.agendas, { id: uid(), ...agenda }],
    }));
  }, [update]);

  const delAgenda = useCallback((id: string) => {
    update(s => ({ ...s, agendas: s.agendas.filter(a => a.id !== id) }));
  }, [update]);

  // ── OCORRÊNCIAS ──────────────────────────

  const setOcorrencia = useCallback((
    agendaId: string,
    date: string,
    status: 'ocorreu' | 'nao',
    motivo = ''
  ) => {
    const key = `${agendaId}_${date}`;
    update(s => ({
      ...s,
      ocorrencias: {
        ...s.ocorrencias,
        [key]: { status, motivo: status === 'ocorreu' ? '' : motivo },
      },
    }));
  }, [update]);

  // ── COR ALEATÓRIA ────────────────────────

  const randomColor = useCallback(() => {
    const used = new Set(state.clientes.map(c => c.cor.toLowerCase()));
    let attempts = 0, candidate = '';
    do {
      const h = Math.floor(Math.random() * 360);
      const s = 55 + Math.floor(Math.random() * 35);
      const l = 38 + Math.floor(Math.random() * 22);
      candidate = hslToHex(h, s, l);
      attempts++;
    } while (used.has(candidate.toLowerCase()) && attempts < 50);
    return candidate;
  }, [state.clientes]);

  return {
    // estado
    state,
    // getters
    getCliente,
    // clientes
    addCliente, delCliente,
    // tarefas
    addTarefa, updateTarefaStatus, toggleConcluida, cycleStatus, delTarefa, addTarefasBatch,
    // comentários
    addComentario, delComentario,
    // reuniões
    addReuniao,
    // agendas
    addAgenda, delAgenda,
    // ocorrências
    setOcorrencia,
    // utils
    randomColor,
  };
}

// Tipo exportado para os componentes usarem
export type StoreAPI = ReturnType<typeof useStore>;
