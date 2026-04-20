# Funcione — Backend API

REST API em Go para o projeto Funcione. Responsável por autenticação de usuários (email/senha e Google OAuth) e gerenciamento de treinos personalizados gerados por IA.

---

## Stack

- **Go 1.21+**
- **Gin** — HTTP router
- **GORM + PostgreSQL** — ORM e banco de dados
- **golang-jwt/jwt v5** — Tokens JWT (HS256)
- **bcrypt** — Hash de senhas
- **golang.org/x/oauth2** — Google OAuth 2.0
- **godotenv** — Variáveis de ambiente via `.env`

---

## Configuração

### 1. Pré-requisitos

- Go 1.21 ou superior
- PostgreSQL rodando e acessível
- Serviço de IA (`ai/workout-generator`) rodando (para geração de treinos)
- (Opcional) Credenciais de um projeto no [Google Cloud Console](https://console.cloud.google.com/) para Google OAuth

### 2. Variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

| Variável                    | Descrição                                         | Padrão                                                 |
|-----------------------------|---------------------------------------------------|--------------------------------------------------------|
| `PORT`                      | Porta do servidor HTTP                            | `8080`                                                 |
| `FRONTEND_URL`              | URL base do frontend (usado nos redirects OAuth)  | `http://localhost:3000`                                |
| `DB_HOST`                   | Host do PostgreSQL                                | `localhost`                                            |
| `DB_PORT`                   | Porta do PostgreSQL                               | `5432`                                                 |
| `DB_USER`                   | Usuário do banco                                  | `postgres`                                             |
| `DB_PASSWORD`               | Senha do banco                                    | —                                                      |
| `DB_NAME`                   | Nome do banco                                     | `funcione`                                             |
| `DB_SSLMODE`                | Modo SSL do PostgreSQL                            | `disable`                                              |
| `JWT_SECRET`                | Chave secreta para assinar o JWT                  | `change-me-in-production`                              |
| `JWT_EXPIRATION_HOURS`      | Tempo de expiração do token (em horas)            | `24`                                                   |
| `GOOGLE_CLIENT_ID`          | Client ID do projeto no Google Cloud              | `""` (Google OAuth desabilitado)                       |
| `GOOGLE_CLIENT_SECRET`      | Client Secret do projeto no Google Cloud          | `""`                                                   |
| `GOOGLE_REDIRECT_URL`       | URI de redirect cadastrada no Google Cloud        | `http://localhost:8080/api/v1/auth/google/callback`    |
| `AI_WORKOUT_GENERATOR_URL`  | URL base do serviço de IA de treinos              | `http://localhost:8001`                                |

### 3. Configurar Google OAuth (opcional)

1. Acesse [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Crie um **OAuth 2.0 Client ID** do tipo "Web application"
3. Adicione a URI de redirect autorizada: `http://localhost:8080/api/v1/auth/google/callback`
4. Copie o Client ID e o Client Secret para o `.env`

Se `GOOGLE_CLIENT_ID` estiver vazio, os endpoints `/auth/google` retornam erro — o restante da API continua funcionando normalmente.

### 4. Rodar o servidor

```bash
cd backend
go run ./cmd/api
```

O servidor sobe na porta definida em `PORT` (padrão: `8080`).
As migrations do banco são executadas automaticamente na inicialização.

> **Nota sobre migrations:** O model `User` foi atualizado com os campos `provider` e `google_id`, e `password` passou a ser nullable. Se você já tem uma tabela `users` existente, execute o comando abaixo para aplicar as alterações manualmente antes de reiniciar o servidor:
> ```sql
> ALTER TABLE users
>   ADD COLUMN IF NOT EXISTS provider VARCHAR DEFAULT 'local' NOT NULL,
>   ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE,
>   ALTER COLUMN password DROP NOT NULL;
> ```

---

## Base URL

```
http://localhost:8080
```

Todos os endpoints da API ficam sob o prefixo `/api/v1`.

---

## Autenticação

A API suporta dois métodos de autenticação. Ambos retornam um **Bearer Token JWT** com o mesmo formato.

### Método 1 — Email / Senha (registro direto)

Fluxo local, sem dependência de terceiros.

### Método 2 — Google OAuth

Fluxo baseado em browser redirect. O frontend direciona o usuário para `/api/v1/auth/google` e, após a autenticação no Google, recebe o JWT via redirect para `FRONTEND_URL/auth/callback?token=<jwt>`.

**Vinculação automática de contas:** se o e-mail retornado pelo Google já estiver cadastrado com email/senha, o Google ID é vinculado automaticamente à conta existente. O usuário passa a poder entrar com qualquer um dos dois métodos.

---

## Padrão de resposta

### Sucesso

```json
{
  "success": true,
  "message": "mensagem descritiva",
  "data": { }
}
```

### Erro

```json
{
  "success": false,
  "error": "descrição do erro"
}
```

---

## Endpoints

### Health Check

```
GET /health
```

**Resposta — 200 OK**

```json
{ "status": "ok" }
```

---

## Autenticação

### POST /api/v1/auth/register

Cria um novo usuário com email/senha e retorna um JWT.

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "name":     "João Silva",
  "email":    "joao@exemplo.com",
  "password": "minhasenha123"
}
```

| Campo      | Tipo   | Obrigatório | Validação               |
|------------|--------|-------------|-------------------------|
| `name`     | string | sim         | mínimo 2 caracteres     |
| `email`    | string | sim         | formato de email válido |
| `password` | string | sim         | mínimo 6 caracteres     |

**Resposta — 201 Created**

```json
{
  "success": true,
  "message": "user registered successfully",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id":         1,
      "name":       "João Silva",
      "email":      "joao@exemplo.com",
      "provider":   "local",
      "created_at": "2026-04-07T12:00:00Z",
      "updated_at": "2026-04-07T12:00:00Z"
    }
  }
}
```

| Status | Condição                     |
|--------|------------------------------|
| `400`  | Campos inválidos ou ausentes |
| `409`  | Email já cadastrado          |
| `500`  | Erro interno                 |

---

### POST /api/v1/auth/login

Autentica um usuário com email/senha e retorna um JWT.

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "email":    "joao@exemplo.com",
  "password": "minhasenha123"
}
```

