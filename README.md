# Torneios de Padel

Plataforma web para criação e gestão de torneios de padel (duplas). Suporta múltiplos formatos de torneio, introdução de resultados em tempo real, vista pública partilhável e PWA instalável em mobile.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Base de dados | SQLite via `better-sqlite3` |
| ORM | Prisma 7 com `@prisma/adapter-better-sqlite3` |
| Estilos | Tailwind CSS (`darkMode: "class"`) |
| Drag & drop | @dnd-kit |
| Validação | Zod |
| Testes | Vitest |
| QR Code | qrcode |

## Funcionalidades

### Séries / Categorias

Um torneio pode ter **uma ou múltiplas séries** (ex: M3, M4, F3, MX3). Cada série é gerida de forma independente — jogadores, bracket e estado próprios.

**Modos de torneio:**

| Modo | Descrição |
|------|-----------|
| **Manual** | O organizador escolhe um formato de jogo único aplicado a todas as séries |
| **FPP Automático** | Formato e sistema de cada série determinados automaticamente pela tabela FPP, com base no número de duplas confirmadas |

**Ciclo de vida de uma série:** `draft` → `in_progress` (após gerar o bracket) → `completed` (todos os jogos terminados). O estado do torneio reflecte o agregado de todas as séries.

**Séries disponíveis (FPP):**

| Grupo | Códigos |
|-------|---------|
| Masculino | M1, M2, M3, M4, M5, M6 |
| Feminino | F1, F2, F3, F4, F5, F6 |
| Misto | MX1, MX2, MX3, MX4, MX5, MX6 |
| Veteranos Masc. | +35M, +40M, +45M, +50M, +55M, +60M |
| Veteranas Fem. | +35F, +40F, +45F, +50F, +55F, +60F |
| Sub | SUB18, SUB14, SUB12 |

Torneios sem séries explícitas usam uma série interna `OPEN` (retrocompatibilidade total).

---

### Formatos de torneio

| Formato | Descrição |
|---------|-----------|
| **Eliminação simples** | Bracket com ou sem jogo do 3.º lugar |
| **Eliminação dupla** | Winners + losers bracket com grand final |
| **Round Robin** | Todos contra todos com tabela de classificação |
| **Grupos + Knockout** | Fase de grupos (manual) seguida de eliminação simples |
| **Regulamento FPP** | Sistema automático conforme o nº de duplas confirmadas (ver abaixo) |

#### Regulamento FPP — sistema automático (`fpp_auto`)

Quando o bracket é gerado, o sistema escolhe automaticamente conforme o número de duplas confirmadas:

| Duplas | Sistema |
|--------|---------|
| 4–5 | 1 grupo (round-robin) + Final |
| 6–8 | 2 grupos + Meias-finais + Final |
| 9–11 | 3 grupos + Quartos + Meias + Final |
| 12+ | Quadro directo (eliminação simples) |

O seeding do quadro knockout garante **zero confrontos do mesmo grupo na primeira ronda**:
- **2 grupos** → Meias cruzadas: 1ºA vs 2ºB e 1ºB vs 2ºA
- **3 grupos** → 1ºA e 1ºB têm bye; quartos: 2ºB-2ºC e 1ºC-2ºA
- **4 grupos** → Quartos: 1ºA-2ºC, 1ºD-2ºB, 1ºB-2ºD, 1ºC-2ºA

A distribuição de jogadores pelos grupos segue o método serpentina, produzindo grupos equilibrados para contagens ímpares (ex: 7 duplas → grupos 3+4; 10 duplas → grupos 3+3+4).

---

### Formatos de jogo

#### Formatos FPP (Federação Portuguesa de Padel)

| Código | Descrição | Tempo est. |
|--------|-----------|-----------|
| **M3SPO** | 2 sets a 6 jogos No-Ad + Super Tie-Break *(default)* | ~65 min |
| **M3S** | 2 sets a 6 jogos + Super Tie-Break | ~80 min |
| **M3PO** | 3 sets a 6 jogos No-Ad | ~100 min |
| **M3** | 3 sets a 6 jogos, vantagem | ~100 min |
| **PROPO** | 1 set a 9 jogos No-Ad | ~45 min |
| **PRO** | 1 set a 9 jogos | ~60 min |

#### Formatos FFT (Fédération Française de Tennis)

