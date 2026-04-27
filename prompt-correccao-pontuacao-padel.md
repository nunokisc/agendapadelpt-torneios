# Prompt de Correcção — Sistema de Pontuação e Quadros Oficiais de Padel

> **Contexto:** O sistema de pontuação da app está fundamentalmente errado. Usa pontuação livre (24 pontos, 21 pontos por set) quando o padel usa o mesmo sistema do ténis: pontos (0/15/30/40), jogos e sets. Além disso, os sistemas de jogo e quadros de fase de grupos + eliminação precisam de seguir o regulamento oficial da Federação Portuguesa de Padel (FPP). Verifica todo o código existente e corrige o que for necessário segundo as regras abaixo. Não alteres a lógica dos brackets de eliminação directa (single/double elimination) nem a estrutura de pastas.

---

## 1. SISTEMA DE PONTUAÇÃO — REGRAS BASE

### Pontos dentro de um jogo (game)
- Progressão: 0 → 15 → 30 → 40 → Jogo
- Em 40-40 ("iguais"/"deuce"): disputa-se vantagem — é preciso ganhar 2 pontos consecutivos para fechar o jogo
- **Excepção No-Ad / Ponto de Ouro:** em 40-40 joga-se um único ponto decisivo; a dupla que recebe o serviço escolhe de que lado recebe
- **Excepção Star Point (FIP 2026):** até 2 vantagens alternadas são permitidas normalmente; se o marcador voltar a 40-40 uma terceira vez, o ponto seguinte é decisivo (ponto de ouro), a dupla que recebe escolhe o lado

### Set clássico (6 jogos)
- Ganha quem chegar a 6 jogos com pelo menos 2 de vantagem
- Em 5-5: continua até 7-5
- Em 6-6: joga-se um **tie-break** (pontos contados 0,1,2,3…7; ganha quem chegar a 7 com mínimo 2 de vantagem; se necessário continua até haver 2 de diferença). O set fica 7-6

### Set curto (4 jogos) — formatos C e F
- Ganha quem chegar a 4 jogos com 2 de vantagem
- Em 4-4: joga-se um tie-break. O set fica 5-4

### Pro Set (9 jogos) — formatos D
- Ganha quem chegar a 9 jogos com 2 de vantagem
- Em 5-5: joga-se um tie-break. O set fica 10-9... ERRADO. Correcção: em 8-8 joga-se tie-break

### Tie-break de set
- Pontos contados 0,1,2,3…; primeiro a 7 com mínimo 2 de vantagem

### Super Tie-break (substitui o 3º set)
- Pontos contados 0,1,2,3…; primeiro a 10 com mínimo 2 de vantagem
- Conta como um set para efeitos de resultado (o resultado fica 2-1 em sets)

### Partida
- Ganha quem vencer 2 sets (nos formatos de 3 sets)
- Ou ganha quem vencer o único set (formatos D, E, F)

---

## 2. FORMATOS DE JOGO OFICIAIS (FFT + FPP)

Remove os campos `pointsPerSet` e `setsToWin` do Tournament. Substitui por um campo `matchFormat`.

### Tabela completa de formatos

