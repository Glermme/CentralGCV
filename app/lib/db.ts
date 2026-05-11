/* ════════════════════════════════════════════
   lib/db.ts — Operações de banco (Supabase)
   Substitui localStorage / saveState / loadState
   ════════════════════════════════════════════ */

import { supabase } from '@/lib/supabase';
import type {
  AppState, Cliente, Tarefa, Reuniao,
  AgendaRecorrente, OcorrenciaStatus, Comentario,
} from '@/lib/store';

// ── LOAD COMPLETO ──────────────────────────

export async function loadFromDB(): Promise<AppState> {
  const [
    { data: clientes },
    { data: reunioes },
    { data: tarefas },
    { data: comentarios },
    { data: agendas },
    { data: ocorrencias },
  ] = await Promise.all([
    supabase.from('clientes').select('*').order('criado_em'),
    supabase.from('reunioes').select('*').order('criado_em'),
    supabase.from('tarefas').select('*').order('criado_em'),
    supabase.from('comentarios').select('*').order('criado_em'),
    supabase.from('agendas').select('*').order('criado_em'),
    supabase.from('ocorrencias').select('*'),
  ]);

  // Mapeia comentários para dentro das tarefas
  const tarefasComComentarios: Tarefa[] = (tarefas || []).map(t => ({
    id:          t.id,
    clienteId:   t.cliente_id,
    reuniaoId:   t.reuniao_id,
    desc:        t.descricao,
    prazo:       t.prazo,
    status:      t.status,
    criadaEm:    t.criado_em,
    comentarios: (comentarios || [])
      .filter((c: any) => c.tarefa_id === t.id)
      .map((c: any): Comentario => ({ txt: c.txt, at: c.criado_em })),
  }));

  // Mapeia ocorrências para o formato Record<key, OcorrenciaStatus>
  const ocorrenciasMap: Record<string, OcorrenciaStatus> = {};
  (ocorrencias || []).forEach((o: any) => {
    const key = `${o.agenda_id}_${o.data}`;
    ocorrenciasMap[key] = { status: o.status, motivo: o.motivo };
  });

  return {
    clientes: (clientes || []).map((c: any): Cliente => ({
      id:      c.id,
      nome:    c.nome,
      empresa: c.empresa,
      cor:     c.cor,
    })),
    reunioes: (reunioes || []).map((r: any): Reuniao => ({
      id:   r.id,
      data: r.data,
      obs:  r.obs,
    })),
    tarefas: tarefasComComentarios,
    agendas: (agendas || []).map((a: any): AgendaRecorrente => ({
      id:         a.id,
      clienteId:  a.cliente_id,
      ocorrencia: a.ocorrencia,
      diaSemana:  a.dia_semana,
      hora:       a.hora,
      obs:        a.obs,
    })),
    ocorrencias: ocorrenciasMap,
    colorIdx: 0,
  };
}

// ── CLIENTES ───────────────────────────────

export async function dbAddCliente(c: Cliente) {
  await supabase.from('clientes').insert({
    id: c.id, nome: c.nome, empresa: c.empresa, cor: c.cor,
  });
}

export async function dbDelCliente(id: string) {
  await supabase.from('clientes').delete().eq('id', id);
}

// ── TAREFAS ────────────────────────────────

export async function dbAddTarefa(t: Tarefa) {
  await supabase.from('tarefas').insert({
    id:          t.id,
    cliente_id:  t.clienteId,
    reuniao_id:  t.reuniaoId,
    descricao:   t.desc,
    prazo:       t.prazo,
    status:      t.status,
  });
}

export async function dbUpdateTarefaStatus(id: string, status: string) {
  await supabase.from('tarefas').update({ status }).eq('id', id);
}

export async function dbDelTarefa(id: string) {
  await supabase.from('tarefas').delete().eq('id', id);
}

// ── COMENTÁRIOS ────────────────────────────

export async function dbAddComentario(tarefaId: string, txt: string) {
  const { data } = await supabase
    .from('comentarios')
    .insert({ tarefa_id: tarefaId, txt })
    .select()
    .single();
  return data;
}

export async function dbDelComentario(tarefaId: string, _idx: number, criadoEm: string) {
  // Deleta pelo tarefa_id + criado_em (único o suficiente)
  await supabase
    .from('comentarios')
    .delete()
    .eq('tarefa_id', tarefaId)
    .eq('criado_em', criadoEm);
}

// ── REUNIÕES ───────────────────────────────

export async function dbAddReuniao(r: Reuniao) {
  await supabase.from('reunioes').insert({
    id: r.id, data: r.data, obs: r.obs,
  });
}

// ── AGENDAS ────────────────────────────────

export async function dbAddAgenda(a: AgendaRecorrente) {
  await supabase.from('agendas').insert({
    id:          a.id,
    cliente_id:  a.clienteId,
    ocorrencia:  a.ocorrencia,
    dia_semana:  a.diaSemana,
    hora:        a.hora,
    obs:         a.obs,
  });
}

export async function dbDelAgenda(id: string) {
  await supabase.from('agendas').delete().eq('id', id);
}

// ── OCORRÊNCIAS ────────────────────────────

export async function dbSetOcorrencia(
  agendaId: string,
  data: string,
  status: string,
  motivo: string
) {
  await supabase.from('ocorrencias').upsert({
    agenda_id: agendaId,
    data,
    status,
    motivo,
  }, { onConflict: 'agenda_id,data' });
}

// ── SEED ───────────────────────────────────
// Popula o banco com dados demo. Chamada apenas quando o banco está vazio.

export async function seedDemoDB(state: AppState): Promise<void> {
  // Inserções sequenciais para respeitar FK: clientes → reunioes → agendas → tarefas
  await supabase.from('clientes').insert(
    state.clientes.map(c => ({ id: c.id, nome: c.nome, empresa: c.empresa, cor: c.cor }))
  );

  if (state.reunioes.length) {
    await supabase.from('reunioes').insert(
      state.reunioes.map(r => ({ id: r.id, data: r.data, obs: r.obs }))
    );
  }

  if (state.agendas.length) {
    await supabase.from('agendas').insert(
      state.agendas.map(a => ({
        id:         a.id,
        cliente_id: a.clienteId,
        ocorrencia: a.ocorrencia,
        dia_semana: a.diaSemana,
        hora:       a.hora,
        obs:        a.obs,
      }))
    );
  }

  if (state.tarefas.length) {
    await supabase.from('tarefas').insert(
      state.tarefas.map(t => ({
        id:         t.id,
        cliente_id: t.clienteId,
        reuniao_id: t.reuniaoId,
        descricao:  t.desc,
        prazo:      t.prazo,
        status:     t.status,
      }))
    );
  }
}
