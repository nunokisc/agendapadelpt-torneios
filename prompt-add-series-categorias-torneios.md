Implementar Séries/Categorias dentro de um Torneio
Antes de implementar qualquer coisa, faz um audit completo do código existente — lê todos os ficheiros relevantes (prisma/schema.prisma, lib/, components/, app/api/, types/index.ts) e mapeia o que já existe, o que está errado, e o que falta. Só depois implementa.
Presta atenção especial ao sistema de inscrições já existente — lê como está implementado actualmente (modelo de dados, API routes, componentes de UI) antes de o tocar, e adapta-o em vez de o reescrever.

Conceito central
Um torneio agrupa múltiplas séries/categorias (ex: M3, M4, F3, MX3). Cada série é completamente independente — tem os seus próprios jogadores, o seu próprio bracket, e o seu próprio estado. O torneio tem dois modos:

Manual — o organizador escolhe um formato de jogo único (ex: M3SPO) que se aplica a todas as séries, independentemente do número de inscrições
FPP Automático — o formato e sistema de jogo de cada série é determinado automaticamente com base no número de duplas inscritas nessa série, seguindo a tabela oficial do Anexo XIX do regulamento FPP


1. Schema Prisma
prismamodel Tournament {
  // campos existentes mantêm-se
  matchFormat    String?  // nullable — só preenchido em modo manual
  tournamentMode String   @default("manual") // "manual" | "fpp_auto"
  categories     Category[]
}

model Category {
  id           String     @id @default(cuid())
  tournamentId String
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  code         String     // "M3", "F4", "MX2", "+35M", "SUB18", etc.
  name         String     // "Masculinos 3", etc.
  matchFormat  String?    // null até ser determinado (auto) ou herdado (manual)
  starPoint    Boolean    @default(false)
  status       String     @default("draft") // "draft" | "in_progress" | "completed"
  order        Int        @default(0)
  players      Player[]
  matches      Match[]
  registrations Registration[] // se o modelo de inscrições existir — adaptar conforme o audit
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  @@unique([tournamentId, code])
}

model Player {
  // Adicionar:
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  // tournamentId mantém-se para queries globais
}

model Match {
  // Adicionar:
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
}
Migração para dados existentes: para cada torneio já existente, criar uma categoria com code = "OPEN", name = "Open", herdar o matchFormat do torneio, e associar todos os Player e Match existentes a essa categoria.

2. lib/categories.ts — Lista de categorias FPP
typescriptexport const FPP_CATEGORIES = [
  { code: "M1", name: "Masculinos 1", group: "Masculinos" },
  { code: "M2", name: "Masculinos 2", group: "Masculinos" },
  { code: "M3", name: "Masculinos 3", group: "Masculinos" },
  { code: "M4", name: "Masculinos 4", group: "Masculinos" },
  { code: "M5", name: "Masculinos 5", group: "Masculinos" },
  { code: "M6", name: "Masculinos 6", group: "Masculinos" },
  { code: "F1", name: "Femininos 1", group: "Femininos" },
  { code: "F2", name: "Femininos 2", group: "Femininos" },
  { code: "F3", name: "Femininos 3", group: "Femininos" },
  { code: "F4", name: "Femininos 4", group: "Femininos" },
  { code: "F5", name: "Femininos 5", group: "Femininos" },
  { code: "F6", name: "Femininos 6", group: "Femininos" },
  { code: "MX1", name: "Mistos 1", group: "Mistos" },
  { code: "MX2", name: "Mistos 2", group: "Mistos" },
  { code: "MX3", name: "Mistos 3", group: "Mistos" },
  { code: "MX4", name: "Mistos 4", group: "Mistos" },
  { code: "MX5", name: "Mistos 5", group: "Mistos" },
  { code: "MX6", name: "Mistos 6", group: "Mistos" },
  { code: "+35M", name: "+35 Masculinos", group: "Veteranos" },
  { code: "+40M", name: "+40 Masculinos", group: "Veteranos" },
  { code: "+45M", name: "+45 Masculinos", group: "Veteranos" },
  { code: "+50M", name: "+50 Masculinos", group: "Veteranos" },
  { code: "+55M", name: "+55 Masculinos", group: "Veteranos" },
  { code: "+60M", name: "+60 Masculinos", group: "Veteranos" },
  { code: "+35F", name: "+35 Femininas", group: "Veteranas" },
  { code: "+40F", name: "+40 Femininas", group: "Veteranas" },
  { code: "+45F", name: "+45 Femininas", group: "Veteranas" },
  { code: "+50F", name: "+50 Femininas", group: "Veteranas" },
  { code: "+55F", name: "+55 Femininas", group: "Veteranas" },
  { code: "+60F", name: "+60 Femininas", group: "Veteranas" },
  { code: "SUB18", name: "Sub-18", group: "Jovens" },
  { code: "SUB16", name: "Sub-16", group: "Jovens" },
  { code: "SUB14", name: "Sub-14", group: "Jovens" },
  { code: "SUB12", name: "Sub-12", group: "Jovens" },
]

