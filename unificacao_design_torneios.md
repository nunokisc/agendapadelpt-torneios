# Unificação de Design: padel_torneios ← agendapadelpt

## Contexto do Ecossistema

Estás a trabalhar num workspace com dois projetos relacionados:

| Projeto | URL Produção | Descrição |
|---|---|---|
| `agendapadelpt` | **agendapadel.pt** | Plataforma principal — agenda de padel, listagem de eventos, clubes, etc. É a **referência de design** |
| `padel_torneios` | **torneios.agendapadel.pt** | Subdomínio de torneios — criação, gestão e visualização de brackets. Deve **parecer parte do agendapadel.pt** |

O `padel_torneios` é uma componente/módulo do ecossistema `agendapadel.pt`. Um utilizador que navegue de `agendapadel.pt` para `torneios.agendapadel.pt` **não deve sentir que mudou de plataforma**. A experiência visual tem de ser contínua.

---

## Objectivo

Alinhar **todo o design visual** do `padel_torneios` com o `agendapadelpt`, transformando-o numa extensão natural da plataforma principal. Isto inclui: cores, tipografia, componentes, header/footer, espaçamentos, dark mode, e identidade visual.

---

## Análise Prévia Obrigatória — Faz isto ANTES de alterar qualquer código

### 1. Analisar o Design System do `agendapadelpt`

Inspecciona o projecto `agendapadelpt` e documenta **tudo** antes de começar:

**Cores:**
- Cor primária (brand), secundária, accent
- Cores de fundo (background principal, cards, modals)
- Cores de texto (títulos, corpo, muted, links)
- Cores de estado (sucesso/verde, erro/vermelho, warning/amarelo, info/azul)
- Gradientes usados (se existirem)
- Se usa CSS variables, lista todas as variáveis de cor definidas no `:root` ou theme

**Tipografia:**
- Font family principal (títulos e corpo)
- Font sizes usados (h1, h2, h3, body, small, caption)
- Font weights (regular, medium, semibold, bold)
- Line heights e letter spacing
- Como são importadas as fontes (Google Fonts, local, next/font?)

**Componentes UI:**
- Botões: primary, secondary, outline, ghost, danger — tamanhos, border-radius, padding, hover states
- Inputs: estilo, border, focus state, error state, label positioning
- Cards: background, border, shadow, border-radius, padding
- Modals/Dialogs: overlay, animação, tamanho
- Tables: header style, row hover, borders, zebra striping
- Badges/Tags: cores, tamanhos
- Navbar/Header: layout, logo, links, mobile menu (hamburger?)
- Footer: layout, links, copyright

**Layout:**
- Max-width do container principal
- Breakpoints responsivos
- Sistema de grid (Tailwind grid? CSS grid? Flexbox?)
- Sidebar pattern (se existir)
- Espaçamento entre secções

**Dark Mode:**
- Está implementado? Como? (class toggle, media query, CSS variables?)
- Paleta de cores em dark mode

**Padrões de código:**
- Tailwind? CSS Modules? Styled Components? SCSS?
- Convenções de naming para classes/componentes
- Estrutura de pastas de componentes
- Usa alguma biblioteca UI (shadcn, Radix, Headless UI, Material, Chakra)?

### 2. Documentar Diferenças Actuais

Depois de analisar o `agendapadelpt`, compara com o estado actual do `padel_torneios` e lista todas as discrepâncias:
- Cores diferentes
- Fontes diferentes
- Componentes com estilo diferente
- Header/footer inconsistentes
- Padrões de layout diferentes

---

## Plano de Implementação

### Fase 1 — Tokens de Design (cores, fontes, variáveis)

1. **Copiar os tokens de design do `agendapadelpt` para o `padel_torneios`:**
   - Se o `agendapadelpt` usa CSS variables no `:root`, replica exactamente as mesmas variáveis no `padel_torneios`
   - Se usa Tailwind, replica o `tailwind.config` (secções `colors`, `fontFamily`, `fontSize`, `spacing`, `borderRadius`, `boxShadow`)
   - Se usa um ficheiro de theme/tokens, copia-o

2. **Fontes:**
   - Usa exactamente as mesmas fontes do `agendapadelpt`
   - Importa-as da mesma forma (se usa `next/font`, replica o setup)
   - Aplica os mesmos `fontSize` e `fontWeight` nos mesmos contextos

3. **Cores:**
   - Substitui todas as cores hardcoded no `padel_torneios` pelas variáveis/tokens do `agendapadelpt`
   - O dark mode do `padel_torneios` (que já parece estar activo nos screenshots) deve usar exactamente a mesma paleta dark do `agendapadelpt`

### Fase 2 — Header e Footer partilhados

