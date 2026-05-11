/* ════════════════════════════════════════════
   lib/db.ts — Operações de banco (Supabase)
   ════════════════════════════════════════════ */

import { supabase } from '@/lib/supabase';
import type {
  AppState, Cliente, Tarefa, Reuniao,
  AgendaRecorrente, Comentario,
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

  const ocorrenciasMap: Record<string, any> = {};
  (ocorrencias || []).forEach((o: any) => {
    ocorrenciasMap[`${o.agenda_id}_${o.data}`] = { status: o.status, motivo: o.motivo };
  });

  return {
    clientes: (clientes || []).map((c: any): Cliente => ({
      id: c.id, nome: c.nome, empresa: c.empresa, cor: c.cor,
    })),
    reunioes: (reunioes || []).map((r: any): Reuniao => ({
      id: r.id, data: r.data, obs: r.obs,
    })),
    tarefas: tarefasComComentarios,
    agendas: (agendas || []).map((a: any): AgendaRecorrente => ({
      id: a.id, clienteId: a.cliente_id,
      ocorrencia: a.ocorrencia, diaSemana: a.dia_semana,
      hora: a.hora, obs: a.obs,
    })),
    ocorrencias: ocorrenciasMap,
    colorIdx: 0,
  };
}

// ── PERFIL ─────────────────────────────────

export async function upsertPerfil(userId: string, email: string) {
  await supabase.from('perfis').upsert({
    id: userId, email, nome: email.split('@')[0],
  }, { onConflict: 'id' });
}

// ── CLIENTES ───────────────────────────────

export async function dbAddCliente(c: Cliente, ownerId: string) {
  await supabase.from('clientes').insert({
    id: c.id, nome: c.nome, empresa: c.empresa, cor: c.cor, owner_id: ownerId,
  });
}

export async function dbDelCliente(id: string) {
  await supabase.from('clientes').delete().eq('id', id);
}

// ── TAREFAS ────────────────────────────────

export async function dbAddTarefa(t: Tarefa, ownerId: string) {
  await supabase.from('tarefas').insert({
    id: t.id, cliente_id: t.clienteId, reuniao_id: t.reuniaoId,
    descricao: t.desc, prazo: t.prazo, status: t.status, owner_id: ownerId,
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

export async function dbDelComentario(tarefaId: string, criadoEm: string) {
  await supabase
    .from('comentarios')
    .delete()
    .eq('tarefa_id', tarefaId)
    .eq('criado_em', criadoEm);
}

// ── REUNIÕES ───────────────────────────────

export async function dbAddReuniao(r: Reuniao, ownerId: string) {
  await supabase.from('reunioes').insert({
    id: r.id, data: r.data, obs: r.obs, owner_id: ownerId,
  });
}

// ── AGENDAS ────────────────────────────────

export async function dbAddAgenda(a: AgendaRecorrente, ownerId: string) {
  await supabase.from('agendas').insert({
    id: a.id, cliente_id: a.clienteId, ocorrencia: a.ocorrencia,
    dia_semana: a.diaSemana, hora: a.hora, obs: a.obs, owner_id: ownerId,
  });
}

export async function dbDelAgenda(id: string) {
  await supabase.from('agendas').delete().eq('id', id);
}

// ── OCORRÊNCIAS ────────────────────────────

export async function dbSetOcorrencia(
  agendaId: string, data: string, status: string, motivo: string
) {
  await supabase.from('ocorrencias').upsert({
    agenda_id: agendaId, data, status, motivo,
  }, { onConflict: 'agenda_id,data' });
}

// ── SEED DEMO ──────────────────────────────

export async function seedDemoDB(state: AppState, ownerId: string) {
  for (const c of state.clientes) {
    await dbAddCliente(c, ownerId);
  }
  for (const r of state.reunioes) {
    await dbAddReuniao(r, ownerId);
  }
  for (const a of state.agendas) {
    await dbAddAgenda(a, ownerId);
  }
  for (const t of state.tarefas) {
    await dbAddTarefa(t, ownerId);
  }
}
