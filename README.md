# Funcione

Plataforma de treinos personalizados gerados por IA. Composta por três serviços independentes orquestrados via Docker Compose.

A geração de treinos utiliza o modelo **Llama 3.2 1B** executado localmente pelo **Docker Model Runner**, sem depender de APIs externas.

---

## Stack

| Serviço    | Tecnologia                                        | Porta |
|------------|---------------------------------------------------|-------|
| Frontend   | React 19 + TypeScript + Vite / Nginx              | 3000  |
| Backend    | Go + Gin + GORM + PostgreSQL                      | 8080  |
| AI         | Python + FastAPI + LangChain + Docker Model Runner | 8001  |
| Banco      | PostgreSQL 16                                     | 5432  |

---

## Estrutura do repositório

```
funcione/
├── docker-compose.yml
├── frontend/                # React + Vite
├── backend/                 # Go + Gin
└── ai/
    └── workout-generator/   # Python + FastAPI + LangChain
```

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.40+ com **Model Runner habilitado**
- [Docker Compose](https://docs.docker.com/compose/) v2+

### Habilitando o Docker Model Runner

1. Abra o Docker Desktop
2. Vá em **Settings → Features in development → Beta features**
3. Ative **Docker Model Runner**
4. Baixe o modelo necessário:

```bash
docker model pull ai/llama3.2:1B-Q4_0
```

Verifique se está rodando:

```bash
docker model status
docker model ls
```

---

## Rodando com Docker (recomendado)

### 1. Variáveis de ambiente

Copie os arquivos de exemplo:

```bash
cp backend/.env.example backend/.env
cp ai/workout-generator/.env.example ai/workout-generator/.env
```

Edite o `backend/.env` e preencha ao menos:

```env
# Segredos de produção
DB_PASSWORD=sua_senha_segura
JWT_SECRET=seu_secret_seguro

# Google OAuth (opcional — deixe vazio para desabilitar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> O serviço de IA não requer chaves de API — o modelo roda localmente via Docker Model Runner.

### 2. Subir todos os serviços

```bash
docker compose up --build
```

Para rodar em segundo plano:

```bash
docker compose up -d --build
```

### 3. Acessar

| Serviço          | URL                         |
|------------------|-----------------------------|
| Frontend         | http://localhost:3000       |
| Backend (API)    | http://localhost:8080       |
| AI (docs)        | http://localhost:8001/docs  |
| Health backend   | http://localhost:8080/health |
| Health AI        | http://localhost:8001/health |

> O Nginx do frontend já faz proxy de `/api/*` para o backend, então o browser não precisa acessar a porta 8080 diretamente.

### Comandos úteis

```bash
# Ver logs de um serviço específico
docker compose logs -f ai

# Parar tudo
docker compose down

# Parar e remover o volume do banco
docker compose down -v

# Rebuildar apenas um serviço
docker compose up --build ai
```

---

## Rodando manualmente (sem Docker)

### Pré-requisitos

- Node.js 22+
- Go 1.25+
- Python 3.12+
- PostgreSQL 14+ rodando localmente
- Docker Desktop com Model Runner habilitado (para o serviço de IA)

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

O servidor sobe em `http://localhost:8080`. As migrations são executadas automaticamente na inicialização.

---

### 3. AI — Workout Generator

```bash
cd ai/workout-generator
cp .env.example .env
```

O `.env` já vem configurado para acessar o Docker Model Runner localmente. Se estiver rodando fora do Docker, ajuste a URL:

```env
MODEL_RUNNER_BASE_URL=http://localhost:12434/engines/llama.cpp/v1
```

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Documentação interativa disponível em `http://localhost:8001/docs`.

---

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# .env já vem com VITE_API_URL=http://localhost:8080
```

```bash
npm install
npm run dev
```

O servidor de desenvolvimento sobe em `http://localhost:5173`.

---

## Docker Model Runner — Como funciona

O [Docker Model Runner](https://docs.docker.com/desktop/features/model-runner/) permite executar modelos de IA localmente, integrado ao Docker Desktop. Ele expõe uma **API compatível com OpenAI** que o serviço de IA consome via LangChain.

**Arquitetura:**

```
Frontend → Backend (Go) → AI Service (FastAPI/LangChain) → Docker Model Runner (Llama 3.2)
```

- O serviço AI usa `langchain-openai` (`ChatOpenAI`) apontando para o endpoint do Model Runner
- Dentro de containers Docker, o Model Runner é acessível via `http://model-runner.docker.internal`
- Fora de containers (dev local), use `http://localhost:12434`
- Não requer chave de API — o modelo roda 100% local

**Modelo utilizado:** `ai/llama3.2:1B-Q4_0` (Llama 3.2, 1B parâmetros, quantização Q4_0, ~728 MB)

---

## Google OAuth (opcional)

Para habilitar o login com Google:

1. Acesse [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Crie um **OAuth 2.0 Client ID** do tipo "Web application"
3. Adicione a URI de redirect autorizada:
   - Com Docker: `http://localhost:3000/api/v1/auth/google/callback`
   - Sem Docker: `http://localhost:8080/api/v1/auth/google/callback`
4. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `backend/.env`
5. Ajuste `GOOGLE_REDIRECT_URL` conforme o ambiente

Se as variáveis estiverem vazias, o Google OAuth fica desabilitado e o restante da API funciona normalmente.

---

## Variáveis de ambiente — referência completa

### Backend (`backend/.env`)

| Variável                   | Descrição                                      | Padrão                                              |
|----------------------------|------------------------------------------------|-----------------------------------------------------|
| `PORT`                     | Porta do servidor HTTP                         | `8080`                                              |
| `FRONTEND_URL`             | URL do frontend (redirects OAuth)              | `http://localhost:3000`                             |
| `DB_HOST`                  | Host do PostgreSQL                             | `localhost` / `postgres` (Docker)                  |
| `DB_PORT`                  | Porta do PostgreSQL                            | `5432`                                              |
| `DB_USER`                  | Usuário do banco                               | `postgres`                                          |
| `DB_PASSWORD`              | Senha do banco                                 | —                                                   |
| `DB_NAME`                  | Nome do banco                                  | `funcione`                                          |
| `DB_SSLMODE`               | Modo SSL                                       | `disable`                                           |
| `JWT_SECRET`               | Chave para assinar tokens JWT                  | `change-me-in-production`                           |
| `JWT_EXPIRATION_HOURS`     | Expiração do token (horas)                     | `24`                                                |
| `GOOGLE_CLIENT_ID`         | Client ID do Google OAuth                      | `""` (desabilitado)                                 |
| `GOOGLE_CLIENT_SECRET`     | Client Secret do Google OAuth                  | `""`                                                |
| `GOOGLE_REDIRECT_URL`      | URI de redirect cadastrada no Google Cloud     | `http://localhost:3000/api/v1/auth/google/callback` |
| `AI_WORKOUT_GENERATOR_URL` | URL do serviço de IA                           | `http://localhost:8001` / `http://ai:8001` (Docker) |

### AI (`ai/workout-generator/.env`)

| Variável                   | Descrição                              | Padrão                                                        |
|----------------------------|----------------------------------------|---------------------------------------------------------------|
| `MODEL_RUNNER_BASE_URL`    | URL da API do Docker Model Runner      | `http://model-runner.docker.internal/engines/llama.cpp/v1`    |
| `MODEL_RUNNER_MODEL`       | Modelo a utilizar                      | `ai/llama3.2:1B-Q4_0`                                        |
| `MODEL_RUNNER_TEMPERATURE` | Temperatura de geração                 | `0.7`                                                         |