1. **Header/Navbar:**
   - Replica o header do `agendapadelpt` no `padel_torneios`
   - Mantém o logo "Agenda Padel" (ou variante "Agenda Padel — Torneios")
   - A navegação deve incluir link de volta ao `agendapadel.pt`
   - Links do `padel_torneios`: "Torneios", "Novo Torneio" (e os que já existem)
   - Mobile: mesmo padrão de menu hamburger/drawer do `agendapadelpt`

2. **Footer:**
   - Replica o footer do `agendapadelpt`
   - Pode ter links adicionais específicos de torneios, mas o layout e estilo são iguais

### Fase 3 — Componentes UI

Refaz ou ajusta cada componente do `padel_torneios` para corresponder ao estilo do `agendapadelpt`:

1. **Botões** — Mesmo border-radius, padding, cores, hover/active states
2. **Inputs e formulários** — Mesmo estilo de inputs, labels, validação visual
3. **Cards** — Os cards de torneio, match cards dos brackets, etc. devem usar o mesmo padrão de cards do `agendapadelpt` (background, border, shadow, radius)
4. **Tabelas** — As tabelas de classificação (round robin, fase de grupos) devem seguir o estilo de tabelas do `agendapadelpt`
5. **Modals** — O modal de input de scores deve usar o mesmo padrão de modal/dialog
6. **Badges/Status** — Estados de torneio (rascunho, em curso, completo) devem usar o mesmo padrão de badges
7. **Empty states, loading states** — Mesmo padrão visual

### Fase 4 — Páginas e Layout

1. **Layout geral:**
   - Mesmo max-width de container
   - Mesmo padrão de sidebar (se o `agendapadelpt` usa sidebar para a lista de duplas, manter)
   - Mesmos espaçamentos entre secções
   - Mesmo padrão de page titles/breadcrumbs

2. **Página de lista de torneios:**
   - Grid de cards similar ao padrão de listagem do `agendapadelpt`

3. **Página do torneio:**
   - Header do torneio com nome, formato, estado — seguir o padrão de "detail page" do `agendapadelpt`
   - Tabs (Bracket, Agenda, Inscrições) — usar o mesmo componente de tabs do `agendapadelpt` se existir

4. **Bracket view:**
   - Manter a funcionalidade actual mas aplicar as cores/tokens novos
   - Match cards com a paleta correcta
   - Conectores SVG com cores do theme

### Fase 5 — Detalhes finais

1. **Favicon e meta tags:**
   - Usar o mesmo favicon ou uma variante do `agendapadelpt`
   - Meta tags Open Graph com branding consistente
   - Title format: "Nome do Torneio | Torneios — Agenda Padel"

2. **Transições e animações:**
   - Se o `agendapadelpt` tem padrões de animação (hover, page transitions), replicar

3. **Ícones:**
   - Usar a mesma biblioteca de ícones (Lucide? Heroicons? FontAwesome? Custom SVG?)

4. **Responsividade:**
   - Testar que os mesmos breakpoints produzem resultados consistentes em ambas as plataformas
   - Em mobile, a experiência deve ser indistinguível de uma secção do `agendapadelpt`

---

## Regras Importantes

- **NÃO inventes estilos.** Tudo deve vir do `agendapadelpt`. Se um componente não existe no `agendapadelpt`, usa o componente mais próximo como base e adapta.
- **NÃO alteres a funcionalidade.** Este prompt é sobre design/visual. A lógica de torneios, brackets, scores, etc. mantém-se intacta.
- **Se o `agendapadelpt` usa uma biblioteca UI** (shadcn, Radix, etc.), instala-a também no `padel_torneios` e usa os mesmos componentes.
- **Se o `agendapadelpt` tem um ficheiro de constantes/tokens** (theme.ts, colors.ts, tokens.css), referencia-o directamente em vez de duplicar valores.
- **Preferência por partilha real:** Se for viável, extrai os tokens/componentes partilhados para um package ou ficheiro importável. Se não for viável no imediato, duplica mas mantém os valores exactamente iguais com um comentário `// Synced from agendapadelpt`.

---

## Validação Final

Depois de aplicar todas as alterações, verifica:

- [ ] Abre `agendapadelpt` e `padel_torneios` lado a lado — as cores, fontes e espaçamentos são indistinguíveis
- [ ] O header do `padel_torneios` parece uma extensão natural do `agendapadelpt`
- [ ] O footer é visualmente idêntico
- [ ] Os botões, inputs, cards e tabelas seguem o mesmo padrão
- [ ] Dark mode (se activo) usa a mesma paleta em ambos
- [ ] Em mobile (375px), a experiência é consistente
- [ ] Um utilizador que clique num link de `agendapadel.pt` para `torneios.agendapadel.pt` não nota que mudou de aplicação
- [ ] O bracket e os match cards mantêm a funcionalidade completa com o novo visual
- [ ] As tabelas de grupo/round robin mantêm a legibilidade com as novas cores