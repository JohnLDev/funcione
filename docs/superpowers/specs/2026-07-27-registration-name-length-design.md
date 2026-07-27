# Registration Name Length Design

## Contexto

Os campos `Nome` e `Sobrenome` do cadastro nao possuem limite de tamanho no
frontend nem no contrato do backend. Isso permite entradas longas demais,
podendo degradar layout, persistencia e exibicao de perfil.

## Objetivo

Limitar `firstName` e `lastName` a 80 caracteres cada em todos os fluxos que
usam `RegistrationProfileForm`: cadastro por senha e completar perfil apos
login social.

## Decisoes

- O limite sera 80 caracteres por campo.
- O frontend usara `maxLength={80}` nos inputs de nome e sobrenome.
- O backend validara o mesmo limite em `CompleteUserProfileInputSchema`.
- O OpenAPI declarara `maxLength: 80` para `firstName` e `lastName`.
- A regra vale para `/signup` e `/complete-profile`, pois ambos submetem o
  mesmo perfil de cadastro.

## Testes

- E2E deve provar que os inputs de nome e sobrenome truncam entradas maiores que
  80 caracteres no fluxo `/complete-profile`.
- Teste de rota deve rejeitar payload com `firstName` ou `lastName` acima de 80
  caracteres.
- Teste de OpenAPI deve validar `maxLength: 80` nos dois campos.

