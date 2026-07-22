# Autenticacao

## Decisao

O sistema usa Supabase Auth como provedor unico de identidade.

Isso cobre:

- login por e-mail e senha;
- cadastro por e-mail e senha;
- login social com Google;
- sessao unificada para qualquer metodo de entrada.
- cadastro interno obrigatorio com dados do perfil Funcione.

O backend nao armazena senha, hash de senha ou segredo de OAuth. Senhas e hashes ficam sob responsabilidade do Supabase Auth. O frontend usa apenas chave publica/publishable, e nenhuma chave `service_role` deve ser exposta no navegador.

Dados vindos de `user_metadata`, como nome retornado pelo Google, podem ser usados apenas como sugestao de preenchimento. Eles nao devem ser usados para autorizacao.

## Fluxo

1. O frontend autentica com `@supabase/supabase-js`.
2. Login por senha usa `supabase.auth.signInWithPassword`.
3. Cadastro por senha usa `supabase.auth.signUp`.
4. Google usa `supabase.auth.signInWithOAuth({ provider: 'google' })`.
5. A sessao retornada possui `access_token`.
6. Chamadas protegidas para a REST API devem enviar `Authorization: Bearer <access_token>`.
7. O backend valida o token com `supabase.auth.getUser(token)`.
8. O frontend consulta `GET /api/auth/profile`.
9. Se o perfil interno nao existir, o app exibe o formulario obrigatorio antes de liberar o shell autenticado.

## Rotas Do Frontend

O frontend usa React Router em modo declarativo. As telas de autenticacao e
area interna devem existir como rotas reais para preservar historico do
navegador, deep links e navegacao de voltar.

Rotas atuais:

```txt
/login
/signup
/complete-profile
/dashboard
```

Comportamento esperado:

- `/` redireciona para `/login` quando nao existe sessao.
- `/login` exibe entrada por senha e Google.
- `/signup` exibe cadastro por senha com perfil interno obrigatorio.
- `/complete-profile` exige sessao e coleta dados faltantes de login social.
- `/dashboard` exige sessao e perfil interno completo.
- rotas publicas redirecionam usuarios autenticados para `/dashboard` ou
  `/complete-profile`, conforme o estado do perfil.
- rotas protegidas redirecionam usuarios sem sessao para `/login`.

## Cadastro Interno

Campos obrigatorios:

- nome;
- sobrenome;
- CPF;
- data de nascimento;
- numero de telefone;
- e-mail.

Para cadastro com senha, o formulario inicial tambem pede senha. A senha e enviada apenas ao Supabase Auth; o backend recebe somente o perfil.

Para login social com Google, se a conta autenticada ainda nao tem cadastro interno no Funcione, o app solicita apenas os dados faltantes. O e-mail autenticado e mantido como base do perfil.

## Variaveis

Backend:

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

E2E:

```bash
VITE_AUTH_MODE=mock
```

`VITE_AUTH_MODE=mock` existe apenas para testes automatizados. Ele evita chamadas externas reais e simula os mesmos estados de sessao usados pelo app.

## Google OAuth

No painel do Supabase, habilite o provider Google e configure o OAuth client do Google com:

- origem autorizada do app;
- URL de callback do projeto Supabase;
- redirect URL local durante desenvolvimento, como `http://localhost:5173`.

## Contrato REST

Rota adicionada:

```txt
GET /api/auth/me
```

Rotas de perfil:

```txt
GET /api/auth/profile
PUT /api/auth/profile
```

Headers:

```txt
Authorization: Bearer <access_token>
```

Respostas:

- `200`: usuario autenticado;
- `401`: token ausente, invalido ou expirado;
- `503`: Supabase Auth nao configurado no backend.

Para `PUT /api/auth/profile`:

- `200`: perfil salvo;
- `400`: payload invalido, CPF invalido, data futura ou e-mail diferente da conta autenticada;
- `401`: token ausente, invalido ou expirado;
- `503`: Supabase Auth nao configurado no backend.

O repositorio atual de perfil e in-memory para desenvolvimento/testes. A interface esta isolada para troca posterior por persistencia Supabase Postgres com RLS por usuario.

A rota e o security scheme `bearerAuth` devem aparecer em:

```txt
GET /documentation/json
```

## Referencias

- Supabase Auth Google: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Auth password login: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Supabase `getUser`: https://supabase.com/docs/reference/javascript/auth-getuser
