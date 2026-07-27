# Plano: loading padrao da aplicacao

## Objetivo

Criar um loading reutilizavel para a aplicacao com feedback animado ligado ao universo esportivo, aplicando-o no carregamento do plano de treino e no carregamento inicial do app.

## Abordagem

- Usar um componente `AppLoading` em `apps/frontend/src/components/`.
- Manter o componente acessivel com `role="status"`, `aria-live="polite"` e nome acessivel via texto de i18n.
- Usar icone esportivo animado com `lucide-react`, seguindo os estilos existentes de Tailwind e tema claro/escuro.
- Atualizar i18n em `pt-BR` e `en-US`.
- Cobrir o carregamento do plano com E2E simulando atraso no gateway mock.

## Arquivos Afetados

- `apps/frontend/e2e/training-plan.spec.ts`
- `apps/frontend/src/training/mock-training-plan-gateway.ts`
- `apps/frontend/src/components/app-loading.tsx`
- `apps/frontend/src/components/training-screen.tsx`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/i18n/locales/pt-BR/common.json`
- `apps/frontend/src/i18n/locales/en-US/common.json`

## Checklist

- [x] Adicionar teste E2E RED para loading do plano.
- [x] Permitir atraso de carregamento no mock de plano.
- [x] Criar `AppLoading` reutilizavel, responsivo e acessivel.
- [x] Aplicar `AppLoading` no treino e no loading inicial.
- [x] Atualizar traducoes.
- [x] Rodar verificacoes automatizadas.
- [x] Reiniciar ambiente local para validacao manual.

## Verificacao

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium --grep "shows the app loading animation while loading the active plan"
rtk npm run typecheck
rtk npm test
rtk npm run test:e2e
rtk npm run build
rtk git diff --check
```
