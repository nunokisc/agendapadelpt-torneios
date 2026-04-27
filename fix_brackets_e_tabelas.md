# Planeamento: Aplicação de Torneios de Padel

## Visão do Produto

Aplicação web para criar e gerir torneios de padel com brackets visuais, gestão de jogos e resultados. Inspirada no Challonge/Racketid/PadelTeams mas focada em simplicidade e funcionalidade total.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + SQLite (via Prisma)
**Deploy target:** Vercel (frontend) + SQLite local ou Turso (SQLite edge)

---

## Arquitectura Técnica

### Stack Detalhado

| Camada | Tecnologia | Justificação |
|--------|-----------|--------------|
| Framework | Next.js 14 (App Router) | SSR, API routes integradas, deploy fácil |
| Linguagem | TypeScript | Type safety, melhor DX |
| Styling | Tailwind CSS | Rapidez, responsive nativo |
| Base de Dados | SQLite via Prisma | Zero config, ficheiro único, ideal para MVP |
| Auth | Nenhuma (v1) | Simplicidade — qualquer pessoa cria torneios via link único |
| State | React Context + useState | Sem necessidade de Redux para esta complexidade |
| Visualização brackets | Canvas/SVG custom com React | Controlo total sobre o desenho dos brackets |

### Estrutura de Pastas

```
padel-tournaments/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Layout global
│   │   ├── page.tsx                      # Homepage — criar torneio
│   │   ├── tournament/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx              # Vista principal do torneio
│   │   │       ├── admin/
│   │   │       │   └── page.tsx          # Painel admin (editar resultados, gerir)
│   │   │       └── bracket/
│   │   │           └── page.tsx          # Vista fullscreen do bracket
│   │   └── api/
│   │       └── tournament/
│   │           ├── route.ts              # POST criar torneio
│   │           ├── [slug]/
│   │           │   ├── route.ts          # GET torneio, PUT actualizar
│   │           │   ├── players/
│   │           │   │   └── route.ts      # POST/DELETE jogadores
│   │           │   ├── generate/
│   │           │   │   └── route.ts      # POST gerar brackets
│   │           │   └── match/
│   │           │       └── [matchId]/
│   │           │           └── route.ts  # PUT resultado do jogo
│   ├── components/
│   │   ├── ui/                           # Componentes base (Button, Input, Modal, etc.)
│   │   ├── bracket/
│   │   │   ├── SingleEliminationBracket.tsx
│   │   │   ├── DoubleEliminationBracket.tsx
│   │   │   ├── RoundRobinTable.tsx
│   │   │   ├── GroupStageView.tsx
│   │   │   ├── MatchCard.tsx
│   │   │   └── BracketConnector.tsx      # Linhas SVG entre jogos
│   │   ├── tournament/
│   │   │   ├── CreateTournamentForm.tsx
│   │   │   ├── PlayerList.tsx
│   │   │   ├── TournamentHeader.tsx
│   │   │   ├── StandingsTable.tsx
│   │   │   └── ScoreInputModal.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── lib/
│   │   ├── db.ts                         # Prisma client singleton
│   │   ├── bracket-engine.ts             # Lógica de geração de brackets
│   │   ├── seeding.ts                    # Algoritmos de seeding
│   │   ├── round-robin.ts               # Geração round robin
│   │   ├── slug.ts                       # Geração de slugs únicos
│   │   └── validators.ts                # Zod schemas para validação
│   └── types/
│       └── index.ts                      # Tipos TypeScript globais
├── public/
│   └── favicon.ico
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Modelo de Dados (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL") // file:./dev.db
}

model Tournament {
  id          String   @id @default(cuid())
  slug        String   @unique          // URL amigável (ex: "torneio-verao-2025")
  adminToken  String   @unique          // Token secreto para administrar
  name        String
  description String?
  format      String                    // "single_elimination" | "double_elimination" | "round_robin" | "groups_knockout"
  status      String   @default("draft") // "draft" | "in_progress" | "completed"
  setsToWin   Int      @default(1)      // Número de sets para ganhar (best of 1, 3, etc.)
  pointsPerSet Int     @default(24)     // Pontos por set (ex: jogo a 24 pontos)
  thirdPlace  Boolean  @default(false)  // Jogo de 3º/4º lugar
  groupCount  Int?                      // Número de grupos (formato groups_knockout)
  advanceCount Int?                     // Quantos avançam por grupo
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  players Player[]
  matches Match[]
}

model Player {
  id           String  @id @default(cuid())
  name         String
  seed         Int?                     // Seed/cabeça de série (null = sem seed)
  tournamentId String
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  groupIndex   Int?                     // Índice do grupo (formato groups_knockout)

  matchesAsTeam1 Match[] @relation("Team1")
  matchesAsTeam2 Match[] @relation("Team2")
  matchWinners   Match[] @relation("Winner")
}

model Match {
  id            String  @id @default(cuid())
  tournamentId  String
  tournament    Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)

  round         Int                     // Número da ronda (1, 2, 3...)
  position      Int                     // Posição no bracket dentro da ronda
  bracketType   String  @default("winners") // "winners" | "losers" | "final" | "group" | "third_place"
  groupIndex    Int?                    // Índice do grupo (para round robin/grupos)

  team1Id       String?
  team1         Player? @relation("Team1", fields: [team1Id], references: [id])
  team2Id       String?
  team2         Player? @relation("Team2", fields: [team2Id], references: [id])
  winnerId      String?
  winner        Player? @relation("Winner", fields: [winnerId], references: [id])

  // Resultados — JSON string com array de scores por set
  // Ex: "[{\"team1\": 24, \"team2\": 18}, {\"team1\": 20, \"team2\": 24}]"
  scores        String?

  status        String  @default("pending") // "pending" | "in_progress" | "completed" | "bye"

  // Referências para progressão no bracket
  nextMatchId      String?              // Match para onde o vencedor vai
  nextMatchSlot    Int?                 // 1 = team1 do próximo match, 2 = team2
  loserNextMatchId String?             // Match para onde o perdedor vai (double elimination)
  loserNextSlot    Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Formatos de Torneio — Lógica Detalhada

### 1. Eliminação Simples (Single Elimination)

**Algoritmo de geração:**

```
Função: generateSingleElimination(players[], setsToWin, thirdPlace)

