# System Design Template

Use this template when documenting a non-trivial feature: new API routes, client data flows, UI components, or architectural changes.

**Scope:** Architecture-level work. Skip for cosmetic tweaks (color changes, copy edits).

**Output location:** `docs/features/<feature-name>.md` or a dated entry in a feature log.

---

## 1. Problem statement

One sentence describing the user or system need.

> Example: Replace hardcoded Cavaliers box score data with live data from the NBA proxy endpoint.

---

## 2. Key concepts

Define terms a reader needs. One or two sentences each.

Include design patterns when relevant (Adapter, Strategy, Factory, etc.) with a brief tradeoff note. See `.cursor/rules/development.mdc` for the full pattern list.

---

## 3. CSS concepts *(UI features only)*

Define new selectors, layout modes, or properties introduced by the feature.

> Examples: Flexbox, CSS custom properties (`var(--name)`), pseudo-elements (`::before`), transitions.

---

## 4. Options considered

| Option | Summary |
|--------|---------|
| A | … |
| B | … |
| C | … |

---

## 5. Tradeoffs

For each option, note one benefit and one cost.

> Example: Direct client → ESPN calls simplify the stack but introduce CORS restrictions and expose upstream coupling.

---

## 6. Decision

Which option was chosen and the primary reason.

---

## 7. Technologies

List libraries, APIs, and patterns used. Define anything non-obvious in one line.

---

## 8. Reference implementation

**Required.** A minimal, generic code snippet illustrating the core pattern. Use neutral names (`data`, `url`, `res`); avoid project-specific IDs unless necessary.

---

## 9. Glossary *(optional)*

New terms introduced by this feature. Link to [GLOSSARY.md](GLOSSARY.md) for shared definitions.

---

## Authoring notes

- Keep explanations concise; prefer tables and diagrams for structure.
- When adding CSS, document every new concept the reader must understand.
- When applying a design pattern, name it and state why it fits.