| Código | Descrição |
|--------|-----------|
| A1 / A2 | Melhor de 3 sets (6 jogos, vantagem / No-Ad) |
| B1 / B2 | 2 sets a 6 jogos + Super Tie-Break (vantagem / No-Ad) |
| C1 / C2 | 2 sets a 4 jogos + Super Tie-Break (vantagem / No-Ad) |
| D1 / D2 | 1 set a 9 jogos (vantagem / No-Ad) |
| E | Super Tie-Break isolado (primeiro a 10 com 2 de vantagem) |
| F | 1 set a 4 jogos No-Ad, tie-break a 3-3 |

Os formatos FPP são aliases dos FFT: PRO≡D1, PROPO≡D2, M3S≡B1, M3SPO≡B2, M3≡A1, M3PO≡A2. O selector no formulário de criação agrupa-os em FPP e FFT.

**Star Point (FIP 2026)** — checkbox opcional aplicável a qualquer formato. Até 2 vantagens alternadas são permitidas; se o marcador regressar a 40-40 pela terceira vez, o ponto seguinte é decisivo.

---

### Gestão de duplas
- Cada dupla tem **Jogador 1** e **Jogador 2** (obrigatórios) e nome de dupla opcional
- Drag & drop para definir seeds; shuffle aleatório
- **Importação em massa** — cola uma lista no formato `João / Maria` (um por linha) ou nomes alternados; preview em tempo real do número de duplas detectadas
- **Check-in** — o admin marca presença por dupla antes de gerar o bracket; botões "✓ Todas" / "✗ Nenhuma" para confirmação rápida; só as duplas confirmadas entram no bracket
- O botão **Gerar Bracket** mostra, para o formato FPP, qual o sistema que será usado com as duplas confirmadas actuais
- **Vista pública vs admin**: sem token na URL todas as opções de edição estão ocultas; com `?token=<adminToken>` acesso total

### Resultados e scores
- Modal de introdução de resultados com botões +/− por set (optimizado para mobile)
- Detecção automática de vencedor de set e de jogo com base na estrutura do formato (sem hardcoding de nomes de formatos)
- Suporte a tie-breaks e Super Tie-Break com campos dedicados
- Avanço automático no bracket após cada resultado
- **Reset de resultado** — um jogo já concluído pode ter o resultado reposto desde que o jogo seguinte no bracket ainda não tenha resultado; confirmação obrigatória no modal
- **Início de jogo** — botão "Iniciar jogo" regista `startedAt`; ao submeter o resultado, o sistema calcula o atraso relativamente ao slot agendado e empurra automaticamente os jogos seguintes no mesmo campo (_delay-push_)

### Classificação em grupos (Round Robin / Fase de Grupos)

Tabela com colunas: **J** (jogos disputados), **V** (vitórias), **D** (derrotas), **SG** (sets ganhos), **SP** (sets perdidos), **SS** (saldo de sets), **JG** (jogos/games ganhos), **JP** (jogos perdidos), **SJ** (saldo de jogos).

Critérios de desempate (por ordem):
1. Vitórias
2. Saldo de sets (SG − SP)
3. Saldo de jogos (JG − JP)
4. Confronto directo (h2h wins)
5. Saldo de jogos no confronto directo

### Gestão de torneios (admin)
- **Editar** — nome, descrição, número de campos, torneio público, inscrições abertas
- **Eliminar** — apaga torneio e todos os dados associados
- **Clonar** — cria novo rascunho com as mesmas duplas, séries e configurações (mapeamento de categoryId preservado)
- **Gerir Categorias** — adicionar ou remover séries em qualquer torneio (série só pode ser removida se ainda em rascunho e existir pelo menos uma outra)
- Separador **Agenda** — definir campo e hora por jogo ou agendar automaticamente todos os jogos distribuídos pelos campos disponíveis
- Botão **WhatsApp** por jogo agendado — abre o WhatsApp com mensagem pré-formatada (nomes das duplas, data/hora, campo, nome do torneio) para partilhar num grupo
- Separador **Inscrições** — aprovar ou rejeitar inscrições pendentes de duplas; em torneios multi-série o admin pode mudar a série antes de aprovar

### Auto-inscrição pública
- Página pública `/tournament/[slug]/register` para duplas se inscreverem
- Formulário: Jogador 1, Jogador 2, nome de dupla (opcional), contacto (opcional)
- Em torneios com múltiplas séries: dropdown obrigatório para escolher a série
- Inscrições ficam pendentes até o admin aprovar (cria dupla na série correspondente) ou rejeitar
- Activado por `registrationOpen` no torneio