1. Calcular bracketSize = próxima potência de 2 >= nº jogadores
   Ex: 6 jogadores → bracketSize = 8
2. Calcular nº de byes = bracketSize - nº jogadores
   Ex: 8 - 6 = 2 byes
3. Criar seed order usando o padrão standard:
   Para bracket de 8: [1,8,4,5,2,7,3,6]
   Isto garante que os cabeças de série se encontram o mais tarde possível
4. Distribuir byes aos seeds mais altos (seed 1 e 2 recebem bye)
5. Criar matches da ronda 1:
   - Cada par de posições consecutivas no seed order = 1 match
   - Se um dos lados é bye, o outro avança automaticamente
6. Criar matches das rondas seguintes (vazios):
   - Ronda 2: bracketSize/4 matches
   - Ronda 3: bracketSize/8 matches
   - ...até à final (1 match)
7. Ligar nextMatchId/nextMatchSlot:
   - Match[i] da ronda R → vencedor vai para Match[floor(i/2)] da ronda R+1
   - Se i é par → nextMatchSlot = 1, se ímpar → nextMatchSlot = 2
8. Se thirdPlace = true:
   - Criar match extra, bracketType = "third_place"
   - Os perdedores das semi-finais vão para este match
```

**Número de rondas:** log2(bracketSize)
**Nomes das rondas:** "Ronda 1", "Quartos", "Meias-Finais", "Final"

### 2. Eliminação Dupla (Double Elimination)

**Algoritmo de geração:**

```
Função: generateDoubleElimination(players[], setsToWin)

1. Gerar winners bracket igual ao single elimination (sem byes no losers)
2. Gerar losers bracket:
   - Ronda L1: bracketSize/2 matches (recebem perdedores da ronda W1)
   - Ronda L2: bracketSize/4 matches (vencedores L1 vs perdedores W2)
   - Padrão alternado:
     Rondas ímpares do losers: só matches entre sobreviventes do losers
     Rondas pares do losers: sobreviventes vs novos perdedores do winners
   - Continua até restar 1 no losers bracket
