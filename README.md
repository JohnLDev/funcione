# Funcione

Plataforma de treinos personalizados gerados por IA. Composta por três servicos independentes orquestrados via Docker Compose.

---

## Stack

| Servico    | Tecnologia                          | Porta |
|------------|-------------------------------------|-------|
| Frontend   | React 19 + TypeScript + Vite / Nginx | 3000  |
| Backend    | Go + Gin + GORM + PostgreSQL        | 8080  |
| AI         | Python + FastAPI + LangChain + Gemini | 8001 |
| Banco      | PostgreSQL 16                       | 5432  |

---

## Estrutura do repositorio

```
funcione/
├── docker-compose.yml
├── frontend/          # React + Vite
├── backend/           # Go + Gin
└── ai/
    └── workout-generator/   # Python + FastAPI
```

---

## Rodando com Docker (recomendado)

### Pre-requisitos

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+

### 1. Variaveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as variaveis obrigatorias:

```bash
cp backend/.env.example .env
```

Edite o `.env` e preencha ao menos:

```env
# Obrigatorio — chave da API do Google Gemini
GEMINI_API_KEY=AIza...

# Segredos de producao
DB_PASSWORD=sua_senha_segura
JWT_SECRET=seu_secret_seguro

# Google OAuth (opcional — deixe vazio para desabilitar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> As demais variaveis ja possuem valores padrao definidos no `docker-compose.yml`.

### 2. Subir todos os servicos

```bash
docker compose up --build
```

Para rodar em segundo plano:

```bash
docker compose up -d --build
```

### 3. Acessar

| Servico          | URL                         |
|------------------|-----------------------------|
| Frontend         | http://localhost:3000       |
| Backend (API)    | http://localhost:8080       |
| AI (docs)        | http://localhost:8001/docs  |
| Health backend   | http://localhost:8080/health |
| Health AI        | http://localhost:8001/health |

> O Nginx do frontend ja faz proxy de `/api/*` para o backend, entao o browser nao precisa acessar a porta 8080 diretamente.

### Comandos uteis

```bash
# Ver logs de um servico especifico
docker compose logs -f backend

# Parar tudo
docker compose down

# Parar e remover o volume do banco
docker compose down -v

# Rebuildar apenas um servico
docker compose up --build backend
```

---

## Rodando manualmente (sem Docker)

### Pre-requisitos

- Node.js 22+
- Go 1.25+
- Python 3.12+
- PostgreSQL 14+ rodando localmente

---

### 1. Banco de dados

Crie o banco antes de subir o backend:

```sql
CREATE DATABASE funcione;
```

---

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edite .env com as credenciais do seu PostgreSQL local
```

```bash
go run ./cmd/api
```

O servidor sobe em `http://localhost:8080`. As migrations sao executadas automaticamente na inicializacao.

---

### 3. AI — Workout Generator

```bash
cd ai/workout-generator
cp .env.example .env
# Edite .env e preencha GEMINI_API_KEY
```

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Documentacao interativa disponivel em `http://localhost:8001/docs`.

---

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# .env ja vem com VITE_API_URL=http://localhost:8080
```

```bash
npm install
npm run dev
```

O servidor de desenvolvimento sobe em `http://localhost:5173`.

---

## Google OAuth (opcional)

Para habilitar o login com Google:

1. Acesse [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Crie um **OAuth 2.0 Client ID** do tipo "Web application"
3. Adicione a URI de redirect autorizada:
   - Com Docker: `http://localhost:3000/api/v1/auth/google/callback`
   - Sem Docker: `http://localhost:8080/api/v1/auth/google/callback`
4. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`
5. Ajuste `GOOGLE_REDIRECT_URL` conforme o ambiente

Se as variaveis estiverem vazias, o Google OAuth fica desabilitado e o restante da API funciona normalmente.

---

## Variaveis de ambiente — referencia completa

### Backend / raiz (`docker-compose.yml` ou `backend/.env`)

| Variavel                   | Descricao                                      | Padrao                                              |
|----------------------------|------------------------------------------------|-----------------------------------------------------|
| `PORT`                     | Porta do servidor HTTP                         | `8080`                                              |
| `FRONTEND_URL`             | URL do frontend (redirects OAuth)              | `http://localhost:3000`                             |
| `DB_HOST`                  | Host do PostgreSQL                             | `localhost` / `postgres` (Docker)                  |
| `DB_PORT`                  | Porta do PostgreSQL                            | `5432`                                              |
| `DB_USER`                  | Usuario do banco                               | `postgres`                                          |
| `DB_PASSWORD`              | Senha do banco                                 | —                                                   |
| `DB_NAME`                  | Nome do banco                                  | `funcione`                                          |
| `DB_SSLMODE`               | Modo SSL                                       | `disable`                                           |
| `JWT_SECRET`               | Chave para assinar tokens JWT                  | `change-me-in-production`                           |
| `JWT_EXPIRATION_HOURS`     | Expiracao do token (horas)                     | `24`                                                |
| `GOOGLE_CLIENT_ID`         | Client ID do Google OAuth                      | `""` (desabilitado)                                 |
| `GOOGLE_CLIENT_SECRET`     | Client Secret do Google OAuth                  | `""`                                                |
| `GOOGLE_REDIRECT_URL`      | URI de redirect cadastrada no Google Cloud     | `http://localhost:3000/api/v1/auth/google/callback` |
| `AI_WORKOUT_GENERATOR_URL` | URL do servico de IA                           | `http://localhost:8001` / `http://ai:8001` (Docker) |

### AI (`ai/workout-generator/.env`)

| Variavel             | Descricao                    | Padrao               |
|----------------------|------------------------------|----------------------|
| `GEMINI_API_KEY`     | Chave da API Google Gemini   | — (obrigatorio)      |
| `GEMINI_MODEL`       | Modelo Gemini a usar         | `gemini-2.0-flash`   |
| `GEMINI_TEMPERATURE` | Temperatura de geracao       | `0.7`                |