### Agenda e campos
- `courtCount` no torneio define o número de campos disponíveis
- **Auto-agendamento** — distribui todos os jogos pelos campos disponíveis com duração configurável e janelas horárias por dia (suporta múltiplos dias); respeita jogos já concluídos ou em curso ao calcular o próximo slot livre por campo
- `slotMinutes` e `scheduleDays` (JSON) ficam persistidos no torneio após auto-agendamento, permitindo ao _delay-push_ calcular o fim de cada janela diária
- Cada jogo pode ter campo e hora definidos individualmente via separador Agenda
- Jogos já concluídos ou em curso não podem ser reagendados (bloqueio na API)

### "Os meus jogos"
- Página `/tournament/[slug]/minha-dupla` — pesquisa por nome (mín. 2 letras) e vê todos os jogos da dupla
- Secções: Em Curso / Próximos / Concluídos, com resultado, campo e hora
- Pesquisa persiste por torneio em `localStorage`
- Acessível via bottom nav em mobile

### Estatísticas
- Página `/tournament/[slug]/stats` com classificação de todas as duplas
- Colunas: jogos disputados, vitórias, derrotas, % vitórias, sets+/-, games+/-

### Exportação
- `/tournament/[slug]/export?format=csv` — todos os jogos em CSV
- `/tournament/[slug]/export?format=ical` — agenda em formato iCal (.ics) para importar no calendário

### Diretório público
- `/torneios` lista todos os torneios marcados como públicos
- Pesquisa por nome/descrição, badge de inscrições abertas

### PWA — Progressive Web App
- Instalável como app nativa em Android e iOS ("Adicionar ao ecrã inicial")
- Service worker com cache network-first para API e cache-first para páginas
- Ícone, splash screen e theme color configurados

### UX mobile
- **Bottom navigation** fixo em mobile: Bracket / Os meus jogos / Estatísticas (vista pública) ou Bracket / Agenda / Inscrições (admin)
- Bracket em mobile com tabs por ronda (lista de jogos); bracket visual completo em desktop
- Eliminação dupla e grupos com tabs por secção em mobile
- Dark mode com toggle (persiste em `localStorage`, sem flash ao carregar)
- Toast notifications para feedback de acções
- Loading skeletons durante carregamento

### Vista de bracket em ecrã completo
- `/tournament/[slug]/bracket` — bracket sem navegação
- Em torneios multi-série: tabs por série, com persistência em `?cat=<código>`
- Botão **Imprimir** com CSS de impressão (oculta nav, mostra cabeçalho limpo)
- Destaque do caminho do vencedor

### "Os meus torneios"
- Torneios criados no browser ficam guardados em `localStorage`
- Painel na homepage com links de vista pública e admin

### Painel de administração global
- `/admin` — lista todos os torneios da plataforma
- Protegido por `PLATFORM_ADMIN_TOKEN`
- Estatísticas por estado, pesquisa por nome/slug

### QR Code
- LinkShare gera QR code da ligação pública localmente (download PNG)

---

## Base de dados

A aplicação suporta **SQLite** e **MySQL / MariaDB**. A escolha é feita através de `DATABASE_URL` no ficheiro `.env`.

### SQLite (padrão)

Não requer servidor. Funciona em dev e em produção.

```env
DATABASE_URL="file:./dev.db"
```

### MySQL / MariaDB

```env
DATABASE_URL="mysql://user:password@localhost:3306/padel_torneios"
# ou
DATABASE_URL="mariadb://user:password@localhost:3306/padel_torneios"
```

Cria a base de dados no servidor antes de correr `db:setup`:
```sql
CREATE DATABASE padel_torneios CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Como funciona `db:setup`

O script detecta o tipo de base de dados pelo prefixo do `DATABASE_URL`, patcha automaticamente o `prisma/schema.prisma` com o `provider` correcto, corre `prisma generate` e aplica as migrações:

- **SQLite** → aplica os ficheiros SQL em `prisma/migrations-sqlite/` directamente via `better-sqlite3` (idempotente — salta migrações já aplicadas; tolera colunas/tabelas já existentes)
- **MySQL/MariaDB** → corre `prisma migrate deploy` com a migração em `prisma/migrations/`

---

## Variáveis de ambiente

Criar `.env` na raiz do projecto:

```env
# Escolhe UMA das opções:
DATABASE_URL="file:./dev.db"                                        # SQLite
# DATABASE_URL="mysql://user:password@localhost:3306/padel_torneios" # MySQL
# DATABASE_URL="mariadb://user:password@localhost:3306/padel_torneios" # MariaDB

