# Complete Profile Payload Fix

## Objetivo

Corrigir o erro `body must NOT have additional properties` ao salvar o perfil complementar depois de login social.

## Causa Raiz

`RegistrationProfileForm` inicializa `password: ''` mesmo no modo `complete`. O objeto inteiro e enviado para `completeRegistrationProfile`, chegando ao backend como propriedade extra no `PUT /api/auth/profile`. A rota documentada no OpenAPI usa `additionalProperties: false`, entao o Fastify rejeita o payload antes da regra de dominio.

## Abordagem

Manter o contrato REST estrito e ajustar o frontend para enviar `password` somente no fluxo de cadastro com senha (`mode="signup"`). O teste E2E/API do fluxo de perfil deve garantir que o payload enviado ao backend nao contenha `password`, prevenindo regressao no mesmo ponto de origem.

## Arquivos Afetados

- `apps/frontend/e2e/api-registration-profile-gateway.spec.ts`
- `apps/frontend/e2e/app-shell.spec.ts`
- `apps/frontend/src/auth/api-registration-profile-gateway.ts`

## Tarefas

- [x] Adicionar teste E2E/API que falhe quando `complete-profile` envia `password`.
- [x] Ajustar gateway/formulario para omitir `password` no modo `complete`.
- [x] Rodar teste E2E focado.
- [x] Rodar verificacoes relevantes.
- [x] Reiniciar servidores para validacao manual.

## Verificacao Esperada

```bash
npm run test:e2e -- api-registration-profile-gateway.spec.ts
npm run test:e2e -- --grep "requires missing registration data after a new Google login"
npm run typecheck
npm test
npm run test:e2e
```
