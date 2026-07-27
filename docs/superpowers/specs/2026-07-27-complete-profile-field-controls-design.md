# Complete Profile Field Controls Design

## Contexto

A tela `/complete-profile` reaproveita `RegistrationProfileForm`, mas hoje os
campos de CPF e telefone aceitam texto livre. O backend normaliza e valida os
valores, porem a experiencia permite digitar letras e nao orienta o usuario
durante o preenchimento. A tela tambem fica fora do `AppShell`, entao o botao de
sair disponivel no dashboard nao aparece quando o usuario autenticou com a conta
errada e ainda precisa completar o cadastro.

## Objetivo

Melhorar a experiencia do cadastro complementar sem alterar o contrato REST:
CPF e telefone devem aceitar somente digitos, exibir mascara durante a digitacao
e permitir sair da sessao antes de concluir o perfil.

## Decisoes

- CPF sera armazenado no estado do formulario com mascara `000.000.000-00`.
- Telefone sera armazenado no estado do formulario com mascara brasileira
  `(00) 00000-0000`.
- Antes de submeter, CPF e telefone serao enviados apenas com digitos.
- O telefone tera prefixo visual com bandeira do Brasil e `+55`.
- O prefixo `+55` e visual; o payload continuara usando os digitos nacionais
  para manter compatibilidade com dados e testes atuais.
- A mesma normalizacao vale para os modos `signup` e `complete`, pois ambos
  usam `RegistrationProfileForm`.
- `/complete-profile` recebera um botao `Sair` que usa o `signOut` existente em
  `AppRoutes` e redireciona para `/login` quando a saida for bem-sucedida.

## Testes

Adicionar cobertura E2E para:

- CPF ignora letras e exibe mascara.
- Telefone ignora letras, exibe mascara e mostra bandeira do Brasil com `+55`.
- Salvar o perfil continua armazenando CPF e telefone como digitos.
- O usuario consegue sair da tela `/complete-profile` e volta para `/login`.

