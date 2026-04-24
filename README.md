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

### Gestão de equipas (duplas)
- Cada equipa tem **Jogador 1** e **Jogador 2** (obrigatórios)
- Nome de equipa opcional (ex: "Cardoso / Silva"); se omitido, gera-se automaticamente "J1 / J2"
- Drag & drop para definir seeds; shuffle aleatório
- **Vista pública vs admin**: sem token na URL, todas as opções de edição estão ocultas (adicionar/remover equipas, introduzir resultados, gerar bracket). Com `?token=<adminToken>` o utilizador tem acesso total

### Resultados e scores
- Modal de introdução de resultados com validação em tempo real
- Detecção automática de vencedor de set e de jogo
- Suporte a tie-breaks e Super Tie-Break com campos dedicados
- Avanço automático no bracket após cada resultado

### UX
- Dark mode com toggle (persiste em `localStorage`, sem flash ao carregar)
- Toast notifications para feedback de acções
- Loading skeletons durante carregamento
- Vista de bracket em ecrã completo (`/tournament/[slug]/bracket`)
- Destaque do caminho vencedor no bracket
- Auto-refresh da vista pública a cada 30 segundos

### "Os meus torneios"
- Torneios criados no browser ficam guardados em `localStorage`
- Painel na homepage com links de vista pública e admin para cada torneio
- Botão de remover da lista local (não apaga o torneio)

### Painel de administração global
- `/admin` — lista todos os torneios da plataforma
- Protegido por `PLATFORM_ADMIN_TOKEN` (variável de ambiente)
- Estatísticas por estado, pesquisa por nome/slug

## Variáveis de ambiente

Criar `.env` na raiz do projecto:

```env
DATABASE_URL="file:./dev.db"
PLATFORM_ADMIN_TOKEN=padel-admin-2025
```

## Comandos

```bash
# Desenvolvimento
npm run dev

# Base de dados — primeira configuração
npx prisma generate       # gera o Prisma client (obrigatório após instalar ou alterar schema.prisma)
npm run db:setup          # cria dev.db e aplica todas as migrations via SQLite directo
npm run db:seed           # insere os 6 torneios de demonstração

# Reset completo (apaga DB e recria com seed — uso frequente em dev)
npm run db:reset

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
│   ├── api/
│   │   ├── admin/route.ts                # GET /api/admin (token plataforma)
│   │   └── tournament/
│   │       ├── route.ts                  # POST /api/tournament (criar)
│   │       └── [slug]/
│   │           ├── route.ts              # GET /api/tournament/[slug]
│   │           ├── generate/route.ts     # POST gerar bracket
│   │           ├── players/route.ts      # POST/PUT/DELETE equipas
│   │           └── match/[matchId]/      # PUT introduzir resultado
│   └── tournament/[slug]/
│       ├── page.tsx                      # Vista principal do torneio
│       └── bracket/page.tsx              # Ecrã completo do bracket
├── components/
│   ├── bracket/
│   │   ├── MatchCard.tsx                 # Cartão de jogo (destaque vencedor)
│   │   ├── SingleEliminationBracket.tsx  # Com winner path highlighting
│   │   ├── DoubleEliminationBracket.tsx
│   │   ├── RoundRobinTable.tsx
│   │   ├── GroupStageView.tsx
│   │   └── BracketConnector.tsx
│   ├── tournament/
│   │   ├── CreateTournamentForm.tsx
│   │   ├── PlayerList.tsx                # Formulário de equipas (duplas)
│   │   ├── MyTournaments.tsx             # Painel localStorage
│   │   ├── ScoreInputModal.tsx
│   │   ├── TournamentHeader.tsx
│   │   └── LinkShare.tsx
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
│   ├── scoring.test.ts                   # 60+ testes de scoring
│   ├── bracket-engine.test.ts            # 49 testes de geração de brackets
│   └── standings.test.ts                 # Testes de classificação
└── types/index.ts                        # Tournament, Player, Match, etc.

prisma/
├── schema.prisma
└── migrations/
    ├── 20260423195815_init/              # Schema inicial
    ├── 20260423_scoring/                 # matchFormat (substitui setsToWin)
    └── 20260424_doubles/                 # player1Name + player2Name

scripts/
├── setup-db.mjs                          # Cria DB e aplica migrations via SQLite directo
└── seed-demo.ts                          # 6 torneios de demonstração em todos os formatos
```

## Schema da base de dados

```prisma
model Tournament {
  slug         String  @unique
  adminToken   String  @unique
  format       String  // single_elimination | double_elimination | round_robin | groups_knockout
  matchFormat  String  @default("B1")
  status       String  @default("draft") // draft | in_progress | completed
  thirdPlace   Boolean @default(false)
  groupCount   Int?
  advanceCount Int?
}

model Player {              // representa uma equipa de duplas
  name         String      // nome de exibição: teamName ou "J1 / J2"
  player1Name  String      // nome do primeiro jogador
  player2Name  String      // nome do segundo jogador
  seed         Int?
  groupIndex   Int?
}

model Match {
  round            Int
  position         Int
  bracketType      String  // winners | losers | final | group | third_place
  groupIndex       Int?
  team1Id          String?
  team2Id          String?
  winnerId         String?
  scores           String? // JSON: SetScore[]
  status           String  // pending | in_progress | completed | bye
  nextMatchId      String?
  loserNextMatchId String?
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

**Quirk do Prisma + better-sqlite3**: `prisma migrate deploy` não funciona correctamente neste setup. O script `db:setup` aplica as migrations directamente via SQL e regista-as em `_prisma_migrations` manualmente. Ao adicionar uma nova migration:
1. Criar o ficheiro SQL em `prisma/migrations/<nome>/migration.sql`
2. Actualizar `prisma/schema.prisma`
3. Adicionar a migration ao array `migrations` em `scripts/setup-db.mjs`
4. Correr `npx prisma generate` para regenerar o cliente
5. Correr `npm run db:reset` para aplicar

**Geração do bracket de Grupos+Knockout**: quando o último jogo de grupo é registado, o servidor computa automaticamente as classificações e gera o bracket de eliminação, dentro da mesma transacção Prisma.

**SSR e localStorage**: componentes que dependem de `localStorage` (ex: `MyTournaments`, `ThemeToggle`) usam um estado `ready` inicializado a `false` para evitar hydration mismatch — renderizam `null` no servidor e o conteúdo real após o primeiro `useEffect`.

**Separação admin/público**: a presença do query param `?token=<adminToken>` na URL é o único critério que activa os controlos de edição. Sem token, a página é completamente read-only — os componentes recebem `isAdmin={false}` e escondem formulários, botões e o modal de scores.
