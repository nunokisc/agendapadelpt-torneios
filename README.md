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

### Formatos de torneio
- **Eliminação simples** — bracket com ou sem jogo do 3.º lugar
- **Eliminação dupla** — winners + losers bracket com grand final
- **Round Robin** — todos contra todos com tabela de classificação
- **Grupos + Knockout** — fase de grupos seguida de eliminação simples

### Formatos de jogo
| Código | Descrição |
|--------|-----------|
| A1 / A2 | Melhor de 3 sets (6 jogos, tie-break ou normal) |
| B1 / B2 | 2 sets + Super Tie-Break (formato padel padrão) |
| C1 / C2 | 2 sets curtos (4 jogos) + Super Tie-Break |
| D1 / D2 | Set único de 9 jogos |
| E | Super Tie-Break isolado (primeiro a 10 com 2 de vantagem) |
| F | Set de 4 jogos sem vantagem, tie-break a 3-3 |

### Gestão de duplas
- Cada dupla tem **Jogador 1** e **Jogador 2** (obrigatórios) e nome de dupla opcional
- Drag & drop para definir seeds; shuffle aleatório
- **Importação em massa** — cola uma lista no formato `João / Maria` (um por linha) ou nomes alternados; preview em tempo real do número de duplas detectadas
- **Check-in** — o admin marca presença por dupla antes de gerar o bracket; botões "✓ Todas" / "✗ Nenhuma" para confirmação rápida; só as duplas confirmadas entram no bracket
- **Vista pública vs admin**: sem token na URL todas as opções de edição estão ocultas; com `?token=<adminToken>` acesso total

### Resultados e scores
- Modal de introdução de resultados com botões +/− por set (optimizado para mobile)
- Detecção automática de vencedor de set e de jogo
- Suporte a tie-breaks e Super Tie-Break com campos dedicados
- Avanço automático no bracket após cada resultado

### Gestão de torneios (admin)
- **Editar** — nome, descrição, número de campos, torneio público, inscrições abertas
- **Eliminar** — apaga torneio e todos os dados associados
- **Clonar** — cria novo rascunho com as mesmas duplas e configurações
- Separador **Agenda** — definir campo e hora por jogo ou agendar automaticamente todos os jogos distribuídos pelos campos disponíveis
- Botão **WhatsApp** por jogo agendado — abre o WhatsApp com mensagem pré-formatada (nomes das duplas, data/hora, campo, nome do torneio) para partilhar num grupo
- Separador **Inscrições** — aprovar ou rejeitar inscrições pendentes de duplas

### Auto-inscrição pública
- Página pública `/tournament/[slug]/register` para duplas se inscreverem
- Formulário: Jogador 1, Jogador 2, nome de dupla (opcional), contacto (opcional)
- Inscrições ficam pendentes até o admin aprovar (cria dupla) ou rejeitar
- Activado por `registrationOpen` no torneio

### Agenda e campos
- `courtCount` no torneio define o número de campos disponíveis
- Auto-agendamento: distribui jogos por ronda pelos campos com duração configurável
- Cada jogo pode ter campo e hora definidos individualmente

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