| Código | Nome | Descrição | Deuce Rule | Tempo est. |
|--------|------|-----------|------------|------------|
| **PRO** | Pro Set | 1 set até 9 jogos, tie-break em 8-8 | Sem ponto de ouro | 60 min |
| **PROPO** | Pro Set c/ Ponto de Ouro | 1 set até 9 jogos, tie-break em 8-8 | Ponto de ouro | 45 min |
| **M3S** | Melhor de 3 Sets, Super TB | 2 sets a 6 jogos (TB em 6-6); 3º set = super tie-break a 10 | Sem ponto de ouro | 80 min |
| **M3SPO** | Melhor de 3 Sets, Super TB c/ PO | 2 sets a 6 jogos (TB em 6-6); 3º set = super tie-break a 10 | Ponto de ouro | 65 min |
| **M3** | Melhor de 3 Sets | 3 sets a 6 jogos (TB em 6-6); 3º set normal | Sem ponto de ouro | 100 min |
| **M3PO** | Melhor de 3 Sets c/ PO | 3 sets a 6 jogos (TB em 6-6); 3º set normal | Ponto de ouro | 100 min |
| **A1** | FFT A1 | 3 sets a 6 jogos, com vantagem | Vantagem | — |
| **A2** | FFT A2 | 3 sets a 6 jogos | Ponto decisivo (No-Ad) | — |
| **B1** | FFT B1 | 2 sets a 6 jogos + super TB a 10 | Vantagem | — |
| **B2** | FFT B2 | 2 sets a 6 jogos + super TB a 10 | Ponto decisivo | — |
| **C1** | FFT C1 | 2 sets a 4 jogos (TB em 4-4) + super TB a 10 | Vantagem | — |
| **C2** | FFT C2 | 2 sets a 4 jogos (TB em 4-4) + super TB a 10 | Ponto decisivo | — |
| **D1** | FFT D1 | 1 set a 9 jogos (TB em 8-8) | Vantagem | — |
| **D2** | FFT D2 | 1 set a 9 jogos (TB em 8-8) | Ponto decisivo | — |
| **E** | FFT E | 1 super tie-break a 10 pontos | — | — |
| **F** | FFT F | 1 set a 4 jogos, TB em 3-3 | Ponto decisivo | — |

**Nota:** Os formatos FPP (PRO, PROPO, M3S, M3SPO, M3, M3PO) e os FFT (A1-F) são todos válidos. A app deve suportar todos. O default pode ser `M3SPO` (o mais comum em torneios portugueses).

**Nota 2:** Quanto ao Star Point (FIP 2026), adiciona-o como opção adicional/checkbox que pode ser combinada com qualquer formato, em vez de ser um formato separado.

---

## 3. ALTERAÇÕES NO SCHEMA PRISMA

```prisma
model Tournament {
  // REMOVER estes campos:
  // setsToWin    Int     @default(1)
  // pointsPerSet Int     @default(24)

  // ADICIONAR:
  matchFormat  String  @default("M3SPO")  // Código do formato (ver tabela acima)
  starPoint    Boolean @default(false)     // Se true, usa Star Point em vez do deuce rule do formato
  // O campo setsToWin deixa de existir — é implícito no formato
}

model Match {
  // O campo scores continua a ser String? (JSON), mas o formato muda.
  // Novo formato JSON para scores:
  //
  // SET NORMAL: {"team1": 6, "team2": 4}
  // SET COM TIE-BREAK: {"team1": 7, "team2": 6, "tiebreak": [7, 3]}
  // SUPER TIE-BREAK (como 3º set): {"isSuperTiebreak": true, "team1": 10, "team2": 7}
  // FORMATO E (só STB): [{"isSuperTiebreak": true, "team1": 10, "team2": 6}]
  //
  // Exemplos completos:
  // M3SPO normal: [{"team1":6,"team2":3}, {"team1":4,"team2":6}, {"isSuperTiebreak":true,"team1":10,"team2":7}]
  // M3 normal:    [{"team1":6,"team2":3}, {"team1":4,"team2":6}, {"team1":6,"team2":2}]
  // PRO:          [{"team1":9,"team2":5}]
  // PRO com TB:   [{"team1":9,"team2":8, "tiebreak":[7,4]}]  -- NOTA: no Pro Set o TB é em 8-8
  // E:            [{"isSuperTiebreak":true,"team1":10,"team2":8}]
  // F:            [{"team1":4,"team2":2}]
  // F com TB:     [{"team1":4,"team2":3, "tiebreak":[7,5]}]  -- TB em 3-3
  scores String?
}
```

---

## 4. NOVO FICHEIRO: `lib/scoring.ts`

Criar este módulo com a seguinte lógica:

### 4.1 `getFormatConfig(format: string)`
Retorna a configuração do formato:
```typescript
type FormatConfig = {
  maxSets: number           // 1 para PRO/D/E/F, 2 para M3S/B/C (2 + STB), 3 para M3/A
  setsToWin: number         // 1 para PRO/D/E/F, 2 para todos os outros
  gamesPerSet: number       // 6 para A/B/M3, 4 para C/F, 9 para PRO/D, 0 para E
  tiebreakAt: number        // 6 para sets a 6, 4 para sets a 4, 8 para Pro Set, 3 para F
  hasNoAd: boolean          // true para formatos com ponto de ouro/decisivo
  thirdSetType: 'normal' | 'superTiebreak' | 'none'  // 'superTiebreak' para M3S/B/C, 'normal' para M3/A, 'none' para PRO/D/E/F
  superTiebreakTarget: number  // 10 (standard)
  isSingleSuperTiebreak: boolean // true apenas para formato E
}
```

### 4.2 `validateSetScore(set, format, setIndex, previousSets)`
Regras de validação por tipo de set:
- **Set a 6 jogos:** vencedor tem 6 ou 7. Se 6, o outro tem 0-4. Se 7, o outro tem 5 ou 6. Se 7-6, tie-break obrigatório.
- **Set a 4 jogos:** vencedor tem 4 ou 5. Se 4, o outro tem 0-2 (com 2 de diferença). Se 5, o outro tem 4. Se 5-4, tie-break obrigatório.
- **Pro Set (9 jogos):** vencedor tem 9 ou mais. Se ambos chegam a 8, tie-break. Resultado máximo sem TB: 9-7. Com TB: 9-8 + tiebreak.
  Espera, correcção: no Pro Set ganha quem chegar a 9 jogos. Em 8-8 → tie-break. Logo o resultado com TB é 9-8 e o tiebreak decide.
  Sem TB: 9-0, 9-1, ..., 9-7.
- **Tie-break de set:** primeiro a 7, mínimo 2 de diferença (7-0 até 7-5, depois 8-6, 9-7, etc.)
- **Super tie-break:** primeiro a 10, mínimo 2 de diferença
- **Formato F:** set a 4 jogos, TB em 3-3. Vencedor tem 4 (se outro tem 0-2) ou 4-3 com TB.
- **Não permitir 3º set se alguém já ganhou 2 sets**
- **Nos formatos M3S/B/C: o 3º set é SEMPRE super tie-break, nunca um set normal**

### 4.3 `determineSetWinner(set, format, setIndex)`
Retorna 1, 2 ou null.

### 4.4 `determineMatchWinner(scores, format)`
Conta sets ganhos e retorna o vencedor. Para formato E, o resultado do único STB decide.

### 4.5 `validateMatchScores(scores, format): { valid: boolean, errors: string[] }`
Validação completa antes de guardar.

---

## 5. ALTERAÇÕES NO ScoreInputModal

### Layout dinâmico por formato

O modal deve adaptar-se ao formato do torneio:

**Para formatos de 3 sets (A1/A2/M3/M3PO):**
```
Set 1:  [ _ ] - [ _ ]     (tie-break se 6-6: [ _ ] - [ _ ])
Set 2:  [ _ ] - [ _ ]     (tie-break se 6-6: [ _ ] - [ _ ])
Set 3:  [ _ ] - [ _ ]     (só aparece se 1-1 em sets)
                           (tie-break se 6-6: [ _ ] - [ _ ])
```

**Para formatos M3S/M3SPO/B1/B2:**
```
Set 1:  [ _ ] - [ _ ]     (tie-break se 6-6: [ _ ] - [ _ ])
Set 2:  [ _ ] - [ _ ]     (tie-break se 6-6: [ _ ] - [ _ ])
Super Tie-Break: [ _ ] - [ _ ]  (só aparece se 1-1 em sets)
```

**Para formatos C1/C2 (sets a 4 jogos):**
```
Set 1:  [ _ ] - [ _ ]     (tie-break se 4-4: [ _ ] - [ _ ])
Set 2:  [ _ ] - [ _ ]     (tie-break se 4-4: [ _ ] - [ _ ])
Super Tie-Break: [ _ ] - [ _ ]  (só aparece se 1-1 em sets)
```

