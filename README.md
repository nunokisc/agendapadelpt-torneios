# Torneios de Padel

Plataforma web para criação e gestão de torneios de padel (duplas). Suporta múltiplos formatos de torneio, introdução de resultados em tempo real e vista pública partilhável.

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

### Formatos de torneio
- **Eliminação simples** — bracket com ou sem jogo do 3.º lugar
- **Eliminação dupla** — winners + losers bracket com grand final
- **Round Robin** — todos contra todos com tabela de classificação
- **Grupos + Knockout** — fase de grupos seguida de eliminação simples

### Formatos de jogo (match formats)
| Código | Descrição |
|--------|-----------|
| A1 / A2 | Melhor de 3 sets (6 jogos, tie-break ou normal) |
| B1 / B2 | 2 sets + Super Tie-Break (formato padel padrão) |
| C1 / C2 | 2 sets curtos (4 jogos) + Super Tie-Break |
| D1 / D2 | Set único de 9 jogos |
| E | Super Tie-Break isolado (primeiro a 10 com 2 de vantagem) |
| F | Set de 4 jogos sem vantagem, tie-break a 3-3 |

### Gestão de duplas
- Cada dupla tem **Jogador 1** e **Jogador 2** (obrigatórios)
- Nome de dupla opcional (ex: "Cardoso / Silva"); se omitido, gera-se automaticamente "J1 / J2"
- Drag & drop para definir seeds; shuffle aleatório
- **Vista pública vs admin**: sem token na URL, todas as opções de edição estão ocultas. Com `?token=<adminToken>` o utilizador tem acesso total

### Resultados e scores
- Modal de introdução de resultados com validação em tempo real
- Detecção automática de vencedor de set e de jogo
- Suporte a tie-breaks e Super Tie-Break com campos dedicados
- Avanço automático no bracket após cada resultado

### Gestão de torneios (admin)
- **Editar** — nome, descrição, número de campos, torneio público, inscrições abertas
- **Eliminar** — apaga torneio e todos os dados associados
- **Clonar** — cria novo rascunho com as mesmas duplas e configurações
- Separador **Agenda** — definir court e hora por jogo, ou agendar automaticamente todos os jogos distribuídos pelos campos disponíveis
- Separador **Inscrições** — aprovar ou rejeitar inscrições pendentes de duplas

### Auto-inscrição pública
- Página pública `/tournament/[slug]/register` para duplas se inscreverem
- Formulário: Jogador 1, Jogador 2, nome de dupla (opcional), contacto (opcional)
- Inscrições ficam pendentes até o admin aprovar (cria dupla) ou rejeitar
- Activado por `registrationOpen` no torneio

### Agenda e campos
- Campo `courtCount` no torneio define o número de campos disponíveis
- Auto-agendamento: distribui jogos por ronda pelos campos com duração configurável por jogo
- Cada jogo pode ter court e hora definidos individualmente

### Estatísticas
- Página `/tournament/[slug]/stats` com classificação de todas as duplas
- Colunas: jogos disputados, vitórias, derrotas, % vitórias, sets+/-, games+/-
- Cards de sumário: total de duplas, jogos realizados, jogos totais, formato

### Diretório público
- `/torneios` lista todos os torneios marcados como públicos
- Pesquisa por nome/descrição, badge de inscrições abertas

### UX
- Dark mode com toggle (persiste em `localStorage`, sem flash ao carregar)
- Toast notifications para feedback de acções
- Loading skeletons durante carregamento
- Vista de bracket em ecrã completo (`/tournament/[slug]/bracket`)
  - Botão **Imprimir** com CSS de impressão (oculta nav, mostra cabeçalho limpo)
  - **Vista mobile**: tabs por ronda para navegar jogo a jogo; bracket visual completo em desktop
- Destaque do caminho vencedor no bracket
- Auto-refresh da vista pública a cada 30 segundos
- QR code da ligação pública em `LinkShare` (gerado localmente, download PNG)

### "Os meus torneios"
- Torneios criados no browser ficam guardados em `localStorage`
- Painel na homepage com links de vista pública e admin para cada torneio
- Botão de remover da lista local (não apaga o torneio)

### Painel de administração global
- `/admin` — lista todos os torneios da plataforma
- Protegido por `PLATFORM_ADMIN_TOKEN` (variável de ambiente)
- Estatísticas por estado, pesquisa por nome/slug

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

- **SQLite** → aplica os ficheiros SQL em `prisma/migrations-sqlite/` directamente via `better-sqlite3`
- **MySQL/MariaDB** → corre `prisma migrate deploy` com a migração em `prisma/migrations/`

