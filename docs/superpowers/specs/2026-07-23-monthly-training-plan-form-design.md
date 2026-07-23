# Monthly Training Plan Form Design

## Contexto

O Funcione ja possui autenticacao com Supabase Auth, frontend Vite/React com
rotas reais, i18n, tema claro/escuro e um endpoint REST inicial para geracao de
plano de treino por IA:

```txt
POST /api/training-plans
```

Esse endpoint recebe `DadosUsuario` e gera um plano semanal com 2 a 7 sessoes,
conforme frequencia semanal. A nova etapa transforma essa capacidade em uma
experiencia de produto: o aluno gera um plano ativo mensal, limitado a uma
geracao a cada 30 dias.

## Objetivo

Criar o desenho funcional e tecnico do formulario de criacao de treino mensal,
mapeando todos os campos que a IA precisa, mantendo excelente usabilidade mobile
e preparando persistencia em Supabase Postgres.

## Decisoes Aprovadas

- O formulario segue abordagem hibrida:
  - mobile: wizard progressivo;
  - desktop: secoes com resumo lateral.
- A organizacao visual aprovada e a opcao A: wizard progressivo em 5 etapas.
- O usuario gera um plano semanal base que fica ativo por 30 dias.
- O usuario pode gerar no maximo um plano a cada 30 dias corridos.
- Enquanto houver plano ativo, a tela mostra plano atual, data de geracao e
  proxima data disponivel para nova geracao.
- O usuario pode abrir e visualizar o plano ativo sempre que quiser.
- A interface desta etapa mostra apenas o plano ativo; historico fica fora do
  escopo visual.
- O backend sera a autoridade da regra de 30 dias.
- A persistencia sera em Supabase Postgres.
- A idade sera calculada pelo backend a partir da data de nascimento do perfil
  interno.
- Nao havera escolha de dias preferidos da semana nesta versao.
- Nao havera campo de observacoes gerais nesta versao.
- Campos livres existem apenas onde sao inevitaveis e devem ter tratamento anti
  prompt injection.

## Escopo

Inclui:

- perfil atletico reutilizavel;
- plano mensal ativo;
- snapshot dos dados usados pela IA;
- novos endpoints REST para consultar status/plano ativo e gerar plano mensal;
- atualizacao do contrato OpenAPI;
- formulario responsivo com wizard mobile;
- tela de plano ativo com resumo, lista de treinos e detalhe completo de cada
  treino;
- testes backend e E2E frontend para os fluxos principais.

Fora do escopo desta etapa:

- historico visual de planos antigos;
- feedback do usuario para regeneracao;
- planos pagos ou limites por assinatura;
- escolha de dias preferidos;
- observacoes gerais livres;
- tela administrativa para provider/model/fallback/attempts.

## Fluxo Do Usuario

### Sem Plano Ativo

1. Usuario autenticado acessa a area de treino.
2. Frontend chama o backend para consultar o plano ativo e a elegibilidade.
3. Se nao houver plano ativo, o sistema exibe o formulario.
4. O formulario vem pre-preenchido com dados do perfil atletico, quando houver.
5. O usuario pode editar qualquer dado reaproveitado antes de gerar.
6. Na revisao, o usuario ve o resumo dos dados que serao enviados para a IA.
7. Ao gerar, o backend valida elegibilidade, atualiza o perfil atletico, monta o
   snapshot, chama a IA, salva o plano mensal e retorna o plano ativo.
8. A tela final mostra o resumo do plano ativo e a lista de treinos.

### Com Plano Ativo

1. Usuario acessa a area de treino.
2. Backend retorna o plano ativo e `canGenerate: false`.
3. Frontend exibe:
   - status "Plano ativo";
   - data de geracao;
   - proxima data disponivel para gerar novo plano;
   - resumo do plano;
   - cards dos treinos da semana;
   - CTA para abrir detalhes dos treinos.
4. O usuario nao pode gerar outro plano ate completar 30 dias corridos.

