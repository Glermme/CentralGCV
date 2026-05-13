/* ════════════════════════════════════════════
   lib/db.ts — Operações de banco (Supabase)
   ════════════════════════════════════════════ */

import { supabase } from '@/lib/supabase';
import type {
  AppState, Cliente, Tarefa, Reuniao,
  AgendaRecorrente, AgendaExtra, Comentario, Scan,
} from '@/lib/store';

// ── LOGS ───────────────────────────────────

export async function dbLog(
  userId: string, userNome: string,
  acao: string, entidade: string,
  entidadeId = '', detalhe = ''
) {
  try {
    await supabase.from('logs').insert({
      user_id: userId, user_nome: userNome,
      acao, entidade, entidade_id: entidadeId, detalhe,
    });
  } catch { /* silencioso — log nunca deve quebrar a operação principal */ }
}

export async function loadLogs(limit = 200) {
  const { data } = await supabase
    .from('logs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── MAP STATE ──────────────────────────────

function mapState(
  clientes: any[], reunioes: any[], tarefas: any[],
  comentariosRaw: any[], agendas: any[], ocorrencias: any[],
  extras: any[], perfis: any[], anexos: any[],
  scans: any[], scanOcorrencias: any[]
): AppState {
  const perfilMap: Record<string, { nome: string; avatar: string }> = {};
  perfis.forEach((p: any) => {
    perfilMap[p.id] = { nome: p.nome || p.email?.split('@')[0] || '?', avatar: p.avatar_url || '' };
  });

  const comentarios = (comentariosRaw || []).map((c: any) => ({
    ...c,
    anexos: (anexos || []).filter((a: any) => a.tarefa_id === c.tarefa_id && a.comentario_idx === c.id),
  }));

  const tarefasComComentarios: Tarefa[] = (tarefas || []).map(t => ({
    id: t.id, clienteId: t.cliente_id, reuniaoId: t.reuniao_id,
    desc: t.descricao, prazo: t.prazo, status: t.status, criadaEm: t.criado_em,
    comentarios: comentarios
      .filter((c: any) => c.tarefa_id === t.id)
      .map((c: any): Comentario => ({
        txt: c.txt, at: c.criado_em,
        autorId: c.autor_id || '',
        autorNome: c.autor_id ? (perfilMap[c.autor_id]?.nome || '?') : '?',
        autorAvatar: c.autor_id ? (perfilMap[c.autor_id]?.avatar || '') : '',
        anexos: (c.anexos || []).map((a: any) => ({ id: a.id, nome: a.nome, url: a.url, tipo: a.tipo })),
      })),
  }));

  const ocorrenciasMap: Record<string, any> = {};
  (ocorrencias || []).forEach((o: any) => {
    ocorrenciasMap[`${o.agenda_id}_${o.data}`] = { status: o.status, motivo: o.motivo };
  });

  const scanOcorrenciasMap: Record<string, any> = {};
  (scanOcorrencias || []).forEach((o: any) => {
    scanOcorrenciasMap[`${o.scan_id}_${o.data}`] = { status: o.status, motivo: o.motivo };
  });

  return {
    clientes: (clientes || []).map((c: any): Cliente => ({ id: c.id, nome: c.nome, empresa: c.empresa, cor: c.cor })),
    reunioes: (reunioes || []).map((r: any): Reuniao => ({ id: r.id, data: r.data, obs: r.obs })),
    tarefas: tarefasComComentarios,
    agendas: (agendas || []).map((a: any): AgendaRecorrente => ({ id: a.id, clienteId: a.cliente_id, ocorrencia: a.ocorrencia, diaSemana: a.dia_semana, hora: a.hora, obs: a.obs })),
    agendasExtras: (extras || []).map((e: any) => ({ id: e.id, clienteId: e.cliente_id, ownerId: e.owner_id, data: e.data, hora: e.hora, duracao: e.duracao, descricao: e.descricao, status: e.status, motivo: e.motivo, criadoEm: e.criado_em })),
    scans: (scans || []).map((s: any): Scan => ({ id: s.id, clienteId: s.cliente_id, ocorrencia: s.ocorrencia, diaSemana: s.dia_semana, hora: s.hora, obs: s.obs })),
    scanOcorrencias: scanOcorrenciasMap,
    ocorrencias: ocorrenciasMap,
    colorIdx: 0,
  };
}

// ── LOAD ───────────────────────────────────

export async function loadFromDB(): Promise<AppState> {
  const [
    { data: clientes }, { data: reunioes }, { data: tarefas },
    { data: comentariosRaw }, { data: agendas }, { data: ocorrencias },
    { data: extras }, { data: perfis }, { data: anexos },
    { data: scans }, { data: scanOcorrencias },
  ] = await Promise.all([
    supabase.from('clientes').select('*').order('criado_em'),
    supabase.from('reunioes').select('*').order('criado_em'),
    supabase.from('tarefas').select('*').order('criado_em'),
    supabase.from('comentarios').select('*').order('criado_em'),
    supabase.from('agendas').select('*').order('criado_em'),
    supabase.from('ocorrencias').select('*'),
    supabase.from('agendas_extras').select('*').order('data').order('hora'),
    supabase.from('perfis').select('id, nome, email, avatar_url'),
    supabase.from('comentario_anexos').select('*'),
    supabase.from('scans').select('*').order('criado_em'),
    supabase.from('scan_ocorrencias').select('*'),
  ]);

  return mapState(clientes||[], reunioes||[], tarefas||[], comentariosRaw||[], agendas||[], ocorrencias||[], extras||[], perfis||[], anexos||[], scans||[], scanOcorrencias||[]);
}

export async function loadAllFromDB(): Promise<AppState> { return loadFromDB(); }

// ── PERFIL ─────────────────────────────────
export async function upsertPerfil(userId: string, email: string) {
  await supabase.from('perfis').upsert({ id: userId, email, nome: email.split('@')[0] }, { onConflict: 'id' });
}
export async function loadPerfis() {
  const { data } = await supabase.from('perfis').select('*').order('criado_em');
  return data || [];
}
export async function updatePerfilRole(userId: string, role: string) {
  await supabase.from('perfis').update({ role }).eq('id', userId);
}
export async function updatePerfilNome(userId: string, nome: string) {
  await supabase.from('perfis').update({ nome }).eq('id', userId);
}

// ── CLIENTES ───────────────────────────────
export async function dbAddCliente(c: Cliente, ownerId: string) {
  await supabase.from('clientes').insert({ id: c.id, nome: c.nome, empresa: c.empresa, cor: c.cor, owner_id: ownerId });
}
export async function dbDelCliente(id: string) {
  await supabase.from('clientes').delete().eq('id', id);
}

// ── TAREFAS ────────────────────────────────
export async function dbAddTarefa(t: Tarefa, ownerId: string) {
  await supabase.from('tarefas').insert({ id: t.id, cliente_id: t.clienteId, reuniao_id: t.reuniaoId, descricao: t.desc, prazo: t.prazo, status: t.status, owner_id: ownerId });
}
export async function dbUpdateTarefaStatus(id: string, status: string) {
  await supabase.from('tarefas').update({ status }).eq('id', id);
}
export async function dbDelTarefa(id: string) {
  await supabase.from('tarefas').delete().eq('id', id);
}

// ── COMENTÁRIOS ────────────────────────────
export async function dbAddComentario(tarefaId: string, txt: string, autorId: string) {
  const { data } = await supabase.from('comentarios').insert({ tarefa_id: tarefaId, txt, autor_id: autorId }).select().single();
  return data;
}
export async function dbDelComentario(tarefaId: string, criadoEm: string) {
  await supabase.from('comentarios').delete().eq('tarefa_id', tarefaId).eq('criado_em', criadoEm);
}

// ── ANEXOS ─────────────────────────────────
export async function dbAddAnexo(tarefaId: string, comentarioId: number, nome: string, url: string, tipo: string) {
  await supabase.from('comentario_anexos').insert({ tarefa_id: tarefaId, comentario_idx: comentarioId, nome, url, tipo });
}
export async function dbUploadAnexo(file: File, userId: string): Promise<string | null> {
  const ext  = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('anexos').upload(path, file, { upsert: false });
  if (error) return null;
  const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(path);
  return publicUrl;
}

// ── REUNIÕES ───────────────────────────────
export async function dbAddReuniao(r: Reuniao, ownerId: string) {
  await supabase.from('reunioes').insert({ id: r.id, data: r.data, obs: r.obs, owner_id: ownerId });
}

// ── AGENDAS ────────────────────────────────
export async function dbAddAgenda(a: AgendaRecorrente, ownerId: string) {
  await supabase.from('agendas').insert({ id: a.id, cliente_id: a.clienteId, ocorrencia: a.ocorrencia, dia_semana: a.diaSemana, hora: a.hora, obs: a.obs, owner_id: ownerId });
}
export async function dbDelAgenda(id: string) {
  await supabase.from('agendas').delete().eq('id', id);
}

// ── AGENDAS EXTRAS ─────────────────────────
export async function dbAddAgendaExtra(e: AgendaExtra, ownerId: string) {
  await supabase.from('agendas_extras').insert({ id: e.id, cliente_id: e.clienteId, owner_id: ownerId, data: e.data, hora: e.hora, duracao: e.duracao, descricao: e.descricao, status: '', motivo: '' });
}
export async function dbDelAgendaExtra(id: string) {
  await supabase.from('agendas_extras').delete().eq('id', id);
}
export async function dbSetAgendaExtraStatus(id: string, status: string, motivo: string) {
  await supabase.from('agendas_extras').update({ status, motivo }).eq('id', id);
}

// ── SCANS ──────────────────────────────────
export async function dbAddScan(s: Scan, ownerId: string) {
  await supabase.from('scans').insert({ id: s.id, cliente_id: s.clienteId, ocorrencia: s.ocorrencia, dia_semana: s.diaSemana, hora: s.hora, obs: s.obs, owner_id: ownerId });
}
export async function dbDelScan(id: string) {
  await supabase.from('scans').delete().eq('id', id);
}
export async function dbSetScanStatus(scanId: string, data: string, status: string, motivo: string) {
  await supabase.from('scan_ocorrencias').upsert({ scan_id: scanId, data, status, motivo }, { onConflict: 'scan_id,data' });
}

// ── OCORRÊNCIAS ────────────────────────────
export async function dbSetOcorrencia(agendaId: string, data: string, status: string, motivo: string) {
  await supabase.from('ocorrencias').upsert({ agenda_id: agendaId, data, status, motivo }, { onConflict: 'agenda_id,data' });
}