3. Grand Final:
   - Match 1: Vencedor do Winners vs Vencedor do Losers
   - Se o vencedor do Losers ganha → Match 2 (reset)
   - bracketType = "final"
4. Ligar progressões:
   - Winners bracket: igual ao single elimination
   - Cada match do winners tem loserNextMatchId apontando para o losers bracket
   - Losers bracket: vencedores progridem linearmente
```

### 3. Round Robin (Todos contra Todos)

**Algoritmo de geração:**

```
Função: generateRoundRobin(players[], setsToWin)

1. Se nº jogadores ímpar, adicionar "BYE" virtual
2. Usar algoritmo de round-robin scheduling (rotação circular):
   - Fixar jogador 1
   - Rodar os restantes n-1 jogadores
   - Cada rotação = 1 ronda
   - Total de rondas = n-1 (ou n se nº ímpar)
3. Criar todos os matches com groupIndex = 0
4. Classificação por:
   a) Vitórias (desc)
   b) Sets ganhos - sets perdidos (desc)
   c) Pontos marcados - pontos sofridos (desc)
   d) Confronto directo
```

### 4. Fase de Grupos + Eliminação (Groups + Knockout)

**Algoritmo de geração:**

```
Função: generateGroupsKnockout(players[], groupCount, advanceCount, setsToWin)

1. Distribuir jogadores pelos grupos usando "serpentina":
   Seeds: 1→G1, 2→G2, 3→G3, 4→G3, 5→G2, 6→G1, 7→G1, 8→G2...
2. Para cada grupo: gerar round robin interno (groupIndex = 0, 1, 2...)
3. Após conclusão dos grupos:
   - Apurar os top advanceCount de cada grupo
   - Gerar single elimination com os apurados
   - Seeding: 1ºs dos grupos como cabeças de série, 2ºs como seeds seguintes
   - Evitar que jogadores do mesmo grupo se encontrem na 1ª ronda
```

---

## Componentes Visuais — Especificações

### Bracket de Eliminação Simples/Dupla

```
Layout do bracket (SVG/Canvas):

Ronda 1        Quartos       Meias        Final
┌─────────┐
│ Jogador1│───┐
│ vs      │   │  ┌─────────┐
│ Jogador2│───┘──│         │───┐
└─────────┘      │ vs      │   │  ┌─────────┐
┌─────────┐   ┌──│         │───┘──│         │
│ Jogador3│───┘  └─────────┘      │ vs      │──── Vencedor
│ vs      │                    ┌──│         │
│ Jogador4│───┐  ┌─────────┐  │  └─────────┘
└─────────┘   └──│         │───┘
                 │ vs      │
┌─────────┐   ┌──│         │
│ Jogador5│───┘  └─────────┘
│ vs      │
│ Jogador6│
└─────────┘
```

**Especificações do MatchCard:**
- Largura: 220px, Altura: 80px
- Dois nomes de jogadores empilhados
- Score de cada jogador à direita
- Background diferente para: pendente (cinza), em jogo (azul), completo (verde), bye (tracejado)
- Hover: highlight + cursor pointer se editável
- Vencedor: nome em bold, perdedor em opacity 0.5

**Conectores entre matches:**
- Linhas SVG com cantos arredondados (border-radius nas curvas)
- Cor: cinza claro (#CBD5E1) para pendentes, cor primária para matches activos
- Espessura: 2px

**Layout responsivo:**
- Desktop: scroll horizontal se necessário, zoom in/out com pinch/scroll
- Mobile: scroll horizontal + vertical, cards mais compactos (180px)

### Tabela Round Robin

```
┌──────────────┬───┬───┬───┬───┬───┬───┬───┬───┬────┐
│              │ J1│ J2│ J3│ J4│ V │ D │ SD│ PD│ Pts│
├──────────────┼───┼───┼───┼───┼───┼───┼───┼───┼────┤
│ 1. Jogador A │ — │2-0│1-2│2-1│ 2 │ 1 │ +2│+15│  6 │
│ 2. Jogador B │0-2│ — │2-0│2-0│ 2 │ 1 │ +2│+10│  6 │
│ 3. Jogador C │2-1│0-2│ — │2-0│ 2 │ 1 │ +1│ +5│  6 │
│ 4. Jogador D │1-2│0-2│0-2│ — │ 0 │ 3 │ -5│-30│  0 │
└──────────────┴───┴───┴───┴───┴───┴───┴───┴───┴────┘

