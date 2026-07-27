# Google-Only Authentication Design

## Contexto

O Funcione usa Supabase Auth como provedor unico de identidade. O frontend ja
tem suporte a login por senha, cadastro por senha e login social com Google,
alem do cadastro interno obrigatorio apos autenticacao.

Neste momento o produto deve aceitar apenas login social com Google. Os
componentes e gateways de senha devem ser preservados para reativacao simples no
futuro.

## Objetivo

Desativar a entrada por e-mail e senha na experiencia atual, mantendo Google
como unico metodo visivel de autenticacao e preservando o codigo de senha atras
de uma configuracao local simples.

## Decisoes

- A abordagem aprovada e uma flag de frontend para controlar a disponibilidade
  de autenticacao por senha.
- O valor atual da flag sera `false`.
- Com senha desativada, `/login` exibe somente o botao de Google.
- Com senha desativada, `/signup` redireciona para `/login`.
- Os metodos `signInWithPassword` e `signUpWithPassword` permanecem nos
  gateways e no provider.
- Os componentes de formulario permanecem no codigo e voltam a aparecer quando a
  flag for reativada.
- O backend nao muda nesta etapa.
- A configuracao do Supabase Dashboard tambem deve manter e-mail/senha
  desabilitado em producao, mas esta entrega cobre a experiencia do app.

## Fluxo Do Usuario

### Usuario sem sessao

1. Usuario acessa `/` e e redirecionado para `/login`.
2. `/login` mostra o titulo de entrada e o botao "Continuar com Google".
3. Usuario clica em Google.
4. Supabase inicia `signInWithOAuth({ provider: 'google' })`.
5. Apos sessao valida, o app segue o fluxo existente:
   - se o perfil interno estiver completo, vai para `/dashboard`;
   - se estiver incompleto, vai para `/complete-profile`.

### Rota de cadastro por senha

1. Usuario acessa `/signup` diretamente.
2. Como senha esta desativada, o app redireciona para `/login`.

## Arquitetura

Criar uma configuracao pequena no frontend, por exemplo
`apps/frontend/src/auth/auth-options.ts`, exportando:

```ts
export const authOptions = {
  passwordAuthEnabled: false,
} as const;
```

`AuthScreen` passa a renderizar os controles de senha somente quando
`authOptions.passwordAuthEnabled` for `true`.

`AppRoutes` usa a mesma configuracao para decidir se `/signup` renderiza
`AuthScreen mode="signup"` ou redireciona para `/login`.

## Testes

Atualizar os E2E principais para cobrir:

- `/login` nao mostra campos de e-mail e senha quando senha esta desativada.
- `/login` nao mostra link de criar conta quando senha esta desativada.
- `/signup` redireciona para `/login`.
- login com Google continua levando usuario novo para completar perfil.

O teste antigo de cadastro por senha deve deixar de representar o comportamento
atual e ser removido ou substituido por um teste de preservacao do shell usando
Google.

## Documentacao

Atualizar `docs/authentication.md` para refletir o estado atual:

- Supabase Auth continua sendo o provedor unico.
- Google e o unico metodo habilitado no app atualmente.
- Senha permanece implementada, mas escondida por flag para reativacao futura.