**Para PRO/PROPO (1 Pro Set):**
```
Pro Set:  [ _ ] - [ _ ]   (tie-break se 8-8: [ _ ] - [ _ ])
```

**Para D1/D2 (1 set a 9 jogos):**
```
Set:  [ _ ] - [ _ ]       (tie-break se 8-8: [ _ ] - [ _ ])
```

**Para E (super tie-break único):**
```
Super Tie-Break:  [ _ ] - [ _ ]
```

**Para F (1 set a 4 jogos):**
```
Set:  [ _ ] - [ _ ]       (tie-break se 3-3: [ _ ] - [ _ ])
```

### Comportamento do modal:
- O tie-break aparece automaticamente quando o score do set atinge o empate que o requer (6-6, 4-4, 8-8, 3-3)
- O 3º set (ou STB) só aparece quando os 2 primeiros sets estão 1-1
- O vencedor de cada set é mostrado em tempo real à medida que se escreve
- O vencedor da partida é calculado automaticamente
- Botão "Guardar" desactivado se scores inválidos, mostrando a razão do erro
- Permitir editar resultados já guardados (recalcular propagação no bracket)

---

## 6. ALTERAÇÕES NO FORMULÁRIO DE CRIAÇÃO DE TORNEIO

- **Remover:** campos "Sets para ganhar" e "Pontos por set"
- **Adicionar:** selector "Formato de jogo" com dropdown agrupado:

```
Formatos FPP (Portugal):
  PRO PO — Pro Set com Ponto de Ouro (1 set a 9 jogos) — ~45 min
  M3 S PO — Melhor de 3, Super TB, Ponto de Ouro — ~65 min
  M3 PO — Melhor de 3 Sets com Ponto de Ouro — ~100 min
  PRO — Pro Set (1 set a 9 jogos) — ~60 min
  M3 S — Melhor de 3, Super Tie-Break — ~80 min
  M3 — Melhor de 3 Sets completos — ~100 min

Formatos FFT (França):
  A1 — 3 sets a 6 jogos (com vantagem)
  A2 — 3 sets a 6 jogos (ponto decisivo)
  B1 — 2 sets + super tie-break (com vantagem)
  B2 — 2 sets + super tie-break (ponto decisivo)
  C1 — 2 sets a 4 jogos + super tie-break
  C2 — 2 sets a 4 jogos + super TB (ponto decisivo)
  D1 — 1 set a 9 jogos
  D2 — 1 set a 9 jogos (ponto decisivo)
  E — Super tie-break a 10 pontos (formato rápido)
  F — 1 set a 4 jogos (ponto decisivo, TB em 3-3)
```

- **Adicionar:** checkbox "Star Point (FIP 2026)" — opcional, aplicável a qualquer formato
- Mostrar descrição curta do formato seleccionado por baixo do selector
- O checkbox "Jogo 3º/4º lugar" continua a existir independentemente do formato

---

## 7. CLASSIFICAÇÃO EM ROUND ROBIN / FASE DE GRUPOS

A classificação actual baseada em "pontos marcados/sofridos" está errada (isso era para o sistema de pontuação livre que não existe).

### Nova ordem de classificação:
1. **Vitórias** (descendente)
2. **Saldo de sets** = sets ganhos - sets perdidos (descendente)
3. **Saldo de jogos** = jogos ganhos nos sets - jogos perdidos nos sets (descendente)
4. **Confronto directo** entre pares empatados
5. **Se ainda empatados:** saldo de jogos no confronto directo

### Colunas da tabela Round Robin:
| Pos | Dupla | J | V | D | SG | SP | SS | JG | JP | SJ |
|-----|-------|---|---|---|----|----|----|----|----|----|
| 1   | Nome  | 3 | 2 | 1 | 4  | 2  | +2 | 30 | 22 | +8 |

Legenda: J=Jogos disputados, V=Vitórias, D=Derrotas, SG=Sets ganhos, SP=Sets perdidos, SS=Saldo sets, JG=Jogos (games) ganhos, JP=Jogos perdidos, SJ=Saldo jogos

---

## 8. SISTEMAS DE JOGO POR NÚMERO DE PARES (Regulamento FPP)