3. lib/fpp-format.ts — Determinação automática de formato por nº de inscrições
typescriptexport function getFppFormatForCategory(numPairs: number): {
  matchFormat: string
  systemType: string
  groupCount?: number
  advanceCount?: number
  description: string
} {
  if (numPairs <= 3)   return { matchFormat: "PROPO", systemType: "round_robin",      description: "Round Robin" }
  if (numPairs === 4)  return { matchFormat: "PROPO", systemType: "groups_knockout",  groupCount: 1, advanceCount: 2, description: "1 Grupo de 4 + Final" }
  if (numPairs === 5)  return { matchFormat: "PROPO", systemType: "groups_knockout",  groupCount: 1, advanceCount: 2, description: "1 Grupo de 5 + Final" }
  if (numPairs === 6)  return { matchFormat: "M3SPO", systemType: "groups_knockout",  groupCount: 2, advanceCount: 2, description: "2 Grupos de 3 + Meias + Final" }
  if (numPairs === 7)  return { matchFormat: "M3SPO", systemType: "groups_knockout",  groupCount: 2, advanceCount: 2, description: "2 Grupos (3+4) + Meias + Final" }
  if (numPairs === 8)  return { matchFormat: "M3SPO", systemType: "groups_knockout",  groupCount: 2, advanceCount: 2, description: "2 Grupos de 4 + Meias + Final" }
  if (numPairs === 9)  return { matchFormat: "M3SPO", systemType: "groups_knockout",  groupCount: 3, advanceCount: 2, description: "3 Grupos de 3 + Quartos + Final" }
  if (numPairs === 10) return { matchFormat: "M3SPO", systemType: "groups_knockout",  groupCount: 3, advanceCount: 2, description: "3 Grupos (3+3+4) + Quartos + Final" }
  if (numPairs === 11) return { matchFormat: "M3SPO", systemType: "groups_knockout",  groupCount: 3, advanceCount: 2, description: "3 Grupos (3+4+4) + Quartos + Final" }
  if (numPairs <= 16)  return { matchFormat: "M3SPO", systemType: "direct_bracket",   description: "Quadro Directo com CS" }
  if (numPairs <= 32)  return { matchFormat: "M3SPO", systemType: "direct_bracket",   description: "Quadro com 8 CS" }
  return                      { matchFormat: "M3SPO", systemType: "direct_bracket",   description: "Quadro com 16 CS" }
}
Esta função é chamada ao gerar o bracket de uma série em modo FPP Auto.

4. Sistema de inscrições — adaptar para categorias
O sistema actual funciona assim: jogador inscreve-se no torneio → fica pendente → organizador aprova/rejeita → aprovado entra na lista de jogadores do torneio.
Não havia séries, por isso não havia associação a categoria. Adapta o fluxo da seguinte forma, sem reescrever o que já funciona:
No formulário público de inscrição:

Adiciona um campo obrigatório "Série" com as categorias activas do torneio (dropdown ou radio buttons mostrando os códigos + nomes, ex: "M3 — Masculinos 3")
O campo só aparece se o torneio tiver mais do que uma categoria; se tiver só uma, associa automaticamente sem mostrar o campo

No modelo de dados:

Adiciona categoryId à inscrição (pendente) — a inscrição já sabe para que série é antes de ser aprovada
Ao aprovar uma inscrição, o jogador criado herda o categoryId da inscrição

No painel admin:

A lista de inscrições pendentes é filtrada pela tab de categoria activa
O organizador pode mudar a categoria de uma inscrição pendente antes de aprovar (caso o jogador se tenha inscrito na série errada)
Após aprovação, o jogador aparece na lista de jogadores da categoria correspondente


5. Formulário de criação do torneio
Adiciona dois novos blocos ao CreateTournamentForm:
Bloco A — Modo:

Toggle/radio: "Manual" vs "FPP Automático"
Se Manual: selector de formato de jogo único (aplica-se a todas as séries)
Se FPP Auto: selector de formato oculto; nota informativa: "O formato de cada série é determinado automaticamente com base no número de inscrições, seguindo o regulamento FPP."

Bloco B — Categorias:

Lista FPP_CATEGORIES agrupada com checkboxes
Mínimo 1 obrigatória
Ordem de apresentação segue a ordem da lista FPP


6. Painel Admin

Tabs no topo com as categorias activas: M3 | M4 | F3 | MX3
Toda a gestão (jogadores, inscrições, gerar bracket, resultados) ocorre no contexto da tab activa
Badge de estado por tab: Draft / Em Curso / Concluído
Em modo FPP Auto: ao clicar "Gerar Bracket", mostrar confirmação com o sistema determinado: "Com 7 inscrições: 2 Grupos (3+4) + Meias + Final, formato M3SPO. Confirmar?"
Em modo Manual: gerar directamente com o formato do torneio
Botão "Gerir Categorias" (só enquanto draft) para adicionar/remover categorias


7. Vista pública

Tabs horizontais com os códigos das categorias activas
Categoria activa persiste na URL via query param: ?cat=M3
Se só uma categoria, sem tabs — bracket directamente
Scroll horizontal nas tabs em mobile


8. API Routes
Adiciona:
MétodoRotaDescriçãoGET/api/tournament/[slug]/categoriesLista categoriasPOST/api/tournament/[slug]/categories?token=xxxAdiciona categorias (array de codes)PUT/api/tournament/[slug]/categories/[categoryId]?token=xxxActualiza formato/estadoDELETE/api/tournament/[slug]/categories/[categoryId]?token=xxxRemove (só se draft e sem jogadores)
Actualiza endpoints existentes para aceitar categoryId:

POST /players — body inclui categoryId
POST /generate — body inclui categoryId; em FPP Auto determina e guarda matchFormat na categoria antes de gerar
GET /[slug] — retorna categories com jogadores e matches aninhados por categoria
Endpoints de inscrições — adaptar conforme audit para incluir categoryId


Não alterar: lógica interna de geração de brackets, componentes visuais do bracket, sistema de slugs/tokens, layout global, lib/scoring.ts.