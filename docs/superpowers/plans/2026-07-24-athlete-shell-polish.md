# Athlete Shell Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar dashboard, perfil e header para exibir nome do atleta, boas-vindas e configuracoes compactas.

**Architecture:** `AppShell` deriva o nome exibido do perfil de cadastro quando disponivel. `SettingsMenu` encapsula idioma e tema em um unico botao de engrenagem. `DashboardScreen` ganha uma saudacao acima dos cards reais. `AthleteProfileScreen` remove byline redundante e empilha os blocos no desktop.

**Tech Stack:** React, React Router, Vite, Tailwind, Playwright, i18next.

## Global Constraints

- Mobile first e sem overflow horizontal.
- Toda mudanca de comportamento deve comecar por E2E RED.
- Nao duplicar informacoes de marca dentro do conteudo quando ja aparecem no menu lateral.
- Manter i18n em `pt-BR` e `en-US`.

---

## Arquivos Afetados

- `apps/frontend/e2e/app-shell.spec.ts`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/components/settings-menu.tsx`
- `apps/frontend/src/components/dashboard-screen.tsx`
- `apps/frontend/src/components/athlete-profile-screen.tsx`
- `apps/frontend/src/i18n/locales/pt-BR/common.json`
- `apps/frontend/src/i18n/locales/en-US/common.json`

## Checklist

- [x] Escrever E2E RED para nome no header, saudacao, settings menu e perfil empilhado.
- [x] Criar `SettingsMenu` com botao de engrenagem e controles existentes.
- [x] Fazer `AppShell` usar nome do atleta vindo do perfil.
- [x] Adicionar saudacao no dashboard.
- [x] Ajustar layout do perfil e remover byline redundante.
- [x] Atualizar traducoes.
- [x] Rodar verificacoes automatizadas e reiniciar ambiente local.

## Verificacao

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "polishes the athlete shell"
rtk npm run typecheck
rtk npm test
rtk npm run test:e2e
rtk npm run build
rtk git diff --check
```