O regulamento FPP define exactamente que sistema usar consoante o número de duplas inscritas. A app deve respeitar isto quando o utilizador selecciona o formato "Grupos + Quadro":

### Tabela de sistemas

| Nº Pares | Sistema | Descrição |
|----------|---------|-----------|
| 4 | 1 grupo de 4 + Final | Round robin de 4; 1º vs 2º na final |
| 5 | 1 grupo de 5 + Final | Round robin de 5; 1º vs 2º na final |
| 6 | 2 grupos de 3 + Meias + Final | 2 passam por grupo; 1ºA vs 2ºB, 1ºB vs 2ºA |
| 7 | 2 grupos (3+4) + Meias + Final | Grupo A tem 3, Grupo B tem 4; cruzamento igual |
| 8 | 2 grupos de 4 + Meias + Final | 2 passam por grupo; cruzamento 1ºA vs 2ºB |
| 9 | 3 grupos de 3 + Quartos + Meias + Final | 1ºA e 1ºB têm bye nas meias; quartos: 2ºB vs 2ºC e 1ºC vs 2ºA |
| 10 | 3 grupos (3+3+4) + Quartos + Meias + Final | Mesmo bracket que 9 pares |
| 11 | 3 grupos (3+4+4) + Quartos + Meias + Final | Mesmo bracket que 9 pares |
| 12-16 | Quadro directo com cabeças de série | Eliminação directa (bracket de 12 a 16 com byes) |
| 12 | 11A + 4B = Quadro Directo | |
| 13 | 12A + 4B = Quadro Directo | |
| 14 | 13A + 5B = Quadro Directo | |
| 15 | 14A + 6B = Quadro Directo | |
| 16 | 15A + 7B = Quadro Directo | |
| 17-32 | Quadro directo com 8 CS | Eliminação com 8 cabeças de série |
| 33-64 | Quadro directo com 16 CS | Eliminação com 16 cabeças de série |

### Brackets de eliminação após fase de grupos

**2 grupos (até 16 duplas):**
```
1/2 Final: 1ºA vs 2ºB
1/2 Final: 1ºB vs 2ºA
Final: vencedor vs vencedor
```

**3 grupos (até 16 duplas):**
```
1/4 Final: 2ºB vs 2ºC
1/4 Final: 1ºC vs 2ºA
1/2 Final: 1ºA vs vencedor(2ºB vs 2ºC)
1/2 Final: 1ºB vs vencedor(1ºC vs 2ºA)
Final
```
Nota: 1ºA e 1ºB têm bye e entram directamente nas meias-finais.

**4 grupos (até 16 duplas):**
```
1/4 Final: 1A vs 2C
1/4 Final: 2B vs 1D
1/4 Final: 1C vs 2A
1/4 Final: 2C vs 1B   -- ERRADO, vou corrigir:
```
Correcção com base no bracket oficial da FPP (página 17 do PDF):
```
1/4 Final: 1A vs 2C
1/4 Final: 2B vs 1D
1/4 Final: 1C vs 2A
1/4 Final: 2D vs 1B  -- ERRADO novamente. Pelo bracket:
```
O bracket oficial de 4 grupos mostra:
```
Metade superior: 1A vs 2C → vencedor
                 2B vs 1D → vencedor → Meia-final → Final
Metade inferior: 1C vs 2A → vencedor
                 2C vs 1B → vencedor → Meia-final →
```
Espera, vou ser mais preciso. O bracket da página 17 mostra exactamente:
```
1A ─┐
    ├── Meia 1 ─┐
2C ─┘           │
                ├── Final
2B ─┐           │
    ├── Meia 2 ─┘
1D ─┘
1C ─┐
    ├── Meia 3 ─┐
2A ─┘           │
                ├── (outra metade)
2C ─┐           │
    ├── Meia 4 ─┘
1B ─┘
```

Simplificando, o bracket de 4 grupos é um quadro de 8 com este seeding:
```
1A vs 2C
2B vs 1D
1C vs 2A
2D vs 1B
```
(Os 1ºs de grupo não se cruzam nas primeiras rondas; os 2ºs de cada grupo cruzam com 1ºs de outros grupos)