**Resposta — 200 OK**

```json
{
  "success": true,
  "message": "login successful",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id":         1,
      "name":       "João Silva",
      "email":      "joao@exemplo.com",
      "provider":   "local",
      "created_at": "2026-04-07T12:00:00Z",
      "updated_at": "2026-04-07T12:00:00Z"
    }
  }
}
```

| Status | Condição                                                        |
|--------|-----------------------------------------------------------------|
| `400`  | Campos inválidos, ou conta cadastrada via Google sem senha      |
| `401`  | Email ou senha incorretos                                       |
| `500`  | Erro interno                                                    |

---

### GET /api/v1/auth/google

Inicia o fluxo OAuth com o Google. O frontend deve **redirecionar o browser** para esta URL (não é uma chamada AJAX).

**Resposta — 307 Temporary Redirect**

Redireciona para a página de autenticação do Google.

| Status | Condição                          |
|--------|-----------------------------------|
| `307`  | Redirect para o Google            |
| `500`  | Google OAuth não configurado      |

---

### GET /api/v1/auth/google/callback

Endpoint interno utilizado pelo Google como redirect URI. Não deve ser chamado diretamente pelo frontend.

**Fluxo interno:**

1. Valida o parâmetro `state` contra o cookie `oauth_state` (proteção CSRF)
2. Troca o `code` pelo access token do Google
3. Busca as informações do usuário no Google (email, nome)
4. Encontra ou cria o usuário no banco
5. Gera um JWT e redireciona para `FRONTEND_URL/auth/callback?token=<jwt>`

**Em caso de erro** redireciona para `FRONTEND_URL/auth/error?message=<descrição>`

---

### GET /api/v1/profile

Retorna os dados do usuário autenticado. **Requer JWT.**

**Headers**

```
Authorization: Bearer <token>
```