V=Vitórias, D=Derrotas, SD=Saldo Sets, PD=Saldo Pontos
```

### Score Input Modal

```
┌───────────────────────────────────────┐
│          Introduzir Resultado         │
│                                       │
│  Ronda 1 — Jogo 3                     │
│                                       │
│  ┌─────────────┐    ┌─────────────┐   │
│  │  Jogador A  │    │  Jogador B  │   │
│  └─────────────┘    └─────────────┘   │
│                                       │
│  Set 1:  [ 24 ]  -  [ 18 ]           │
│  Set 2:  [ 20 ]  -  [ 24 ]           │
│  Set 3:  [ 24 ]  -  [ 16 ]           │
│                                       │
│  + Adicionar Set                      │
│                                       │
│  Vencedor: Jogador A (2-1)            │
│                                       │
│  [Cancelar]          [Guardar]        │
└───────────────────────────────────────┘
```

- Calcula automaticamente o vencedor com base nos sets
- Valida que os scores são coerentes
- Não permite guardar resultados incompletos
- Permite editar resultados já guardados

---

## Fluxos de Utilizador

### Fluxo 1: Criar Torneio

```
Homepage
  └─> Formulário de criação:
      - Nome do torneio (obrigatório)
      - Descrição (opcional)
      - Formato: [Single Elim | Double Elim | Round Robin | Grupos + Elim]
      - Sets para ganhar: [1 | 2 | 3]
      - Pontos por set: [24 | 21 | outro]
      - Jogo 3º/4º lugar: [checkbox] (só single elim)
      - Nº de grupos: [2-8] (só grupos+elim)
      - Avançam por grupo: [1-4] (só grupos+elim)
      └─> POST /api/tournament
          └─> Redirect para /tournament/[slug]
              (mostra link público + link admin com token)
```

### Fluxo 2: Adicionar Jogadores

```
Página do torneio (admin)
  └─> Adicionar jogadores:
      - Input de texto + botão "Adicionar"
      - OU textarea para colar vários nomes (1 por linha)
      - Drag & drop para reordenar (definir seeds)
      - Botão "Shuffle" para seeds aleatórios
      - Mínimo 3 jogadores para gerar bracket
      └─> POST /api/tournament/[slug]/players
```

### Fluxo 3: Gerar e Jogar

```
Página do torneio (admin)
  └─> Botão "Gerar Bracket" (só quando draft + jogadores suficientes)
      └─> POST /api/tournament/[slug]/generate
          └─> Gera todos os matches
          └─> Status → "in_progress"
          └─> Mostra bracket visual

  └─> Clicar num match
      └─> Abre ScoreInputModal
      └─> Introduzir scores por set
      └─> PUT /api/tournament/[slug]/match/[matchId]
          └─> Guarda resultado
          └─> Propaga vencedor para o nextMatch
          └─> Se todos os matches completos → status = "completed"
```

### Fluxo 4: Vista Pública

```
Link público /tournament/[slug]
  └─> Mostra bracket (read-only)
  └─> Mostra resultados em tempo real
  └─> Mostra classificação (round robin)
  └─> Sem opção de editar