**5 grupos (até 16 duplas):**
Bracket de 10 com byes. Seeding do bracket oficial (página 18):
```
1A ─────────┐
            ├── QF ─┐
2B ─┐       │       │
    ├───────┘       ├── SF ─┐
2E ─┘               │       │
                    │       ├── Final
2C ─┐               │       │
    ├── QF ─────────┘       │
1D ─┘                       │
                            │
1C ─────────┐               │
            ├── QF ─┐       │
1E ─┐       │       │       │
    ├───────┘       ├── SF ─┘
2A ─┘               │
                    │
2D ─┐               │
    ├── QF ─────────┘
1B ─┘
```

**5+ grupos (mais de 16 duplas):** Só os 1ºs de cada grupo avançam (sem 2ºs):
```
1A ─────┐
        ├── SF ─┐
1D ─────┘       │
                ├── Final
1C ─┐           │
    ├── SF ─────┘
1E ─┐   │
    ├───┘
1B ─┘
```

**6 grupos (mais de 16):** 1A, 1E, 1D, 1C, 1F, 1B no bracket
**7 grupos (mais de 16):** 1A, 1G, 1E, 1D, 1C, 1F, 1B
**8 grupos (mais de 16):** 1A, 1G, 1E, 1D, 1C, 1H, 1F, 1B

---

## 9. MODALIDADE MÍNIMA POR FASE (Regulamento FPP)

O regulamento FPP define que modalidade de jogo mínima usar por fase do torneio:

| Fase | Modalidade mínima |
|------|-------------------|
| Grupos de 3 | PRO PO |
| Grupos de 4 | PRO PO |
| Grupos de 5 | PRO PO |
| 1/64 até 1/16 | M3 S PO |
| 1/8 | M3 S PO (ou M3 PO para M1, M2, M3, F1, +35M, +40M, +45M, +50M, SUB18, SUB16) |
| 1/4 | M3 S PO (ou M3 PO para categorias superiores) |
| 1/2 | M3 PO (para a maioria das categorias) ou M3 S PO |
| Final | M3 PO (para categorias superiores) ou M3 S PO |

Isto é informativo — a app não precisa de forçar isto automaticamente mas pode mostrá-lo como sugestão/referência. Se quiseres implementar, adiciona como tooltip ou nota informativa junto ao selector de formato.

---

## 10. RESUMO DAS ALTERAÇÕES A FAZER

### Ficheiros a modificar:
1. **`prisma/schema.prisma`** — remover `setsToWin` e `pointsPerSet`, adicionar `matchFormat` e `starPoint`
2. **`lib/scoring.ts`** — CRIAR NOVO — toda a lógica de pontuação, validação e determinação de vencedor
3. **`components/tournament/ScoreInputModal.tsx`** — refazer completamente para suportar todos os formatos
4. **`components/tournament/CreateTournamentForm.tsx`** — substituir campos de pontuação pelo selector de formato
5. **`components/bracket/RoundRobinTable.tsx`** — actualizar classificação (saldo sets/jogos em vez de pontos)
6. **`components/tournament/StandingsTable.tsx`** — mesma correcção
7. **`lib/round-robin.ts`** ou **`lib/bracket-engine.ts`** — actualizar cálculo de standings
8. **API routes** — actualizar validação Zod para aceitar matchFormat em vez dos campos antigos
9. **`types/index.ts`** — actualizar tipos para reflectir os novos formatos e scores

### Ficheiros a NÃO alterar:
- Lógica de geração de brackets de eliminação (single/double)
- Estrutura de pastas
- Sistema de slugs/tokens
- Componentes visuais do bracket (SVG/conectores)
- Layout global

### Migração de dados:
Se já existirem torneios na base de dados com os campos antigos, cria uma migração Prisma que:
1. Adiciona `matchFormat` com default `"M3SPO"`
2. Adiciona `starPoint` com default `false`
3. Remove `setsToWin` e `pointsPerSet`