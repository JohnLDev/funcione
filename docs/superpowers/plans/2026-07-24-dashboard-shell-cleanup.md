# Dashboard Shell Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover informacoes genericas do dashboard, tornar Perfil uma rota real e reorganizar o shell desktop/mobile.

**Architecture:** `AppShell` fica responsavel apenas por layout, header e navegacao. `DashboardScreen` passa a renderizar conteudo baseado no estado real do plano ativo. `AthleteProfileScreen` mostra perfil de cadastro e perfil atletico derivado do estado real de treino.

**Tech Stack:** React, React Router, Vite, Tailwind, Playwright, i18next.

## Global Constraints

- Mobile first e sem overflow horizontal.
- Toda mudanca de comportamento deve comecar por E2E RED.
- Nao exibir metricas, historico ou progresso que nao existam no backend/estado real.
- Manter i18n em `pt-BR` e `en-US`.

---

## Arquivos Afetados

- `apps/frontend/e2e/app-shell.spec.ts`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/components/dashboard-screen.tsx`
- `apps/frontend/src/components/athlete-profile-screen.tsx`
- `apps/frontend/src/i18n/locales/pt-BR/common.json`
- `apps/frontend/src/i18n/locales/en-US/common.json`

## Checklist

- [x] Escrever E2E RED validando dashboard sem placeholders, sem Historico, uma saida no desktop e sidebar alto.
- [x] Escrever E2E RED validando rota `/profile` com dados de cadastro e area de perfil atletico.
- [x] Refatorar `AppShell` para remover conteudo default e limpar header/sidebar.
- [x] Criar `DashboardScreen` baseado em plano ativo/perfil atletico real.
- [x] Criar `AthleteProfileScreen` para dados de cadastro e perfil atletico.
- [x] Adicionar rota protegida `/profile`.
- [x] Atualizar traducoes.
- [x] Rodar verificacoes automatizadas e reiniciar ambiente local.

## Verificacao

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "dashboard shell uses only real navigation and state"
rtk npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "opens the athlete profile route"
rtk npm run typecheck
rtk npm test
rtk npm run test:e2e
rtk npm run build
rtk git diff --check
```