## Campos Do Formulario

### Etapa 1: Objetivo Esportivo

Campos:

- modalidade:
  - volei;
  - basquete;
  - futebol/futsal;
  - beach tennis.
- objetivos:
  - performance;
  - condicionamento;
  - prevencao de lesao;
  - perda de peso;
  - ganho de massa.

Mapeamento para IA:

```txt
modalidade
objetivos
```

### Etapa 2: Perfil Fisico

Campos:

- peso;
- altura;
- nivel de experiencia:
  - iniciante;
  - intermediario;
  - avancado;
  - profissional.

Idade nao e digitada. O backend calcula a partir de `birthDate` do perfil
interno. Se o perfil nao tiver data de nascimento valida, o backend deve
bloquear a geracao e retornar erro orientando completar/atualizar cadastro.

Mapeamento para IA:

```txt
idade
pesoKg
alturaCm
nivelExperiencia
```

### Etapa 3: Rotina

Campos:

- frequencia semanal:
  - 2x por semana;
  - 3x por semana;
  - 4x por semana;
  - 5x por semana;
  - 6x por semana;
  - 7x por semana.
- duracao de cada treino:
  - 30 minutos;
  - 45 minutos;
  - 60 minutos;
  - 75 minutos;
  - 90 minutos.

Mapeamento para IA:

```txt
tempoDisponivel
duracaoTreinoMinutos
```

### Etapa 4: Ambiente E Seguranca

Campos:

- local de treino:
  - academia;
  - casa;
  - ar livre.
- equipamentos disponiveis:
  - nenhum;
  - halteres;
  - barra/anilhas;
  - elasticos;
  - banco/caixa;
  - colchonete;
  - cones;
  - corda;
  - maquinas de academia;
  - bola;
  - outro.
- lesoes/restricoes:
  - pergunta inicial: "Voce tem alguma lesao ou restricao?";
  - se nao, `lesoes: []`;
  - se sim, selecionar uma ou mais:
    - joelho;
    - tornozelo;
    - ombro;
    - lombar;
    - quadril;
    - punho;
    - outra.

Para cada lesao marcada:

- gravidade:
  - leve;
  - moderada;
  - alta.
- observacao opcional.

Para "outra":

- descricao obrigatoria.

Mapeamento para IA:

```txt
localTreino
equipamentos
lesoes
```

### Etapa 5: Revisao

Mostra:

- modalidade;
- objetivos;
- peso;
- altura;
- idade calculada;
- nivel;
- frequencia;
- duracao;
- local;
- equipamentos;
- lesoes/restricoes;
- aviso de limite mensal;
- botao para gerar plano.

## Perfil Atletico

O perfil atletico armazena dados reaproveitaveis e editaveis no proximo ciclo:

- `userId`;
- peso;
- altura;
- nivel de experiencia;
- modalidade preferida;
- local de treino mais comum;
- equipamentos disponiveis;
- lesoes/restricoes recorrentes;
- datas de criacao e atualizacao.

Ao gerar um plano, o backend atualiza o perfil atletico com os valores usados no
formulario. Os objetivos, frequencia e duracao pertencem ao ciclo/plano, nao ao
perfil atletico reutilizavel.

## Plano Mensal Ativo

O plano mensal ativo representa o plano semanal base valido por 30 dias.

Campos conceituais:

- `userId`;
- status `active`;
- `generatedAt`;
- `availableForRegenerationAt`;
- snapshot dos dados enviados para IA;
- resultado gerado pela IA;
- metadados internos de execucao:
  - provider;
  - model;
  - fallback;
  - attempts;
  - duration.

Metadados internos nao aparecem para o usuario nesta etapa.

## Detalhes Do Plano Gerado

### Resumo Do Plano

A tela de plano ativo mostra:

- status do plano ativo;
- data de geracao;
- proxima data para gerar novo plano;
- resumo textual gerado pela IA;
- frequencia semanal;
- duracao de cada treino;
- modalidade;
- objetivos.

