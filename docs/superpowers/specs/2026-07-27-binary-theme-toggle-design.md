# Binary Theme Toggle Design

## Context

O menu de configuracoes exibiu o estado `system` como uma opcao de tema. Esse
estado nao oferece uma acao clara para o usuario no produto atual e cria um
clique extra para alternar entre claro e escuro.

## Decision

O seletor de tema deve ser binario para usuarios finais:

- `dark`;
- `light`.

O app deve iniciar em `dark` quando nao houver preferencia salva. Valores legados
`system` encontrados em `localStorage` devem ser normalizados para `dark` na
inicializacao, sem mostrar `system` no botao e sem exigir uma acao manual do
usuario.

## User Experience

No menu de configuracoes, o botao de tema deve exibir o tema atual e alternar
diretamente:

- de `escuro` para `claro`;
- de `claro` para `escuro`.

O texto `sistema`/`system` nao deve aparecer como tema selecionavel.

## Testing

Adicionar cobertura E2E no menu de configuracoes para garantir que:

- o botao de tema nao renderiza `sistema` nem `system`;
- o primeiro clique muda para tema claro;
- o segundo clique volta para tema escuro.
