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

**Ciclo de vida de uma série:** `draft` → `in_progress` (após gerar o bracket) → `completed` (todos os jogos terminados). O estado do torneio reflecte o agregado de todas as séries — o torneio passa a `in_progress` quando a primeira série gera bracket, e a `completed` quando todas as séries são concluídas.

**Override de formato por série:** cada série pode ter um `matchFormat` próprio que sobrepõe o formato global do torneio. A resolução é: `category.matchFormat ?? tournament.matchFormat`.

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
- **Eliminar dupla** — o admin pode remover uma dupla (apenas em séries em rascunho)
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
- **Falta de comparência (walkover)** — o admin pode registar no modal que uma dupla não compareceu; a dupla ausente perde por W/O, o score é gerado automaticamente a zero (ex. M3SPO → `6-0, 6-0`; D1 → `9-0`) e o badge **W/O** aparece no cartão de jogo; a dupla faltosa recebe 0 pontos na classificação
- **Vista pública de resultados** — na vista pública (página principal e bracket fullscreen), clicar num jogo concluído abre um modal de leitura com o resultado set a set, tie-breaks e vencedor; jogos pendentes/em curso não são clicáveis para o público

### Classificação em grupos (Round Robin / Fase de Grupos)

Tabela com colunas: **J** (jogos disputados), **V** (vitórias), **D** (derrotas), **Pts** (pontos), **SG** (sets ganhos), **SP** (sets perdidos), **SS** (saldo de sets), **JG** (jogos/games ganhos), **JP** (jogos perdidos), **SJ** (saldo de jogos).

**Sistema de pontos:**

| Resultado | Pontos |
|-----------|--------|
| Vitória | 3 |
| Derrota (normal) | 1 |
| Derrota por W/O (falta de comparência) | 0 |

Critérios de ordenação (por ordem):
1. **Pontos** (Pts)
2. Vitórias
3. Saldo de sets (SG − SP)
4. Saldo de jogos (JG − JP)
5. Confronto directo (h2h wins)
6. Saldo de jogos no confronto directo

### Gestão de torneios (admin)
- **Editar** — nome, descrição, número de campos, datas de início/fim, torneio público, inscrições abertas
- **Eliminar** — apaga torneio e todos os dados associados
- **Clonar** — cria novo rascunho com as mesmas duplas, séries e configurações (mapeamento de categoryId preservado)
- **Gerir Categorias** — adicionar ou remover séries em qualquer torneio (série só pode ser removida se ainda em rascunho e existir pelo menos uma outra)
- Separador **Inscrições** (admin only, visível apenas após gerar pelo menos um bracket) — aprovar ou rejeitar inscrições pendentes de duplas; em torneios multi-série o admin pode mudar a série antes de aprovar

### Auto-inscrição pública
- Página pública `/tournament/[slug]/register` para duplas se inscreverem
- Formulário: Jogador 1, Jogador 2, nome de dupla (opcional), contacto (opcional)
- Em torneios com múltiplas séries: dropdown obrigatório para escolher a série
- Inscrições ficam pendentes até o admin aprovar (cria dupla na série correspondente) ou rejeitar
- Activado por `registrationOpen` no torneio

---

### Agenda e horário

O sistema de agendamento é **global ao torneio** — todas as séries são agendadas numa vista única, não série a série.

#### Separador "Horário" (público) / "Agenda" (admin)

- Disponível como tab de nível superior (acima das tabs de série), acessível antes de qualquer bracket estar gerado
- **Vista pública**: tabela de leitura em modo horário, agrupada por dia, com intervalo completo (ex. `09:00–10:30`), campo, séries e estado
- **Vista admin**: idêntica mas com botão de edição por linha
- Linha com destaque colorido por estado: azul para jogos em curso, verde para concluídos
- **Bottom nav mobile**: botão "Horário" para o público; botão "Agenda" para o admin

#### Filtro por série (multi-selecção)

- Chips de série permitem seleccionar **uma ou várias séries em simultâneo** para filtrar a vista
- "Todas" limpa a selecção e mostra todos os jogos
- O filtro aplica-se também ao agendamento automático e ao reset — é possível agendar apenas MX4 para sexta-feira e o resto noutro momento

#### Agendamento manual (admin)