```

---

## API Endpoints

| Método | Rota | Corpo | Resposta |
|--------|------|-------|----------|
| POST | `/api/tournament` | `{name, format, setsToWin, pointsPerSet, thirdPlace?, groupCount?, advanceCount?}` | `{tournament, adminToken, publicUrl, adminUrl}` |
| GET | `/api/tournament/[slug]` | — | `{tournament, players, matches}` |
| PUT | `/api/tournament/[slug]?token=xxx` | `{name?, description?, status?}` | `{tournament}` |
| POST | `/api/tournament/[slug]/players?token=xxx` | `{names: string[]}` ou `{name: string}` | `{players}` |
| DELETE | `/api/tournament/[slug]/players/[id]?token=xxx` | — | `{success}` |
| POST | `/api/tournament/[slug]/generate?token=xxx` | — | `{matches}` |
| PUT | `/api/tournament/[slug]/match/[matchId]?token=xxx` | `{scores: [{team1: number, team2: number}]}` | `{match, nextMatch?}` |

**Autenticação simplificada:** O `adminToken` é passado como query param. Quem tem o link admin pode editar. O link público não tem token.

---

## Fases de Implementação

### Fase 1 — Fundação (estimativa: 2-3h)

```
Tarefas:
1. Inicializar projecto Next.js 14 com TypeScript + Tailwind
2. Configurar Prisma com SQLite
3. Criar schema.prisma (copiar o de cima)
4. Executar prisma migrate
5. Criar lib/db.ts (Prisma client singleton)
6. Criar tipos TypeScript em types/index.ts
7. Criar componentes base UI: Button, Input, Modal, Card
8. Criar layout global com Header e Footer
```

### Fase 2 — Criação de Torneio (estimativa: 1-2h)

```
Tarefas:
1. Criar página homepage (src/app/page.tsx)
2. Criar CreateTournamentForm com todos os campos
3. Validação com Zod
4. API POST /api/tournament — criar torneio, gerar slug e adminToken
5. Redirect para página do torneio após criação
6. Mostrar links (público e admin) com botão de copiar
```

### Fase 3 — Gestão de Jogadores (estimativa: 1-2h)

```
Tarefas:
1. Criar PlayerList component com add/remove/reorder
2. Input individual + bulk paste (textarea)
3. Drag & drop para seeds (usar @dnd-kit/core ou HTML5 drag)
4. Botão shuffle para randomizar seeds
5. API endpoints para players (POST/DELETE)
6. Validação: nomes não vazios, sem duplicados
```

### Fase 4 — Motor de Brackets (estimativa: 3-4h) ⚡ CORE

```
Tarefas:
1. Implementar lib/bracket-engine.ts:
   - generateSingleElimination()
   - generateDoubleElimination()
   - generateRoundRobin()
   - generateGroupsKnockout()
2. Implementar lib/seeding.ts:
   - standardBracketSeeding() — gera seed order para qualquer tamanho
   - distributeByes() — distribui byes aos seeds mais altos
   - serpentineGroupDistribution() — distribui por grupos
3. Implementar lib/round-robin.ts:
   - circleMethodSchedule() — algoritmo de rotação circular
4. Testar com diferentes números de jogadores (3, 4, 5, 6, 7, 8, 12, 16, 32)
5. API POST /api/tournament/[slug]/generate
```

### Fase 5 — Visualização de Brackets (estimativa: 3-4h) ⚡ CORE

```
Tarefas:
1. Criar MatchCard component
2. Criar BracketConnector (linhas SVG)
3. Criar SingleEliminationBracket:
   - Layout por rondas (colunas)
   - Posicionamento vertical com spacing proporcional
   - Conectores entre rondas
   - Scroll horizontal para brackets grandes
4. Criar DoubleEliminationBracket:
   - Winners bracket em cima
   - Losers bracket em baixo
   - Grand final no centro-direita
5. Criar RoundRobinTable (tabela de resultados)
6. Criar GroupStageView (múltiplos round robins + bracket de eliminação)
7. Responsive: funcionar em mobile e desktop
```

### Fase 6 — Input de Resultados (estimativa: 2-3h)

```
Tarefas:
1. Criar ScoreInputModal
2. Validação de scores:
   - Cada set precisa de 2 scores
   - Calcular vencedor do set automaticamente
   - Calcular vencedor do match (best of X)
   - Não permitir empates em sets
3. API PUT /api/tournament/[slug]/match/[matchId]:
   - Guardar scores
   - Determinar vencedor
   - Propagar vencedor para nextMatch (team1 ou team2 slot)
   - Em double elimination: propagar perdedor para losers bracket
   - Em round robin: actualizar standings
   - Verificar se torneio está completo