PLATFORM_ADMIN_TOKEN=padel-admin-2025
```

---

## Comandos

```bash
# Desenvolvimento
npm run dev

# Base de dados
npm run db:setup    # configura DB (detecta SQLite/MySQL, aplica migrações, gera Prisma client)
npm run db:seed     # insere os 8 torneios de demonstração
npm run db:reset    # apaga e recria a DB (SQLite: apaga ficheiro; MySQL: migrate reset) + seed

# Testes
npm run test              # corre todos os testes (vitest)
npm run test:watch        # modo watch
npm run test:coverage     # cobertura

# Lint
npm run lint

# Produção (build inclui prisma generate automaticamente)
npm run build
npm run start
```

### Deploy em produção

Ordem correcta após `git pull`:

```bash
npm run db:setup    # aplica novas migrações + regenera Prisma client
npm run build       # inclui prisma generate + next build
pm2 restart 0       # ou systemctl restart / outro gestor de processos
```

> **Nota**: `db:setup` deve correr **antes** de `build` para garantir que o Prisma client está actualizado com o schema mais recente.

---

## Estrutura do projecto

```
src/
├── app/
│   ├── page.tsx                          # Homepage (criar torneio + Os meus torneios)
│   ├── admin/page.tsx                    # Painel de administração global
│   ├── torneios/page.tsx                 # Diretório público de torneios
│   ├── manifest.ts                       # PWA manifest
│   ├── icon.tsx                          # Favicon gerado em runtime
│   ├── apple-icon.tsx                    # Apple touch icon
│   ├── api/
│   │   ├── admin/route.ts                # GET /api/admin (token plataforma)
│   │   ├── tournaments/route.ts          # GET /api/tournaments (públicos)
│   │   └── tournament/
│   │       ├── route.ts                  # POST /api/tournament (criar; suporta tournamentMode + categories)
│   │       └── [slug]/
│   │           ├── route.ts              # GET (inclui categories com players+matches) / PATCH / DELETE
│   │           ├── categories/
│   │           │   ├── route.ts          # GET listar séries; POST adicionar série por código
│   │           │   └── [categoryId]/route.ts  # PUT actualizar; DELETE remover série
│   │           ├── generate/route.ts     # POST gerar bracket por categoryId; fpp_auto auto-determina formato
│   │           ├── players/route.ts      # POST/PUT/PATCH/DELETE duplas + check-in (aceita categoryId)
│   │           ├── match/[matchId]/      # PUT resultado; avança grupos e sets category.status
│   │           ├── clone/route.ts        # POST clonar (remapeia categoryIds)
│   │           ├── register/route.ts     # GET/POST/PATCH inscrições (aceita categoryId)
│   │           ├── reset/route.ts        # POST repor bracket (opcional: só uma categoria)
│   │           ├── schedule/route.ts     # PATCH/POST agenda de jogos
│   │           ├── export/route.ts       # GET exportar CSV / iCal
│   │           └── stream/route.ts       # GET SSE para live updates
│   └── tournament/[slug]/
│       ├── page.tsx                      # Vista principal (tabs por série; FPP confirm dialog)
│       ├── bracket/page.tsx              # Ecrã completo + tabs por série (?cat=) + imprimir
│       ├── minha-dupla/page.tsx          # "Os meus jogos" — pesquisa por nome
│       ├── stats/page.tsx                # Estatísticas por dupla
│       └── register/page.tsx             # Inscrição pública (dropdown de série se multi-série)
├── components/
│   ├── bracket/
│   │   ├── MatchCard.tsx                 # Cartão de jogo (destaque vencedor)
│   │   ├── SingleEliminationBracket.tsx  # Vista desktop + tabs mobile por ronda
│   │   ├── DoubleEliminationBracket.tsx  # Winners/Losers/Final com tabs mobile
│   │   ├── RoundRobinTable.tsx           # Classificação (J/V/D/SG/SP/SS/JG/JP/SJ) + jogos
│   │   ├── GroupStageView.tsx            # Grupos com tabs mobile
│   │   └── BracketConnector.tsx          # Linhas SVG entre jogos
│   ├── tournament/
│   │   ├── CreateTournamentForm.tsx      # Toggle Manual/FPP Auto; selector séries; FPPAutoInfo
│   │   ├── PlayerList.tsx                # Duplas: drag & drop, bulk import, check-in (passa categoryId)
│   │   ├── MyTournaments.tsx             # Painel localStorage
│   │   ├── ScoreInputModal.tsx           # Introdução de resultados com +/− buttons
│   │   ├── TournamentHeader.tsx          # Editar / Eliminar / Clonar
│   │   ├── LinkShare.tsx                 # Partilhar link + QR code
│   │   ├── ScheduleManager.tsx           # Agenda de jogos + WhatsApp notification
│   │   └── RegistrationPanel.tsx         # Aprovar/rejeitar; filtro por série; mudar série
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── TournamentBottomNav.tsx        # Bottom nav fixo em mobile
│       └── PwaRegister.tsx               # Registo do service worker
├── lib/
│   ├── bracket-engine.ts                 # generateSingleElimination / RR / Groups / DE
│   ├── fpp-bracket.ts                    # getFPPConfig (sistema por nº duplas) + fppKnockoutOrder
│   ├── fpp-format.ts                     # getFppFormatForCategory — determina matchFormat + systemType (FPP Auto)
│   ├── categories.ts                     # FPP_CATEGORIES (34 séries); getCategoryName
│   ├── scoring.ts                        # Formatos FPP + FFT; determineSetWinner; validateScores
│   ├── standings.ts                      # computeGroupStandings (5 critérios de desempate)
│   ├── bulk-import.ts                    # parseBulkText — parser de importação em massa
│   ├── my-tournaments.ts                 # localStorage helpers
│   ├── validators.ts                     # Zod schemas (tournamentMode; categories)
│   └── db.ts / slug.ts / utils.ts / seeding.ts / round-robin.ts
├── __tests__/
│   ├── scoring.test.ts                   # 100+ testes de scoring por formato (FFT + FPP + aliases + No-Ad)
│   ├── bracket-engine.test.ts            # Testes de geração de brackets (SE, RR, Grupos, DE)
│   ├── standings.test.ts                 # Testes de classificação com h2h e contadores
│   ├── bulk-import.test.ts               # Testes do parser de importação em massa
│   ├── fpp-bracket.test.ts               # Testes de getFPPConfig e fppKnockoutOrder
│   ├── fpp-format.test.ts                # Testes de getFppFormatForCategory (tabela FPP Annex XIX)
│   ├── categories.test.ts                # Testes das 34 séries FPP e getCategoryName
│   └── validators.test.ts                # Testes dos Zod schemas de validação de input
└── types/index.ts                        # Tournament, Player, Match, Registration, Category, MatchFormat

