# Architecture Guidelines

## Principles
1. UX and performance are the top priority. When there is a trade-off, prefer
   the option with better UX/performance and document the reason.

## Rules
1. Data flow: `Component -> Hook -> Service`.
   Components never make HTTP calls; they only call hooks.
2. API layer: all network code lives in `services/api/*` and uses `request.ts`.
3. React Query: all client-side queries and mutations go through React Query
   hooks. Components handle only UI and handlers.
4. Responsibilities: if a component is > ~200 lines or has 2+ responsibilities,
   split it. Move complex logic (DnD, formulas, calculations) to hooks/utils.
5. Minimize `use client`: make a component client-side only when it needs
   state/effects/handlers.
6. Styling: CSS Modules are primary. Tailwind is for small, local utility use.

## Context (current)
- Redux is used only for auth.
- React Query persister stores only: `boards`, `board columns`, `board meta`.