4. Permitir editar resultados já introduzidos
5. Recalcular progressão se resultado for alterado
```

### Fase 7 — Polish e UX (estimativa: 2-3h)

```
Tarefas:
1. Loading states e skeleton screens
2. Toast notifications para acções (resultado guardado, etc.)
3. Animações suaves nas transições de estado
4. Vista fullscreen do bracket (/tournament/[slug]/bracket)
5. Highlight do caminho do vencedor no bracket final
6. Print-friendly CSS para imprimir brackets
7. Dark mode toggle
8. Favicon e meta tags
9. Empty states com ilustrações simples
10. Copiar link para clipboard com feedback visual
```

---

## Casos Edge a Tratar

```
1. BYEs: Quando nº jogadores não é potência de 2
   → Jogadores com bye avançam automaticamente, match.status = "bye"

2. Número ímpar de jogadores em round robin
   → Adicionar "BYE" virtual, vitória automática contra BYE

3. Edição de resultado já propagado
   → Limpar matches dependentes, re-propagar novo vencedor
   → Alertar que resultados à frente serão apagados

4. Empate no round robin (mesmas vitórias)
   → Desempatar por: saldo de sets → saldo de pontos → confronto directo

5. Grand final reset em double elimination
   → Se jogador do losers bracket ganha a grand final 1,
     criar grand final 2 automaticamente

6. Jogador com caracteres especiais no nome
   → Sanitizar mas permitir acentos, espaços, números

7. Torneio com 2 jogadores
   → Permitir: criar apenas a final directamente

8. Slug duplicado
   → Adicionar sufixo numérico aleatório
```

---

## Notas para o Agente (Claude Code / Copilot)

### Prioridades

1. **Funcionalidade primeiro, estética depois** — Um bracket feio que funciona vale mais que um bonito que crasha
2. **Testar com 4, 6, 8, e 16 jogadores** em single elimination antes de avançar para outros formatos
3. **Começar pelo single elimination** — é o formato mais pedido e valida toda a base
4. **O motor de brackets é o coração da app** — investir tempo na lógica de geração e propagação

### Padrões de código

- Usar `async/await` em todo o lado (nada de .then chains)
- Validação com Zod em todas as API routes
- Prisma transactions para operações que afectam múltiplos matches
- Componentes server por defeito, "use client" só quando necessário
- Extrair lógica de negócio para lib/, não meter nos API routes

### Exemplo de teste manual

```
1. Criar torneio "Teste" formato Single Elimination, best of 1, 24 pontos
2. Adicionar 6 jogadores: Alice, Bob, Carlos, Diana, Eduardo, Fátima
3. Gerar bracket → deve criar bracket de 8 com 2 byes (seed 1 e 2)
4. Ronda 1: 3 jogos reais + 2 byes propagados
5. Meter resultado: Alice 24-18 Bob → Alice avança para quartos
6. Completar todos os jogos até à final
7. Verificar que o vencedor aparece destacado
```

### Ordem de implementação recomendada para o agente

```
Sessão 1: Fases 1 + 2 + 3 (fundação + criar torneio + jogadores)
Sessão 2: Fase 4 (motor de brackets — só single elimination)
Sessão 3: Fase 5 (visualização do bracket de single elimination)
Sessão 4: Fase 6 (input de resultados + propagação)
— NESTE PONTO TEMOS UM MVP FUNCIONAL —
Sessão 5: Adicionar round robin ao motor + tabela visual
Sessão 6: Adicionar double elimination ao motor + bracket visual
Sessão 7: Adicionar grupos + knockout
Sessão 8: Fase 7 (polish)
```

---

## Prompt Inicial Sugerido para o Agente

> Vou construir uma app de torneios de padel. Lê o ficheiro `planeamento-torneios-padel.md` na raiz do projecto que tem toda a especificação. Começa pela Fase 1 (fundação): inicializa o projecto Next.js 14 com TypeScript e Tailwind, configura Prisma com SQLite usando o schema exacto do documento, cria os componentes UI base, e o layout global. Quando acabares a Fase 1, avança para a Fase 2 (formulário de criação de torneio + API). Segue a estrutura de pastas do documento à risca.