prisma/
├── schema.prisma                         # patchado pelo db:setup (provider varia)
├── migrations/                           # migrações MySQL/MariaDB
│   └── 20260424000000_init_mysql/
└── migrations-sqlite/                    # migrações SQLite (aplicadas pelo setup-db.mjs)
    ├── 20260423195815_init/
    ├── 20260423_scoring/
    ├── 20260424_doubles/
    ├── 20260424_features/
    ├── 20260425_checkin/
    ├── 20260426_starpoint/
    ├── 20260427_categories/              # Adiciona Category; tournamentMode; categoryId em Player/Match/Registration
    └── 20260427_schedule/               # Adiciona slotMinutes e scheduleDays ao Tournament; startedAt ao Match

scripts/
├── setup-db.mjs                          # Cria/actualiza DB e aplica migrations (idempotente)
├── db-reset.mjs                          # Apaga e recria DB + seed
└── seed-demo.ts                          # 8 torneios de demonstração em todos os formatos e estados

public/
└── sw.js                                 # Service worker PWA
```

---

## Schema da base de dados

```prisma
model Tournament {
  slug             String     @unique
  adminToken       String     @unique
  format           String     // single_elimination | double_elimination | round_robin
                              // | groups_knockout | fpp_auto
  tournamentMode   String     @default("manual")  // manual | fpp_auto
  matchFormat      String     @default("M3SPO")   // código FPP ou FFT (ver tabela de formatos)
  starPoint        Boolean    @default(false)      // Star Point FIP 2026 (ponto de ouro a 40-40)
  status           String     @default("draft")   // draft | in_progress | completed
  thirdPlace       Boolean    @default(false)
  groupCount       Int?       // retrocompatibilidade (single-category)
  advanceCount     Int?
  isPublic         Boolean    @default(false)
  registrationOpen Boolean    @default(false)
  courtCount       Int?
  slotMinutes      Int?       // minutos por slot (definido pelo auto-agendamento)
  scheduleDays     String?    // JSON: [{date,startTime,endTime}[]] (janelas de agenda)
  categories       Category[]
}

