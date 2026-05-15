/* ════════════════════════════════════════════
   lib/db.ts — Operações de banco (Supabase)
   ════════════════════════════════════════════ */

import { supabase } from '@/lib/supabase';
import type {
  AppState, Cliente, Tarefa, Reuniao, Ticket,
  AgendaRecorrente, AgendaExtra, Comentario, Scan, Recheck, Prem, Atividade,
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
  scans: any[], scanOcorrencias: any[], recheks: any[],
  prems: any[], atividades: any[], tickets: any[]
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
    agendas: (agendas || []).map((a: any): AgendaRecorrente => ({ id: a.id, clienteId: a.cliente_id, ocorrencia: a.ocorrencia, diaSemana: a.dia_semana, hora: a.hora, obs: a.obs, criadoEm: a.criado_em || '' })),
    agendasExtras: (extras || []).map((e: any) => ({ id: e.id, clienteId: e.cliente_id, ownerId: e.owner_id, data: e.data, hora: e.hora, duracao: e.duracao, descricao: e.descricao, status: e.status, motivo: e.motivo, criadoEm: e.criado_em })),
    scans: (scans || []).map((s: any): Scan => ({ id: s.id, clienteId: s.cliente_id, ocorrencia: s.ocorrencia, diaSemana: s.dia_semana, hora: s.hora, obs: s.obs, criadoEm: s.criado_em || '' })),
    recheks:    (recheks    || []).map((r: any): Recheck    => ({ id: r.id, clienteId: r.cliente_id, ownerId: r.owner_id, data: r.data, hora: r.hora, duracao: r.duracao, descricao: r.descricao, status: r.status, motivo: r.motivo, criadoEm: r.criado_em })),
    prems:      (prems      || []).map((p: any): Prem      => ({ id: p.id, clienteId: p.cliente_id, ownerId: p.owner_id, data: p.data, hora: p.hora, duracao: p.duracao, descricao: p.descricao, status: p.status, motivo: p.motivo, criadoEm: p.criado_em })),
    atividades: (atividades || []).map((a: any): Atividade => ({ id: a.id, clienteId: a.cliente_id, ownerId: a.owner_id, data: a.data, hora: a.hora, duracao: a.duracao, descricao: a.descricao, status: a.status, motivo: a.motivo, criadoEm: a.criado_em })),
    scanOcorrencias: scanOcorrenciasMap,
    ocorrencias: ocorrenciasMap,
    tickets: (tickets || []).map((t: any): Ticket => ({
      id: t.id, clienteId: t.cliente_id, ownerId: t.owner_id,
      nome: t.nome, numero: t.numero || '', descricao: t.descricao || '',
      criadoEm: t.criado_em, previsaoConclusao: t.previsao_conclusao || '',
      prazo: t.prazo || '', status: t.status,
    })),
    colorIdx: 0,
  };
}

// ── LOAD ───────────────────────────────────

export async function loadFromDB(): Promise<AppState> {
  const [
    { data: clientes }, { data: reunioes }, { data: tarefas },
    { data: comentariosRaw }, { data: agendas }, { data: ocorrencias },
    { data: extras }, { data: perfis }, { data: anexos },
    { data: scans }, { data: scanOcorrencias }, { data: recheks },
    { data: prems }, { data: atividades },
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
    supabase.from('recheks').select('*').order('data').order('hora'),
    supabase.from('prems').select('*').order('data').order('hora'),
    supabase.from('atividades').select('*').order('data').order('hora'),
  ]);

  let tickets: any[] = [];
  try { const { data: td } = await supabase.from('tickets').select('*').order('criado_em'); tickets = td || []; } catch { /* tabela ainda não existe */ }

  return mapState(clientes||[], reunioes||[], tarefas||[], comentariosRaw||[], agendas||[], ocorrencias||[], extras||[], perfis||[], anexos||[], scans||[], scanOcorrencias||[], recheks||[], prems||[], atividades||[], tickets||[]);
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

// ── RECHEKS ────────────────────────────────
export async function dbAddRecheck(r: Recheck, ownerId: string) {
  await supabase.from('recheks').insert({ id: r.id, cliente_id: r.clienteId, owner_id: ownerId, data: r.data, hora: r.hora, duracao: r.duracao, descricao: r.descricao, status: '', motivo: '' });
}
export async function dbDelRecheck(id: string) {
  await supabase.from('recheks').delete().eq('id', id);
}
export async function dbSetRechekStatus(id: string, status: string, motivo: string) {
  await supabase.from('recheks').update({ status, motivo }).eq('id', id);
}

// ── PREMS ──────────────────────────────────
export async function dbAddPrem(p: Prem, ownerId: string) {
  await supabase.from('prems').insert({ id: p.id, cliente_id: p.clienteId, owner_id: ownerId, data: p.data, hora: p.hora, duracao: p.duracao, descricao: p.descricao, status: '', motivo: '' });
}
export async function dbDelPrem(id: string) {
  await supabase.from('prems').delete().eq('id', id);
}
export async function dbSetPremStatus(id: string, status: string, motivo: string) {
  await supabase.from('prems').update({ status, motivo }).eq('id', id);
}

// ── ATIVIDADES ─────────────────────────────
export async function dbAddAtividade(a: Atividade, ownerId: string) {
  await supabase.from('atividades').insert({ id: a.id, cliente_id: a.clienteId, owner_id: ownerId, data: a.data, hora: a.hora, duracao: a.duracao, descricao: a.descricao, status: '', motivo: '' });
}
export async function dbDelAtividade(id: string) {
  await supabase.from('atividades').delete().eq('id', id);
}
export async function dbSetAtividadeStatus(id: string, status: string, motivo: string) {
  await supabase.from('atividades').update({ status, motivo }).eq('id', id);
}

// ── OCORRÊNCIAS ────────────────────────────
export async function dbSetOcorrencia(agendaId: string, data: string, status: string, motivo: string) {
  await supabase.from('ocorrencias').upsert({ agenda_id: agendaId, data, status, motivo }, { onConflict: 'agenda_id,data' });
}

// ── TICKETS ────────────────────────────────
export async function dbAddTicket(t: Ticket, ownerId: string) {
  await supabase.from('tickets').insert({
    id: t.id, cliente_id: t.clienteId, owner_id: ownerId,
    nome: t.nome, numero: t.numero, descricao: t.descricao,
    previsao_conclusao: t.previsaoConclusao || null, prazo: t.prazo || null,
    status: t.status,
  });
}
export async function dbDelTicket(id: string) {
  await supabase.from('tickets').delete().eq('id', id);
}
export async function dbUpdateTicket(id: string, changes: Partial<Omit<Ticket, 'id' | 'ownerId' | 'criadoEm'>>) {
  const payload: Record<string, any> = {};
  if (changes.nome               !== undefined) payload.nome                = changes.nome;
  if (changes.numero             !== undefined) payload.numero              = changes.numero;
  if (changes.descricao          !== undefined) payload.descricao           = changes.descricao;
  if (changes.clienteId          !== undefined) payload.cliente_id          = changes.clienteId;
  if (changes.previsaoConclusao  !== undefined) payload.previsao_conclusao  = changes.previsaoConclusao || null;
  if (changes.prazo              !== undefined) payload.prazo               = changes.prazo || null;
  if (changes.status             !== undefined) payload.status              = changes.status;
  await supabase.from('tickets').update(payload).eq('id', id);
}
