# Central GCV — Contexto do Projeto

## O que é
Sistema interno da OSTEC para gestão de reuniões, tarefas e agenda recorrente de clientes.
Migração de um monólito HTML/JS para uma stack moderna.

## Stack
- **Frontend:** Next.js 16 + React + TypeScript + Tailwind
- **UI:** shadcn/ui (Radix)
- **Banco:** Supabase (PostgreSQL)
- **Hospedagem:** local por enquanto

## Identidade visual
- Tema escuro/claro: fundo ivory (#FDFFF4), header dark (#231F20)
- Cor de destaque: cyan (#0DDBFF / #0ab8d8)
- Fonte: Isidora Sans (carregada via @font-face)
- Tokens CSS em `app/globals.css` (--cyan, --dark, --ivory, --muted, etc.)
- **Não alterar a identidade visual sem solicitação**

## Estrutura de pastas
```
app/                        ← raiz do projeto Next.js
├── app/
│   ├── globals.css         ← tokens de cor + fonte + classes globais
│   ├── layout.tsx          ← layout base
│   └── page.tsx            ← shell principal (header, tabs, views, modais, toast)
├── components/
│   ├── Dashboard.tsx       ← visão geral, stats, próximas reuniões, tarefas abertas
│   ├── Clientes.tsx        ← cards expansíveis, tarefas inline, comentários, batch
│   ├── Agenda.tsx          ← agenda recorrente, status ocorrência, form nova recorrência
│   ├── Historico.tsx       ← reuniões registradas com resumo por cliente
│   ├── Configurar.tsx      ← CRUD clientes, paleta de cores, lista agendas
│   └── modals/
│       ├── ModalTarefa.tsx  ← modal de nova tarefa (FAB e header)
│       └── ModalReuniao.tsx ← modal de registrar reunião
├── hooks/
│   └── useStore.ts         ← estado global + todas as operações (Supabase + localStorage cache)
└── lib/
    ├── store/
    │   └── index.ts        ← tipos TypeScript, constantes, utilitários, demo data, localStorage
    ├── agenda.ts           ← cálculo de slots de agenda recorrente (nthWeekday, getAgendaSlots)
    ├── db.ts               ← operações Supabase (loadFromDB, dbAdd*, dbDel*, dbUpdate*)
    └── supabase.ts         ← cliente Supabase (createClient)
```

## Modelo de dados (Supabase)
```
clientes    → id, nome, empresa, cor, criado_em
reunioes    → id, data, obs, criado_em
tarefas     → id, cliente_id, reuniao_id, descricao, prazo, status, criado_em
comentarios → id, tarefa_id, txt, criado_em
agendas     → id, cliente_id, ocorrencia, dia_semana, hora, obs, criado_em
ocorrencias → id, agenda_id, data, status, motivo — unique(agenda_id, data)
```

## Variáveis de ambiente
```
NEXT_PUBLIC_SUPABASE_URL=https://skevzcdrhpblifzdkydj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_iuPFSugCJ1D8Q_pJaoOHMw_Lh_lkNTC
```
(arquivo .env.local na raiz de app/)

## Fases do projeto
- [x] Fase 1 — separação do monólito em módulos (HTML, CSS, JS)
- [x] Fase 2 — migração para Next.js + React + TypeScript + shadcn/ui
- [x] Fase 3 — backend Supabase (tabelas criadas, db.ts, useStore atualizado) ← AQUI
- [ ] Fase 3 pendente — testar conexão no browser, migrar dados demo para o banco
- [ ] Fase 4 — autenticação, multiusuário, níveis de acesso
- [ ] Fase 5 — polish: loading states, erros, responsividade, exportação XLS
- [ ] Fase 6 — PWA + mobile (Expo)
- [ ] Fase 7 — monitoramento, documentação, onboarding
- [ ] Fase 8 — IA (resumo de reuniões, geração de tarefas, sugestões)

## Estado atual (Fase 3 em andamento)
- Tabelas criadas no Supabase com RLS habilitado e policy "public access"
- `lib/supabase.ts` — cliente configurado
- `lib/db.ts` — todas as operações CRUD
- `hooks/useStore.ts` — atualizado para chamar Supabase + manter cache localStorage
- `app/page.tsx` — atualizado com loading state
- **Próximo passo:** abrir o browser, confirmar que carrega sem erros, adicionar um cliente de teste e verificar se aparece no Supabase

## Comportamento do useStore
- Na inicialização: carrega do localStorage (instantâneo) e em seguida busca do Supabase
- Cada operação (add, del, update): chama o banco primeiro, depois atualiza o estado local
- Fallback offline: se o Supabase falhar, usa o localStorage

## Observações importantes
- O campo `desc` no TypeScript mapeia para `descricao` no banco (desc é palavra reservada no PostgreSQL)
- IDs são gerados no frontend com `uid()` (timestamp + random)
- Agenda recorrente não tem datas fixas — é calculada em runtime por `getAgendaSlots()`
- `ocorrencias` usa upsert com conflict em `(agenda_id, data)`
