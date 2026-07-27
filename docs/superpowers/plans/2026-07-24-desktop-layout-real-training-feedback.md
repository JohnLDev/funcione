# Desktop Layout And Real Training Feedback

## Objetivo

Normalizar login, cadastro e dashboard para desktop sem degradar o mobile; trocar o botao Google para um padrao visual reconhecivel; melhorar feedback durante geracao de treino; validar o fluxo real com Supabase e IA capturando erros de autenticacao e geracao.

## Achados Da Investigacao

- Login e cadastro usam o mesmo layout mobile-first com `Card` em `mt-auto`; no desktop isso empurra o formulario para baixo e cria uma area vazia excessiva.
- O dashboard desktop renderiza apenas a primeira linha de cards, deixando o restante da tela muito vazio.
- O botao de Google usa o icone `Chrome`, que nao representa o padrao visual de login com Google.
- No fluxo real com o usuario `real.flow.1784905164062@gmail.com`, as chamadas `GET /api/training-plans/active` e `POST /api/training-plans/monthly` sairam com header `Authorization`. O erro `AUTH_TOKEN_MISSING` nao reproduziu nesse caminho autenticado.
- A geracao real ficou longa sem feedback progressivo. Uma tentativa posterior mediu `POST /api/training-plans/monthly` em aproximadamente 200s: provider primario `nvidia` falhou com 410 apos ~96s, fallback `openrouter` gerou o plano em ~101s, e a reserva foi encerrada.
- Cadastro por senha no Supabase real exige confirmacao de e-mail; para validar ponta a ponta, o usuario de teste foi confirmado via Supabase MCP.

## Abordagem

- Preservar mobile: manter card baixo no mobile e bottom navigation atual.
- Desktop auth: centralizar o conjunto logo/toggles/formulario a partir de `lg`, removendo o efeito de tela vazia acima do formulario.
- Google: substituir `Chrome` por um icone Google dedicado e botao branco/alto contraste.
- Dashboard: adicionar mais paineis operacionais na tela inicial desktop e fazer `Iniciar treino` navegar para `/training`.
- Treino: mostrar feedback por fases durante geracao e mapear erros 401 de auth para mensagem clara de sessao.
- Backend: limitar tentativas de modelo por timeout configuravel para evitar provider pendurado indefinidamente e registrar a duracao total da geracao.
- Testes: adicionar cobertura E2E para layout desktop, botao Google, dashboard preenchido e feedback de geracao.

## Arquivos Afetados

- `apps/frontend/e2e/app-shell.spec.ts`
- `apps/frontend/e2e/training-plan.spec.ts`
- `apps/frontend/src/components/auth-screen.tsx`
- `apps/frontend/src/components/profile-completion-screen.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/components/google-icon.tsx`
- `apps/frontend/src/components/training-plan-wizard.tsx`
- `apps/frontend/src/training/api-training-plan-gateway.ts`
- `apps/frontend/src/training/training-plan-provider.tsx`
- `apps/frontend/src/i18n/locales/pt-BR/common.json`
- `apps/frontend/src/i18n/locales/en-US/common.json`
- `apps/backend/src/modules/training/application/generate-training-plan.ts`
- `apps/backend/src/modules/training/application/generate-training-plan.test.ts`

## Tarefas

- [x] Adicionar testes RED de layout desktop, botao Google e feedback de geracao.
- [x] Centralizar login/cadastro/complete-profile em desktop.
- [x] Trocar botao Google para padrao com icone Google.
- [x] Densificar dashboard desktop e fazer CTA navegar para treino.
- [x] Melhorar feedback de geracao e mensagens de auth.
- [x] Rodar testes focados.
- [x] Validar fluxo real novamente com Supabase/IA.
- [x] Rodar verificacoes completas e reiniciar ambiente.
- [x] Revisar diff com subagente, corrigir P2 de i18n/auth e password no mock, e registrar P3 de soft timeout.

## Verificacao Esperada

```bash
npm run test:e2e -- --grep "desktop"
npm run test:e2e -- --grep "shows staged generation feedback"
npm run typecheck
npm test
npm run test:e2e
npm run build
```