- Cada linha tem botão "Agendar" / "Editar" que abre um painel inline
- Painel inline: campo (texto livre) + data/hora início + hora fim calculada automaticamente
- **Detecção de conflitos em tempo real** (client-side): ao alterar campo ou hora, o sistema verifica imediatamente se o campo já está ocupado naquele intervalo por outro jogo; mostra aviso em âmbar com o jogo conflituante e o seu intervalo
- **Validação server-side** (PATCH): a API retorna 409 se o campo já estiver ocupado no slot pedido, mesmo que o admin tente forçar através de outro meio
- Jogos concluídos ou em curso não podem ser reagendados

#### Agendamento automático (admin)

- Distribui os jogos **sem hora marcada** pelos campos disponíveis
- Configuração: um ou mais dias com data, hora de início e hora de fim (padrão 09:00–23:59); duração por jogo em minutos
- Garante **dois tipos de conflito impossíveis**:
  1. Mesmo campo, mesmo slot → nunca dois jogos no mesmo campo ao mesmo tempo
  2. Mesma dupla → nunca a mesma dupla a jogar em dois campos ao mesmo tempo (rastreamento de disponibilidade por dupla)
- Os jogos já agendados (qualquer estado) **nunca são sobrescritos** — apenas os pendentes sem hora são distribuídos
- A ordem de agendamento respeita as fases: grupos → winners → losers → 3.º lugar → final
- Botão "Usar datas do torneio" pré-preenche os dias a partir de `startDate`/`endDate`
- `slotMinutes` e `scheduleDays` ficam persistidos no torneio após cada execução

#### Reset de agenda (admin)

- Botão "Limpar agenda" apaga campo e hora dos jogos pendentes
- Respeita o filtro activo: se uma série estiver seleccionada, só limpa essa(s) série(s); caso contrário limpa todo o torneio
- Jogos concluídos ou em curso nunca são afectados

#### Partilha WhatsApp (admin)

- Cada jogo com campo e hora tem um ícone WhatsApp que abre mensagem pré-formatada com nomes das duplas, data/hora e campo
- Visível apenas para admins (oculto na vista pública)

---

### Formulário de criação — estimativa de capacidade

O formulário de criação inclui uma secção **Disponibilidade** com:
- Datas de início e fim do torneio (guardadas no modelo)
- Tabela de horários por dia gerada automaticamente (um dia por linha): hora início e hora fim editáveis individualmente
- Campo "Duração por jogo" (padrão 90 min, guardado como `slotMinutes`)

Com base nestes dados e no formato/configuração escolhidos, é calculada em tempo real uma **estimativa de capacidade**:
- Total de slots disponíveis (campos × Σ slots/dia)
- Breakdown de jogos por fase para o formato seleccionado:
  - **Grupos + Eliminação**: jogos de grupos + jogos knockout, com base em `groupCount`/`advanceCount`
  - **Eliminação Simples**: N−1 (+ 1 se jogo do 3.º lugar)
  - **Eliminação Dupla**: 2×(N−1)
  - **Round Robin**: N×(N−1)/2
- Controlo ± de "duplas por série" (2–32)
- Resultado: verde (cabe, com slots livres) ou vermelho (não cabe, com jogos a mais e máximo de séries possível)

O valor `slotMinutes` definido na criação é herdado pelo agendador automático como valor por omissão.

---

### "Os meus jogos"
- Página `/tournament/[slug]/minha-dupla` — pesquisa por nome (mín. 2 letras) e vê todos os jogos da dupla
- Secções: Em Curso / Próximos / Concluídos, com resultado, campo e hora
- Resultado: badge **Vitória** (verde) / **Derrota** (vermelho) / **W/O** (vermelho) quando a dupla faltou
- Score set-a-set com contagem correcta de sets incluindo tiebreaks (6-6 TB)
- Pesquisa persiste por torneio em `localStorage`
- Acessível via bottom nav em mobile

### Estatísticas
- Página `/tournament/[slug]/stats` com classificação de todas as duplas
- Colunas idênticas à tabela de grupos: **J**, **V**, **D**, **Pts**, **SG**, **SP**, **SS** (sempre visíveis), **JG**, **JP**, **SJ** (ocultas em mobile)
- Ordenação: pontos → vitórias → saldo de sets
- Inclui jogos por walkover: a dupla faltosa contabiliza derrota com 0 pontos

### Exportação
- `/tournament/[slug]/export?format=csv` — todos os jogos em CSV
- `/tournament/[slug]/export?format=ical` — agenda em formato iCal (.ics) para importar no calendário