**Resposta — 200 OK**

```json
{
  "success": true,
  "message": "profile retrieved",
  "data": {
    "id":         1,
    "name":       "João Silva",
    "email":      "joao@exemplo.com",
    "provider":   "google",
    "created_at": "2026-04-07T12:00:00Z",
    "updated_at": "2026-04-07T12:00:00Z"
  }
}
```

| Status | Condição                              |
|--------|---------------------------------------|
| `401`  | Token ausente, inválido ou expirado   |
| `500`  | Erro interno                          |

---

## Treinos

Todos os endpoints de treino **requerem JWT**.

### POST /api/v1/workouts/generate

Solicita a geração de um novo treino personalizado via IA.

**Regra de cooldown:** cada usuário pode gerar no máximo **1 treino por semana**.

**Headers**

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**

```json
{
  "age":             28,
  "weight_kg":       75.0,
  "height_cm":       178.0,
  "fitness_level":   "intermediate",
  "goal":            "muscle_gain",
  "days_per_week":   4,
  "equipment":       "dumbbells",
  "restrictions":    "mild lower back pain",
  "additional_info": "Prefer morning workouts, about 60 minutes each"
}
```

| Campo            | Tipo    | Obrigatório | Valores aceitos                                                                     |
|------------------|---------|-------------|-------------------------------------------------------------------------------------|
| `age`            | integer | sim         | 10 – 100                                                                            |
| `weight_kg`      | float   | sim         | maior que 0                                                                         |
| `height_cm`      | float   | sim         | maior que 0                                                                         |
| `fitness_level`  | string  | sim         | `beginner` · `intermediate` · `advanced`                                            |
| `goal`           | string  | sim         | `weight_loss` · `muscle_gain` · `endurance` · `flexibility` · `general_fitness`     |
| `days_per_week`  | integer | sim         | 1 – 7                                                                               |
| `equipment`      | string  | sim         | `none` · `dumbbells` · `barbell` · `resistance_bands` · `pull_up_bar` · `full_gym`  |
| `restrictions`   | string  | não         | Lesões ou limitações físicas                                                        |
| `additional_info`| string  | não         | Duração de sessão, estilo preferido, etc.                                           |

**Resposta — 201 Created**

```json
{
  "success": true,
  "message": "workout generated successfully",
  "data": {
    "id":      1,
    "user_id": 1,
    "profile": { "age": 28, "weight_kg": 75.0, "..." : "..." },
    "plan": {
      "title":           "4-Day Hypertrophy Plan — Dumbbells",
      "overview":        "...",
      "weekly_schedule": [ { "..." : "..." } ],
      "general_tips":    [ "..." ],
      "nutrition_notes": "..."
    },
    "created_at": "2026-04-07T12:00:00Z",
    "updated_at": "2026-04-07T12:00:00Z"
  }
}
```

**Cooldown ativo — 429 Too Many Requests**

```json
{
  "success":           false,
  "error":             "you can only generate a new workout once per week",
  "next_available_at": "2026-04-14T12:00:00Z"
}
```

| Status | Condição                                                |
|--------|---------------------------------------------------------|
| `400`  | Campos inválidos ou ausentes                            |
| `401`  | Token ausente, inválido ou expirado                     |
| `429`  | Cooldown ativo (menos de 7 dias desde o último treino)  |
| `500`  | Erro interno ou falha no serviço de IA                  |

---

### GET /api/v1/workouts

Lista todos os treinos do usuário (resumo sem o plano completo).

**Headers**

```
Authorization: Bearer <token>
```

**Resposta — 200 OK**

```json
{
  "success": true,
  "message": "workouts retrieved",
  "data": [
    {
      "id":         2,
      "user_id":    1,
      "title":      "4-Day Hypertrophy Plan — Dumbbells",
      "overview":   "An upper/lower split...",
      "created_at": "2026-04-07T12:00:00Z"
    }
  ]
}
```

---

### GET /api/v1/workouts/latest

Retorna o treino mais recente com o plano completo.

**Headers**