## Variáveis de ambiente

Criar `.env` na raiz do projecto:

```env
# Escolhe UMA das opções:
DATABASE_URL="file:./dev.db"                                        # SQLite
# DATABASE_URL="mysql://user:password@localhost:3306/padel_torneios" # MySQL
# DATABASE_URL="mariadb://user:password@localhost:3306/padel_torneios" # MariaDB

PLATFORM_ADMIN_TOKEN=padel-admin-2025
```

## Comandos

```bash
# Desenvolvimento
npm run dev

# Base de dados
npm run db:setup    # configura DB (detecta SQLite/MySQL pelo DATABASE_URL)
npm run db:seed     # insere os 6 torneios de demonstração
npm run db:reset    # apaga e recria a DB com seed (SQLite: apaga ficheiro; MySQL: migrate reset)

# Testes
npm run test              # corre todos os testes (vitest)
npm run test:watch        # modo watch
npm run test:coverage     # cobertura

# Lint
npm run lint
```

## Estrutura do projecto

```
src/
├── app/
│   ├── page.tsx                          # Homepage (criar torneio + Os meus torneios)
│   ├── admin/page.tsx                    # Painel de administração global
│   ├── torneios/page.tsx                 # Diretório público de torneios
│   ├── api/
│   │   ├── admin/route.ts                # GET /api/admin (token plataforma)
│   │   ├── tournaments/route.ts          # GET /api/tournaments (públicos)
│   │   └── tournament/
│   │       ├── route.ts                  # POST /api/tournament (criar)
│   │       └── [slug]/
│   │           ├── route.ts              # GET / PATCH / DELETE torneio
│   │           ├── generate/route.ts     # POST gerar bracket
│   │           ├── players/route.ts      # POST/PUT/DELETE duplas
│   │           ├── match/[matchId]/      # PUT introduzir resultado
│   │           ├── clone/route.ts        # POST clonar torneio
│   │           ├── register/route.ts     # GET/POST/PATCH inscrições
│   │           └── schedule/route.ts     # PATCH/POST agenda de jogos
│   └── tournament/[slug]/
│       ├── page.tsx                      # Vista principal (tabs: Bracket / Agenda / Inscrições)
│       ├── bracket/page.tsx              # Ecrã completo + imprimir
│       ├── stats/page.tsx                # Estatísticas por dupla
│       └── register/page.tsx             # Inscrição pública de dupla
├── components/
│   ├── bracket/
│   │   ├── MatchCard.tsx                 # Cartão de jogo (destaque vencedor)
│   │   ├── SingleEliminationBracket.tsx  # Vista desktop + tabs mobile por ronda
│   │   ├── DoubleEliminationBracket.tsx
│   │   ├── RoundRobinTable.tsx
│   │   ├── GroupStageView.tsx
│   │   └── BracketConnector.tsx
│   ├── tournament/
│   │   ├── CreateTournamentForm.tsx
│   │   ├── PlayerList.tsx                # Formulário de duplas com drag & drop
│   │   ├── MyTournaments.tsx             # Painel localStorage
│   │   ├── ScoreInputModal.tsx
│   │   ├── TournamentHeader.tsx          # Editar / Eliminar / Clonar
│   │   ├── LinkShare.tsx                 # Partilhar link + QR code
│   │   ├── ScheduleManager.tsx           # Agenda de jogos por campo/hora
│   │   └── RegistrationPanel.tsx         # Aprovar/rejeitar inscrições
│   └── ui/
│       ├── ToastProvider.tsx             # Context + hook useToast()
│       ├── ThemeToggle.tsx               # Dark/light mode
│       ├── Skeleton.tsx                  # Loading skeletons
│       └── Modal.tsx / Button.tsx / Card.tsx / Badge.tsx / Input.tsx / Select.tsx
├── lib/
│   ├── bracket-engine.ts                 # generateSingleElimination, generateRoundRobin, etc.
│   ├── scoring.ts                        # determineSetWinner, determineMatchWinner, validateScores
│   ├── standings.ts                      # computeGroupStandings (servidor)
│   ├── my-tournaments.ts                 # localStorage helpers
│   ├── validators.ts                     # Zod schemas
│   └── db.ts / slug.ts / utils.ts / seeding.ts / round-robin.ts
├── __tests__/
│   ├── scoring.test.ts                   # Testes de scoring
│   ├── bracket-engine.test.ts            # Testes de geração de brackets
│   └── standings.test.ts                 # Testes de classificação
└── types/index.ts                        # Tournament, Player, Match, Registration, etc.

prisma/
├── schema.prisma                         # patchado pelo db:setup (provider varia)
├── migrations/                           # migrações MySQL/MariaDB (usadas por prisma migrate deploy)
│   └── 20260424000000_init_mysql/
└── migrations-sqlite/                    # migrações SQLite (aplicadas pelo setup-db.mjs)
    ├── 20260423195815_init/
    ├── 20260423_scoring/
    ├── 20260424_doubles/
    └── 20260424_features/

scripts/
├── setup-db.mjs                          # Cria DB e aplica migrations via SQLite directo
└── seed-demo.ts                          # 6 torneios de demonstração em todos os formatos
```