- **SQLite** → aplica os ficheiros SQL em `prisma/migrations-sqlite/` directamente via `better-sqlite3` (idempotente — salta migrações já aplicadas)
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
npm run db:setup    # configura DB (detecta SQLite/MySQL, aplica migrações, gera Prisma client)
npm run db:seed     # insere os 6 torneios de demonstração
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
│   │       ├── route.ts                  # POST /api/tournament (criar)
│   │       └── [slug]/
│   │           ├── route.ts              # GET / PATCH / DELETE torneio
│   │           ├── generate/route.ts     # POST gerar bracket (filtra checkedIn)
│   │           ├── players/route.ts      # POST/PUT/PATCH/DELETE duplas
│   │           ├── match/[matchId]/      # PUT introduzir resultado
│   │           ├── clone/route.ts        # POST clonar torneio
│   │           ├── register/route.ts     # GET/POST/PATCH inscrições
│   │           ├── schedule/route.ts     # PATCH/POST agenda de jogos
│   │           ├── export/route.ts       # GET exportar CSV / iCal
│   │           └── stream/route.ts       # GET SSE para live updates
│   └── tournament/[slug]/
│       ├── page.tsx                      # Vista principal (tabs + bottom nav mobile)
│       ├── bracket/page.tsx              # Ecrã completo + imprimir
│       ├── minha-dupla/page.tsx          # "Os meus jogos" — pesquisa por nome
│       ├── stats/page.tsx                # Estatísticas por dupla
│       └── register/page.tsx             # Inscrição pública de dupla
├── components/
│   ├── bracket/
│   │   ├── MatchCard.tsx                 # Cartão de jogo (destaque vencedor)
│   │   ├── SingleEliminationBracket.tsx  # Vista desktop + tabs mobile por ronda
│   │   ├── DoubleEliminationBracket.tsx  # Winners/Losers/Final com tabs mobile
│   │   ├── RoundRobinTable.tsx           # Tabela de classificação + jogos por ronda
│   │   ├── GroupStageView.tsx            # Grupos com tabs mobile
│   │   └── BracketConnector.tsx          # Linhas SVG entre jogos
│   ├── tournament/
│   │   ├── CreateTournamentForm.tsx
│   │   ├── PlayerList.tsx                # Duplas: drag & drop, bulk import, check-in
│   │   ├── MyTournaments.tsx             # Painel localStorage
│   │   ├── ScoreInputModal.tsx           # Introdução de resultados com +/− buttons
│   │   ├── TournamentHeader.tsx          # Editar / Eliminar / Clonar
│   │   ├── LinkShare.tsx                 # Partilhar link + QR code
│   │   ├── ScheduleManager.tsx           # Agenda de jogos + WhatsApp notification
│   │   └── RegistrationPanel.tsx         # Aprovar/rejeitar inscrições
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── TournamentBottomNav.tsx        # Bottom nav fixo em mobile
│       └── PwaRegister.tsx               # Registo do service worker
├── lib/
│   ├── bracket-engine.ts                 # generateSingleElimination, etc.
│   ├── scoring.ts                        # determineSetWinner, validateScores
│   ├── standings.ts                      # computeGroupStandings (com h2h tiebreaker)
│   ├── bulk-import.ts                    # parseBulkText — parser de importação em massa
│   ├── my-tournaments.ts                 # localStorage helpers
│   ├── validators.ts                     # Zod schemas
│   └── db.ts / slug.ts / utils.ts / seeding.ts / round-robin.ts
├── __tests__/
│   ├── scoring.test.ts                   # 70+ testes de scoring por formato
│   ├── bracket-engine.test.ts            # Testes de geração de brackets
│   ├── standings.test.ts                 # Testes de classificação com h2h
│   └── bulk-import.test.ts              # Testes do parser de importação em massa
└── types/index.ts                        # Tournament, Player, Match, Registration, etc.

prisma/
├── schema.prisma                         # patchado pelo db:setup (provider varia)
├── migrations/                           # migrações MySQL/MariaDB
│   └── 20260424000000_init_mysql/
└── migrations-sqlite/                    # migrações SQLite (aplicadas pelo setup-db.mjs)
    ├── 20260423195815_init/
    ├── 20260423_scoring/
    ├── 20260424_doubles/
    ├── 20260424_features/
    └── 20260425_checkin/

scripts/
├── setup-db.mjs                          # Cria/actualiza DB e aplica migrations (idempotente)
├── db-reset.mjs                          # Apaga e recria DB + seed
└── seed-demo.ts                          # 6 torneios de demonstração em todos os formatos

public/
└── sw.js                                 # Service worker PWA
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
  checkedIn    Boolean     @default(true)   // check-in de presença; só entra no bracket se true
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
| Ficheiro SQL | `prisma/migrations-sqlite/<nome>/migration.sql` | `prisma/migrations/<nome>/migration.sql` |
| Schema | Actualizar `prisma/schema.prisma` | Idem |
| Setup script | Adicionar ao array `migrations` em `scripts/setup-db.mjs` | N/A |
| Gerar client | `npm run db:setup` | Idem |

**Standings (classificação de grupos)**: a função `computeGroupStandings` em `src/lib/standings.ts` é a única fonte de verdade — usada tanto pela tabela visual (`RoundRobinTable`) como pelo servidor quando avança jogadores dos grupos para o knockout. Os critérios de desempate são: vitórias → diferença de sets → diferença de jogos → confronto directo.

**Geração do bracket de Grupos+Knockout**: quando o último jogo de grupo é registado, o servidor computa automaticamente as classificações e gera o bracket de eliminação, dentro da mesma transacção Prisma.

**SSR e localStorage**: componentes que dependem de `localStorage` usam um estado `ready` inicializado a `false` para evitar hydration mismatch.

**Separação admin/público**: a presença do query param `?token=<adminToken>` na URL é o único critério que activa os controlos de edição. Sem token, a página é completamente read-only.

**Modelo de dados "dupla"**: o modelo `Player` representa uma dupla de padel. Os campos `player1Name` e `player2Name` guardam os nomes individuais; `name` é o nome de exibição. Todo o código interno usa `Player`/`team` por razões históricas do ORM mas a terminologia visível ao utilizador é "dupla".