```
Authorization: Bearer <token>
```

**Resposta — 200 OK** — mesmo shape que `POST /workouts/generate`

| Status | Condição         |
|--------|------------------|
| `404`  | Nenhum treino    |

---

### GET /api/v1/workouts/:id

Retorna um treino específico pelo ID.

**Headers**

```
Authorization: Bearer <token>
```

**Resposta — 200 OK** — mesmo shape que `POST /workouts/generate`

| Status | Condição              |
|--------|-----------------------|
| `400`  | ID inválido           |
| `404`  | Treino não encontrado |

---

## Estrutura do JWT

```json
{
  "user_id": 1,
  "email":   "joao@exemplo.com",
  "exp":     1744142400,
  "iat":     1744056000,
  "sub":     "1"
}
```

---

## CORS

A API aceita requisições de qualquer origem (`*`).  
Headers permitidos: `Origin`, `Content-Type`, `Accept`, `Authorization`.

---

## Modelos de dados

### Tabela `users`

```
id          SERIAL PRIMARY KEY
name        VARCHAR NOT NULL
email       VARCHAR UNIQUE NOT NULL
password    VARCHAR                        -- nullable para usuários Google-only
provider    VARCHAR NOT NULL DEFAULT 'local'  -- 'local' | 'google'
google_id   VARCHAR UNIQUE                 -- nullable para usuários locais
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### Tabela `workouts`

```
id            SERIAL PRIMARY KEY
user_id       INTEGER NOT NULL REFERENCES users(id)
profile_json  TEXT NOT NULL
plan_json     TEXT NOT NULL
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

---

## Guia de integração para o frontend

### Fluxo de registro / login com email/senha

```
POST /api/v1/auth/register   ou   POST /api/v1/auth/login
  → salvar token (localStorage ou cookie httpOnly)
  → redirecionar para a tela principal
```

### Fluxo de login com Google

```
1. Frontend redireciona o browser para GET /api/v1/auth/google
2. Usuário autoriza no Google
3. Backend redireciona para FRONTEND_URL/auth/callback?token=<jwt>
4. Frontend lê o token da query string e salva
5. Frontend redireciona para a tela principal
```

Implementação no frontend (exemplo):

```js
// Iniciar login com Google
window.location.href = 'http://localhost:8080/api/v1/auth/google';

// Na página /auth/callback
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
if (token) {
  localStorage.setItem('token', token);
  // redirecionar para home
}

// Na página /auth/error
const message = new URLSearchParams(window.location.search).get('message');
// exibir mensagem de erro para o usuário
```

### Requisições autenticadas

```
Authorization: Bearer <token salvo>
```

### Tratamento de erros por status HTTP

| Status | Ação recomendada no frontend                           |
|--------|--------------------------------------------------------|
| `400`  | Exibir mensagem de validação                           |
| `401`  | Limpar token e redirecionar para login                 |
| `404`  | Informar que o recurso não foi encontrado              |
| `409`  | Email já cadastrado                                    |
| `429`  | Mostrar contador até `next_available_at`               |
| `500`  | Mensagem genérica de erro                              |

---

## Estrutura do projeto

```
backend/
├── cmd/api/
│   └── main.go                   # Entry point
├── internal/
│   ├── auth/
│   │   ├── handler.go            # Register, Login, Profile, GoogleLogin, GoogleCallback
│   │   ├── service.go            # Regras de negócio, JWT, Google OAuth
│   │   └── repository.go         # Queries na tabela users
│   ├── workout/
│   │   ├── handler.go
│   │   ├── service.go            # Cooldown + chamada ao serviço de IA
│   │   └── repository.go
│   ├── middleware/
│   │   └── auth.go               # Middleware JWT
│   ├── models/
│   │   ├── user.go               # User com provider + google_id
│   │   └── workout.go
│   └── database/
│       └── postgres.go
├── pkg/
│   ├── config/
│   │   └── config.go             # ServerConfig, GoogleConfig, AIConfig, etc.
│   └── response/
│       └── response.go
├── .env.example
└── go.mod
```