model Category {
  id           String    // código único por torneio (ex: M3, F4, OPEN)
  tournamentId String
  code         String    // código de exibição
  name         String    // nome completo
  matchFormat  String?   // override de formato (null = herda do torneio)
  starPoint    Boolean   @default(false)
  format       String?   // sistema de bracket (preenchido ao gerar)
  groupCount   Int?
  advanceCount Int?
  status       String    @default("draft")  // draft | in_progress | completed
  order        Int       @default(0)
  players      Player[]
  matches      Match[]
}

model Player {              // representa uma dupla
  name         String      // nome de exibição: teamName ou "J1 / J2"
  player1Name  String
  player2Name  String
  seed         Int?
  checkedIn    Boolean     @default(true)
  groupIndex   Int?
  categoryId   String?     // null → série OPEN (retrocompatibilidade)
}

model Match {
  round            Int
  position         Int
  bracketType      String    // winners | losers | final | group | third_place
  groupIndex       Int?
  team1Id          String?
  team2Id          String?
  winnerId         String?
  scores           String?   // JSON: SetScore[]
  scheduledAt      DateTime?
  court            String?
  startedAt        DateTime? // preenchido ao clicar "Iniciar jogo"; usado pelo delay-push
  status           String    // pending | in_progress | completed | bye
  nextMatchId      String?
  loserNextMatchId String?
  categoryId       String?
}