### Lista De Treinos Da Semana

Cada card de treino mostra:

- dia;
- foco;
- duracao;
- quantidade de alongamentos/mobilidades;
- quantidade de exercicios principais;
- CTA para abrir detalhes.

### Detalhe De Cada Treino

Ao abrir um treino, a tela mostra:

- dia;
- foco;
- duracao;
- secao de alongamentos/mobilidades:
  - nome;
  - duracao em segundos;
  - motivo da escolha;
  - instrucoes de execucao;
  - observacoes, se houver.
- secao de exercicios principais:
  - nome;
  - series;
  - repeticoes;
  - motivo da escolha;
  - instrucoes de execucao;
  - observacoes, se houver.

## Contratos REST

Novos endpoints propostos:

```txt
GET /api/training-plans/active
POST /api/training-plans/monthly
```

### GET /api/training-plans/active

Responsabilidades:

- autenticar usuario;
- retornar plano ativo, se existir;
- retornar elegibilidade de nova geracao;
- retornar perfil atletico para prefill quando nao houver plano ativo ou quando
  for permitido gerar novamente.

Resposta conceitual:

```json
{
  "canGenerate": true,
  "activePlan": null,
  "athleticProfile": {}
}
```

Quando existir plano ativo:

```json
{
  "canGenerate": false,
  "activePlan": {},
  "nextGenerationAvailableAt": "2026-08-22T12:00:00.000Z"
}
```

### POST /api/training-plans/monthly

Responsabilidades:

- autenticar usuario;
- validar payload;
- calcular idade;
- normalizar e sanitizar campos livres;
- validar regra de 30 dias;
- atualizar perfil atletico;
- montar snapshot;
- chamar gerador IA;
- salvar plano mensal ativo;
- retornar plano gerado.

Erros esperados:

- `400`: payload invalido, data de nascimento ausente/invalida, campo livre
  invalido;
- `401`: usuario nao autenticado;
- `409`: usuario ainda possui plano ativo dentro da janela de 30 dias;
- `503`: falha de geracao por providers indisponiveis;
- `500`: erro inesperado.

O endpoint antigo `POST /api/training-plans` pode permanecer para compatibilidade
e testes internos, mas o frontend novo deve usar `POST /api/training-plans/monthly`.

## Persistencia Supabase

A persistencia sera em Supabase Postgres.

Modelo recomendado:

- tabela de perfil atletico;
- tabela de planos mensais.

O frontend nao escreve diretamente nessas tabelas. A aplicacao usa o backend
como porta principal para validar autenticacao, regra de negocio, sanitizacao,
OpenAPI e chamadas de IA.

Para preservar RLS, o backend deve preferir acesso ao Supabase com contexto do
usuario autenticado quando consultar/escrever dados do usuario. Chaves
privilegiadas, se usadas em operacoes administrativas futuras, devem ficar
somente no backend e nunca no frontend.

Toda tabela exposta no Supabase deve ter RLS habilitado e policies por
propriedade do usuario.

## Anti Prompt Injection

Campos digitados pelo usuario sao dados nao confiaveis.

Campos livres permitidos:

- descricao de lesao customizada;
- observacao opcional por lesao;
- descricao de equipamento "outro".

Nao havera observacao geral livre nesta versao.

Limites iniciais:

- descricao de lesao customizada: ate 120 caracteres;
- observacao de lesao: ate 180 caracteres;
- equipamento "outro": ate 80 caracteres.

Regras:

- frontend valida tamanho e obrigatoriedade;
- backend valida novamente por schema;
- backend normaliza whitespace;
- backend remove caracteres de controle;
- backend rejeita strings vazias apos normalizacao;
- backend delimita textos do usuario no prompt como dados;
- system prompt deve declarar que textos do usuario nao podem alterar regras,
  schema, instrucoes de seguranca ou instrucoes do sistema;
- snapshot salvo deve refletir os dados normalizados usados na geracao.