### Diretório público
- `/torneios` lista todos os torneios marcados como públicos
- Pesquisa por nome/descrição, badge de inscrições abertas

### Actualizações em tempo real (SSE)

O sistema usa **Server-Sent Events** para distribuir actualizações em tempo real a todos os utilizadores ligados:

| Evento | Descrição |
|--------|-----------|
| `match_completed` | Resultado registado — notificação local |
| `match_started` | Jogo iniciado — notificação local |
| `match_reset` | Resultado reposto — notificação local |
| `bracket_generated` | Bracket gerado — notificação local |
| `tournament_updated` | Torneio actualizado — refetch silencioso |

- Endpoint: `GET /api/tournament/[slug]/stream`
- Hook client-side `useTournamentSSE` subscreve o stream e dispara re-fetch automático
- **Notificações locais** — quando o utilizador opta por receber notificações (via `usePushNotifications`), os eventos SSE disparam notificações do browser usando o service worker (ou fallback para `new Notification()`). Não são push notifications reais via VAPID — o browser tem de manter uma tab aberta

### PWA — Progressive Web App
- Instalável como app nativa em Android e iOS ("Adicionar ao ecrã inicial")
- Service worker com cache network-first para API e cache-first para páginas
- Ícone (🎾 sobre fundo verde #0E7C66), splash screen e theme color configurados

### UX mobile
- **Bottom navigation** fixo em mobile:
  - **Público**: Bracket / Horário / Os meus jogos / Estatísticas (componente `TournamentBottomNav`)
  - **Admin**: Bracket / Agenda / Inscrições (renderizado directamente na página principal do torneio)
- Bracket em mobile com tabs por ronda (lista de jogos); bracket visual completo em desktop
- Eliminação dupla e grupos com tabs por secção em mobile
- Dark mode com toggle (persiste em `localStorage`, sem flash ao carregar)
- Toast notifications para feedback de acções (via `ToastProvider`)
- Loading skeletons durante carregamento

### Vista de bracket em ecrã completo
- `/tournament/[slug]/bracket` — bracket sem navegação
- Em torneios multi-série: tabs por série, com persistência em `?cat=<código>`
- Botão **Imprimir** com CSS de impressão (`print:hidden`, `print:bg-white`, etc. — oculta nav, mostra cabeçalho limpo)

### "Os meus torneios"
- Torneios criados no browser ficam guardados em `localStorage`
- Painel na homepage com links de vista pública e admin

### Painel de administração global
- `/admin` — lista todos os torneios da plataforma
- Protegido por `PLATFORM_ADMIN_TOKEN`
- Estatísticas por estado, pesquisa por nome/slug

### QR Code
- LinkShare gera QR code da ligação pública localmente (download PNG)

### Middleware — Rate Limiting e Gestão de Token

O middleware (aplicado a `/tournament/*` e `/api/*`) inclui:
- **Rate limiting**: 5 req/s para criação de torneios, 10 req/s para inscrições, 60 req/s para restantes endpoints
- **Gestão automática de token admin**: extrai `?token=` do URL → guarda em cookie com expiração de 90 dias (evita tokens visíveis no URL após primeiro acesso)

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
│   ├── global-error.tsx                  # Error boundary global
│   ├── manifest.ts                       # PWA manifest
│   ├── icon.tsx                          # Favicon gerado em runtime (32×32, 🎾 fundo verde)
│   ├── apple-icon.tsx                    # Apple touch icon (180×180, 🎾 fundo verde)
│   ├── api/
│   │   ├── admin/route.ts                # GET /api/admin (token plataforma)
│   │   ├── tournaments/route.ts          # GET /api/tournaments (públicos)
│   │   └── tournament/
│   │       ├── route.ts                  # POST /api/tournament (criar; suporta startDate/endDate/slotMinutes)
│   │       └── [slug]/
│   │           ├── route.ts              # GET / PATCH (suporta startDate/endDate) / DELETE
│   │           ├── categories/
│   │           │   ├── route.ts          # GET listar séries; POST adicionar série por código
│   │           │   └── [categoryId]/route.ts  # PUT actualizar; DELETE remover série
│   │           ├── generate/route.ts     # POST gerar bracket por categoryId; fpp_auto auto-determina formato
│   │           ├── players/route.ts      # POST/PUT/PATCH/DELETE duplas + check-in (aceita categoryId)
│   │           ├── match/[matchId]/      # PUT resultado + walkover; PATCH iniciar jogo (startedAt); DELETE repor resultado
│   │           ├── clone/route.ts        # POST clonar (remapeia categoryIds)
│   │           ├── register/route.ts     # GET/POST/PATCH inscrições (aceita categoryId)
│   │           ├── reset/route.ts        # POST repor bracket (opcional: só uma categoria)
│   │           ├── schedule/route.ts     # PATCH (manual c/ conflito 409) / POST (auto) / DELETE (reset)
│   │           ├── export/route.ts       # GET exportar CSV / iCal
│   │           └── stream/route.ts       # GET SSE para live updates
│   └── tournament/[slug]/
│       ├── page.tsx                      # Vista principal; tabs Bracket/Horário globais acima das séries
│       ├── admin/page.tsx                # Redirect admin com token
│       ├── bracket/page.tsx              # Ecrã completo + tabs por série (?cat=) + imprimir
│       ├── minha-dupla/page.tsx          # "Os meus jogos" — pesquisa por nome
│       ├── stats/page.tsx                # Estatísticas por dupla (standalone, fetch próprio)
│       └── register/page.tsx             # Inscrição pública (dropdown de série se multi-série)
├── components/
│   ├── bracket/
│   │   ├── MatchCard.tsx                 # Cartão de jogo (destaque vencedor)
│   │   ├── SingleEliminationBracket.tsx  # Vista desktop + tabs mobile por ronda
│   │   ├── DoubleEliminationBracket.tsx  # Winners/Losers/Final com tabs mobile
│   │   ├── RoundRobinTable.tsx           # Classificação (J/V/D/Pts/SG/SP/SS/JG/JP/SJ) + jogos
│   │   ├── GroupStageView.tsx            # Grupos com tabs mobile
│   │   └── BracketConnector.tsx          # Linhas SVG entre jogos
│   ├── tournament/
│   │   ├── CreateTournamentForm.tsx      # Criação: modo/formato/séries/campos/disponibilidade/capacidade
│   │   ├── PlayerList.tsx                # Duplas: drag & drop, bulk import, check-in (passa categoryId)
│   │   ├── MyTournaments.tsx             # Painel localStorage
│   │   ├── ScoreInputModal.tsx           # Introdução de resultados com +/− buttons; registo de W/O
│   │   ├── MatchResultModal.tsx          # Modal de leitura de resultados (vista pública)
│   │   ├── TournamentHeader.tsx          # Editar (c/ startDate/endDate) / Eliminar / Clonar
│   │   ├── LinkShare.tsx                 # Partilhar link + QR code
│   │   ├── ScheduleManager.tsx           # Agenda global: tabela, filtro multi-série, auto-schedule, conflitos
│   │   └── RegistrationPanel.tsx         # Aprovar/rejeitar; filtro por série; mudar série
│   ├── ui/
│   │   ├── Badge.tsx / Button.tsx / Card.tsx / Input.tsx / Modal.tsx / Select.tsx
│   │   ├── Skeleton.tsx                  # Loading skeletons
│   │   ├── ThemeToggle.tsx               # Dark mode toggle
│   │   └── ToastProvider.tsx             # Toast notifications (feedback de acções)
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── TournamentBottomNav.tsx        # Bottom nav público: Bracket/Horário/Os meus jogos/Estatísticas
│       └── PwaRegister.tsx               # Registo do service worker
├── lib/
│   ├── bracket-engine.ts                 # generateSingleElimination / RR / Groups / DE
│   ├── fpp-bracket.ts                    # getFPPConfig (sistema por nº duplas) + fppKnockoutOrder
│   ├── fpp-format.ts                     # getFppFormatForCategory — determina matchFormat + systemType (FPP Auto)
│   ├── categories.ts                     # FPP_CATEGORIES (34 séries); getCategoryName
│   ├── scoring.ts                        # Formatos FPP + FFT; determineSetWinner; validateScores; buildWalkoverScores
│   ├── standings.ts                      # computeGroupStandings (pontos + 6 critérios de desempate)
│   ├── bulk-import.ts                    # parseBulkText — parser de importação em massa
│   ├── my-tournaments.ts                 # localStorage helpers
│   ├── validators.ts                     # Zod schemas (tournamentMode; categories; startDate/endDate/slotMinutes)
│   ├── auth.ts                           # getAdminToken() — leitura client-side do cookie de admin
│   ├── auth-server.ts                    # extractAdminToken() — extração server-side do token (query/cookie)
│   ├── sse.ts                            # addClient / removeClient / broadcastUpdate / getClientCount (SSE server)
│   ├── use-tournament-sse.ts             # useTournamentSSE hook + showLocalNotification (SSE client)
│   ├── use-push-notifications.ts         # usePushNotifications hook (opt-in notificações locais por torneio)
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
    ├── 20260427_schedule/               # Adiciona slotMinutes e scheduleDays ao Tournament; startedAt ao Match
    ├── 20260429_tournament_dates/       # Adiciona startDate e endDate ao Tournament
    └── 20260429_walkover/               # Adiciona walkover String? ao Match

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
  courtCount       Int?                            // número de campos disponíveis
  slotMinutes      Int?                            // duração por jogo em minutos (definido na criação ou no auto-agendamento)
  scheduleDays     String?                         // JSON: [{date,startTime,endTime}[]] (janelas de agenda)
  startDate        DateTime?                       // data de início do torneio
  endDate          DateTime?                       // data de fim do torneio
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
  walkover         String?   // "team1" | "team2" — equipa que não compareceu (falta de comparência)
  status           String    // pending | in_progress | completed | bye
  nextMatchId      String?
  nextMatchSlot    Int?      // 1 ou 2 — slot no jogo seguinte (team1 ou team2)
  loserNextMatchId String?
  loserNextSlot    Int?      // 1 ou 2 — slot no jogo seguinte do loser bracket
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

**Agendamento global**: o `ScheduleManager` recebe `allMatches` (todos os jogos do torneio) e `categories` (todas as séries). O filtro por série (`selectedCats: Set<string>`) é um estado local do componente — não afecta os dados, só o que é apresentado e o scope do auto-agendamento/reset. A tab "Horário"/"Agenda" é renderizada ao nível do torneio, acima das tabs de série.

**Agendamento automático — ordenação de dias**: os dias fornecidos pelo admin são ordenados por data (`YYYY-MM-DD`) antes de serem processados, garantindo que dias fora de ordem não produzem horários incorrectos.

**Prevenção de conflitos no agendamento automático**: o auto-agendador rastreia dois recursos em paralelo para cada slot:
1. `courtNextFreeMs` — quando cada campo fica livre
2. `teamNextFreeMs` — quando cada dupla fica disponível (por `team1Id`/`team2Id`)

Para cada jogo a agendar, o `notBefore = max(courtFree, team1Free, team2Free)`. Após agendar, os três pointers são actualizados. Ambos os maps são inicializados a partir dos jogos já agendados na DB, garantindo que o agendamento incremental (por série ou por lote) respeita sempre o que já existe.

**Conflito manual (PATCH)**: a API PATCH de agendamento valida sobreposição de intervalo server-side: busca jogos no mesmo campo com `scheduledAt < newEnd` e verifica `existingEnd > newStart`. Em caso de conflito, retorna 409 com os nomes das duplas conflituantes. O `EditPanel` faz a mesma verificação client-side em tempo real contra o state React, mostrando aviso imediato sem depender da API.

**Cálculo de intervalo**: `slotMinutes` é guardado no torneio e usado como duração por omissão em todo o sistema — coluna "Hora" do horário mostra `início–fim` (ex. `09:00–10:30`), conflito manual usa `slotMinutes` para calcular sobreposição, e o delay-push usa-o para saber o fim do slot de cada jogo.

**Estimativa de capacidade na criação**: `matchesPerCategory(format, groupCount, advanceCount, teams, thirdPlace)` é uma função puramente client-side que calcula o número de jogos por série para cada formato. O total de slots disponíveis é `Σ(floor((endMin − startMin) / slotMinutes) × courts)` por dia. A comparação é feita em tempo real conforme o utilizador ajusta os parâmetros.

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

**Formatos de jogo (scoring)**: `src/lib/scoring.ts` é a fonte de verdade para toda a lógica de validação e determinação de vencedor. Os formatos FPP (PRO, PROPO, M3S, M3SPO, M3, M3PO) são aliases dos FFT equivalentes — `getFormatStructure` delega para o formato FFT correspondente. A detecção do Super Tie-Break é feita por `structure[i].type === "superTiebreak"`, nunca por nome de formato. `buildWalkoverScores(format, winnerSide)` gera o score de W/O para um dado formato: cada set não-condicional fica com `maxGames-0` (ex. M3SPO → `[{team1:6,team2:0},{team1:6,team2:0}]`; D1 → `[{team1:9,team2:0}]`; E → `[{team1:10,team2:0,superTiebreak:true}]`).

**Standings (classificação de grupos)**: `computeGroupStandings` em `src/lib/standings.ts` é a única fonte de verdade — usada pela tabela visual (`RoundRobinTable`), pela página de estatísticas e pelo servidor ao avançar jogadores para o knockout. Sistema de pontos: vitória=3, derrota normal=1, derrota por W/O=0. Critérios de ordenação: pontos → vitórias → saldo sets → saldo jogos → h2h wins → saldo jogos h2h. O saldo de sets trata correctamente sets empatados com tie-break (ex. 6-6 TB 7-5): o set é atribuído ao lado que ganhou o tie-break, não ao lado "else". Jogos por walkover sem scores (dados legados) são aceites — contabilizam win/loss/pts mas sem set/game data.

**Formato FPP automático (`fpp_auto`)**: o formato é apenas uma etiqueta guardada no torneio. O sistema de grupos (1, 2 ou 3 grupos, ou eliminação directa) é determinado em `src/lib/fpp-bracket.ts → getFPPConfig(playerCount)` **no momento de gerar o bracket**, quando o número de duplas confirmadas é conhecido. O seeding cross-grupo (`fppKnockoutOrder`) garante que nenhum par do mesmo grupo se cruza na primeira ronda do knockout.

**Modo FPP Automático (`tournamentMode = "fpp_auto"`)**: distinto do campo `format`. Quando `tournamentMode` é `"fpp_auto"`, a geração do bracket usa `getFppFormatForCategory(n)` (`src/lib/fpp-format.ts`) para determinar simultaneamente o **matchFormat** (ex: M3SPO, PROPO) e o **sistema de bracket** (round_robin, groups_knockout, single_elimination) com base na tabela FPP. Esta função é diferente de `getFPPConfig` que apenas determina o sistema de bracket para o campo `format = "fpp_auto"` (modo legado).

**Geração do bracket de Grupos+Knockout**: quando o último jogo de grupo é registado, o servidor computa automaticamente as classificações e gera o bracket de eliminação dentro da mesma transacção Prisma. Para `fpp_auto` usa `fppKnockoutOrder`; para `groups_knockout` manual usa o seeding legacy.

**Séries/Categorias**: cada série tem os seus próprios `Player[]` e `Match[]`. A geração do bracket aceita `categoryId` no body e actua apenas sobre essa série. O `category.status` transita para `in_progress` ao gerar e para `completed` quando todos os jogos da série terminam. O `tournament.status` só passa a `completed` quando todas as séries estão concluídas. Torneios existentes sem séries têm uma categoria `OPEN` criada pela migração `20260427_categories` — todo o código legado continua a funcionar sem alterações.

**Clone com séries**: o clone remapeia os `categoryId` de todos os jogadores para os IDs das novas categorias clonadas, usando um mapa `oldId → newId` construído durante a transacção.

**SSE — eventos em tempo real**: cada acção no match emite um evento SSE distinto para que o hook `useTournamentSSE` mostre a notificação correcta:

| Acção | Evento SSE | Notificação push |
|-------|-----------|-----------------|
| Submeter resultado / W/O | `match_completed` | "Resultado registado" |
| Iniciar jogo (▶ Iniciar) | `match_started` | "Jogo iniciado" |
| Repor resultado | `match_reset` | "Resultado reposto" |
| Gerar bracket | `bracket_generated` | "Bracket gerado" |
| Actualizar torneio | `tournament_updated` | — |

O evento legado `match_updated` continua a ser ouvido silenciosamente para compatibilidade com clientes ligados durante um deploy.

**SSR e localStorage**: componentes que dependem de `localStorage` usam um estado `ready` inicializado a `false` para evitar hydration mismatch.

**Separação admin/público**: a presença do query param `?token=<adminToken>` na URL é o único critério que activa os controlos de edição. Sem token, a página é completamente read-only. O botão WhatsApp do horário é igualmente restrito ao admin.

**Modelo de dados "dupla"**: o modelo `Player` representa uma dupla de padel. Os campos `player1Name` e `player2Name` guardam os nomes individuais; `name` é o nome de exibição. Todo o código interno usa `Player`/`team` por razões históricas do ORM mas a terminologia visível ao utilizador é "dupla".