model Registration {
  tournamentId String
  player1Name  String
  player2Name  String
  teamName     String?
  contact      String?
  status       String  @default("pending") // pending | approved | rejected
  categoryId   String?
}
```

---

## Dados de demonstração

Após `npm run db:reset`:

| Torneio | URL pública | Token admin | Estado |
|---------|------------|-------------|--------|
| Rascunho Multi-série | `/tournament/demo-rascunho-multi` | `admin-rascunho-multi` | Draft, inscrições abertas |
| FPP Auto em curso | `/tournament/demo-fpp-auto` | `admin-fpp-auto` | Em curso, 2 séries (M3+F3) |
| SE Concluído | `/tournament/demo-eliminacao-concluido` | `admin-concluido` | Concluído, com vencedor e 3.º lugar |
| Round Robin | `/tournament/demo-roundrobin` | `admin-roundrobin` | Em curso, 3 de 5 rondas |
| Grupos + KO | `/tournament/demo-grupos` | `admin-grupos` | Em curso, grupos A+B feitos, C parcial |
| Dupla Eliminação | `/tournament/demo-dupla` | `admin-dupla` | Em curso, WR1+LR1 feitos |
| Grupos + KO Concluído | `/tournament/demo-grupos-completo` | `admin-grupos-completo` | Concluído, todos os grupos + SF+Final |
| Agenda Live | `/tournament/demo-agenda-live` | `admin-agenda-live` | Em curso, QF em jogo (startedAt) |

Painel global: `/admin?token=padel-admin-2025`

---

## Notas de implementação

**Delay-push de agenda**: quando um jogo tem `startedAt` registado e demora mais do que `slotMinutes` do torneio, o servidor calcula o atraso em milissegundos ao receber o resultado. Os jogos seguintes no mesmo campo com `scheduledAt > match.scheduledAt` são empurrados pelo mesmo valor de atraso. Se o novo horário ultrapassar o fim da janela diária (`scheduleDays`), o jogo é desagendado (campo e hora removidos) — nunca se agenda além do fim do dia.

**Reset de resultado**: o modal `ScoreInputModal` permite repor o resultado de um jogo concluído com confirmação explícita. A API bloqueia o reset se o jogo seguinte no bracket já tiver resultado (para jogos de knockout e grupo). Para grupos, o reset é adicionalmente bloqueado se já existirem resultados no bracket de knockout.

**Quirk do Prisma + better-sqlite3**: `prisma migrate deploy` não funciona com o adapter better-sqlite3. Para SQLite, o script `db:setup` aplica as migrations directamente via `better-sqlite3` e regista-as em `_prisma_migrations` manualmente. Para MySQL, usa `prisma migrate deploy` normalmente. O script é idempotente: salta migrações já aplicadas e tolera erros de "duplicate column name" / "table already exists" (regista a migração como aplicada).

**Adicionar uma nova migration:**
| | SQLite | MySQL |
|---|---|---|
| Ficheiro SQL | `prisma/migrations-sqlite/<nome>/migration.sql` | `prisma/migrations/<nome>/migration.sql` |
| Schema | Actualizar `prisma/schema.prisma` | Idem |
| Setup script | Adicionar ao array `migrations` em `scripts/setup-db.mjs` | N/A |
| Gerar client | `npm run db:setup` | Idem |

**Formatos de jogo (scoring)**: `src/lib/scoring.ts` é a fonte de verdade para toda a lógica de validação e determinação de vencedor. Os formatos FPP (PRO, PROPO, M3S, M3SPO, M3, M3PO) são aliases dos FFT equivalentes — `getFormatStructure` delega para o formato FFT correspondente. A detecção do Super Tie-Break é feita por `structure[i].type === "superTiebreak"`, nunca por nome de formato.

**Standings (classificação de grupos)**: `computeGroupStandings` em `src/lib/standings.ts` é a única fonte de verdade — usada pela tabela visual (`RoundRobinTable`) e pelo servidor ao avançar jogadores para o knockout. Critérios: vitórias → saldo sets → saldo jogos → h2h wins → saldo jogos h2h. Inclui contador `played` para a coluna J.

**Formato FPP automático (`fpp_auto`)**: o formato é apenas uma etiqueta guardada no torneio. O sistema de grupos (1, 2 ou 3 grupos, ou eliminação directa) é determinado em `src/lib/fpp-bracket.ts → getFPPConfig(playerCount)` **no momento de gerar o bracket**, quando o número de duplas confirmadas é conhecido. O seeding cross-grupo (`fppKnockoutOrder`) garante que nenhum par do mesmo grupo se cruza na primeira ronda do knockout.

**Modo FPP Automático (`tournamentMode = "fpp_auto"`)**: distinto do campo `format`. Quando `tournamentMode` é `"fpp_auto"`, a geração do bracket usa `getFppFormatForCategory(n)` (`src/lib/fpp-format.ts`) para determinar simultaneamente o **matchFormat** (ex: M3SPO, PROPO) e o **sistema de bracket** (round_robin, groups_knockout, single_elimination) com base na tabela FPP. Esta função é diferente de `getFPPConfig` que apenas determina o sistema de bracket para o campo `format = "fpp_auto"` (modo legado).

**Geração do bracket de Grupos+Knockout**: quando o último jogo de grupo é registado, o servidor computa automaticamente as classificações e gera o bracket de eliminação dentro da mesma transacção Prisma. Para `fpp_auto` usa `fppKnockoutOrder`; para `groups_knockout` manual usa o seeding legacy.

**Séries/Categorias**: cada série tem os seus próprios `Player[]` e `Match[]`. A geração do bracket aceita `categoryId` no body e actua apenas sobre essa série. O `category.status` transita para `in_progress` ao gerar e para `completed` quando todos os jogos da série terminam. O `tournament.status` só passa a `completed` quando todas as séries estão concluídas. Torneios existentes sem séries têm uma categoria `OPEN` criada pela migração `20260427_categories` — todo o código legado continua a funcionar sem alterações.

**Clone com séries**: o clone remapeia os `categoryId` de todos os jogadores para os IDs das novas categorias clonadas, usando um mapa `oldId → newId` construído durante a transacção.

**SSR e localStorage**: componentes que dependem de `localStorage` usam um estado `ready` inicializado a `false` para evitar hydration mismatch.

**Separação admin/público**: a presença do query param `?token=<adminToken>` na URL é o único critério que activa os controlos de edição. Sem token, a página é completamente read-only.

**Modelo de dados "dupla"**: o modelo `Player` representa uma dupla de padel. Os campos `player1Name` e `player2Name` guardam os nomes individuais; `name` é o nome de exibição. Todo o código interno usa `Player`/`team` por razões históricas do ORM mas a terminologia visível ao utilizador é "dupla".