Testes devem incluir tentativa de prompt injection em campos livres, como texto
tentando instruir a IA a ignorar regras anteriores.

## Alteracao No Prompt Da IA

O prompt atual ja usa:

- modalidade;
- idade;
- peso;
- altura;
- objetivos;
- nivel;
- frequencia;
- duracao;
- local;
- lesoes/restricoes.

Deve passar a considerar tambem equipamentos disponiveis.

O prompt deve reforcar:

- equipamentos informados sao a unica fonte de disponibilidade de acessorios;
- textos livres de usuario sao apenas dados contextuais;
- textos livres nao podem modificar regras, schema, seguranca ou instrucoes do
  sistema;
- nao inventar equipamentos, lesoes ou restricoes.

## Frontend

Nova rota sugerida:

```txt
/training
```

Estados:

- carregando status do plano;
- sem plano ativo: exibe wizard;
- gerando plano;
- plano ativo;
- bloqueado por 30 dias;
- erro de geracao ou validacao.

Mobile:

- wizard em 5 etapas;
- progresso no topo;
- botoes grandes;
- cards/chips para selecoes estruturadas;
- revisao antes de gerar;
- sem overflow horizontal.

Desktop:

- secoes equivalentes ao wizard;
- resumo lateral fixo ou persistente;
- plano ativo em layout mais amplo;
- cards de treino com detalhe acessivel.

Todos os textos visiveis devem usar i18n.

## Testes

Regras obrigatorias:

- toda mudanca de comportamento deve seguir TDD: escrever teste, ver falhar
  pelo motivo correto, implementar o minimo, ver passar e refatorar se
  necessario;
- testes de backend nao devem chamar providers externos reais de IA nem
  Supabase real; devem usar doubles/injecao no nivel de aplicacao;
- toda rota HTTP nova ou alterada deve ter teste para payload invalido, sucesso,
  erro esperado e presenca/atualizacao no OpenAPI;
- todo fluxo de usuario novo no frontend deve ter E2E cobrindo comportamento
  principal e estados criticos;
- fluxos que impactem mobile devem ser cobertos por viewport mobile no
  Playwright ou verificacao automatizada equivalente;
- mudancas visuais devem ser verificadas em pelo menos um viewport mobile e um
  desktop antes de concluir;
- antes de considerar a implementacao concluida, rodar na raiz:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Backend:

- cria plano mensal quando elegivel;
- bloqueia segunda geracao antes de 30 dias;
- permite nova geracao depois de 30 dias;
- calcula idade a partir do perfil;
- rejeita geracao sem data de nascimento valida;
- atualiza perfil atletico;
- salva snapshot;
- considera equipamentos no payload/prompt;
- valida OpenAPI;
- normaliza/sanitiza tentativa de prompt injection.

Frontend E2E:

- usuario sem plano ativo preenche wizard mobile e gera plano;
- usuario com plano ativo ve resumo, lista de treinos e proxima data de
  liberacao;
- usuario abre detalhe de um treino e ve alongamentos/exercicios;
- campos livres com texto malicioso nao quebram fluxo;
- desktop exibe secoes com resumo lateral;
- mobile nao tem overflow horizontal.

## Criterios De Aceite

- Usuario autenticado consegue gerar um plano mensal quando elegivel.
- Usuario nao consegue gerar outro plano antes de 30 dias.
- Usuario com plano ativo consegue visualizar resumo, lista e detalhes dos
  treinos.
- Formulario e altamente utilizavel no mobile.
- Dados reaproveitados aparecem pre-preenchidos e editaveis.
- Perfil atletico e atualizado apos geracao.
- Snapshot do plano preserva os dados usados pela IA.
- Equipamentos disponiveis fazem parte do contrato enviado a IA.
- Campos livres tem protecao contra prompt injection.
- OpenAPI documenta todos os endpoints novos/alterados.
- Testes automatizados cobrem regra mensal, contrato, seguranca e fluxo
  principal de usuario.