## Schema da base de dados

```prisma
model Tournament {
  slug             String   @unique
  adminToken       String   @unique
  format           String   // single_elimination | double_elimination | round_robin | groups_knockout
  matchFormat      String   @default("B1")
  status           String   @default("draft") // draft | in_progress | completed
  thirdPlace       Boolean  @default(false)
  groupCount       Int?
  advanceCount     Int?
  isPublic         Boolean  @default(false)
  registrationOpen Boolean  @default(false)
  courtCount       Int?
}

model Player {              // representa uma dupla
  name         String      // nome de exibição: teamName ou "J1 / J2"
  player1Name  String      // nome do primeiro jogador
  player2Name  String      // nome do segundo jogador
  seed         Int?
  groupIndex   Int?
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
  status           String    // pending | in_progress | completed | bye
  nextMatchId      String?
  loserNextMatchId String?
}

model Registration {
  tournamentId String
  player1Name  String
  player2Name  String
  teamName     String?
  contact      String?
  status       String  @default("pending") // pending | approved | rejected
}
```

## Dados de demonstração

Após `npm run db:reset`:

| Torneio | URL pública | Token admin |
|---------|------------|-------------|
| Rascunho (SE) | `/tournament/demo-rascunho` | `admin-rascunho` |
| SE em curso | `/tournament/demo-eliminacao` | `admin-eliminacao` |
| SE concluído | `/tournament/demo-eliminacao-concluido` | `admin-concluido` |
| Round Robin | `/tournament/demo-roundrobin` | `admin-roundrobin` |
| Grupos + KO | `/tournament/demo-grupos` | `admin-grupos` |
| Dupla Eliminação | `/tournament/demo-dupla` | `admin-dupla` |

Painel global: `/admin?token=padel-admin-2025`

## Notas de implementação

**Quirk do Prisma + better-sqlite3**: `prisma migrate deploy` não funciona com o adapter better-sqlite3. Para SQLite, o script `db:setup` aplica as migrations directamente via `better-sqlite3` e regista-as em `_prisma_migrations` manualmente. Para MySQL, usa `prisma migrate deploy` normalmente.

**Adicionar uma nova migration:**
| | SQLite | MySQL |
|---|---|---|
| Ficheiro SQL | `prisma/migrations-sqlite/<nome>/migration.sql` (sintaxe SQLite) | `prisma/migrations/<nome>/migration.sql` (sintaxe MySQL) |
| Schema | Actualizar `prisma/schema.prisma` | Idem |
| Setup script | Adicionar ao array `migrations` em `scripts/setup-db.mjs` | N/A — `prisma migrate deploy` detecta automaticamente |
| Gerar client | `npm run db:setup` (inclui `prisma generate`) | Idem |

**Geração do bracket de Grupos+Knockout**: quando o último jogo de grupo é registado, o servidor computa automaticamente as classificações e gera o bracket de eliminação, dentro da mesma transacção Prisma.

**SSR e localStorage**: componentes que dependem de `localStorage` (ex: `MyTournaments`, `ThemeToggle`) usam um estado `ready` inicializado a `false` para evitar hydration mismatch — renderizam `null` no servidor e o conteúdo real após o primeiro `useEffect`.

**Separação admin/público**: a presença do query param `?token=<adminToken>` na URL é o único critério que activa os controlos de edição. Sem token, a página é completamente read-only — os componentes recebem `isAdmin={false}` e escondem formulários, botões e o modal de scores.

**Modelo de dados "dupla"**: o modelo `Player` representa uma dupla de padel. Os campos `player1Name` e `player2Name` guardam os nomes individuais; `name` é o nome de exibição (nome da dupla ou "J1 / J2" gerado automaticamente). Todo o código interno usa `Player`/`team` por razões históricas do ORM mas a terminologia visível ao utilizador é "dupla".
