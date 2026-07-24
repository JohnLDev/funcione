# Monthly Training Plan Form Design

## Contexto

O Funcione possui autenticacao com Supabase Auth, frontend Vite/React com rotas
reais, i18n e tema claro/escuro. A geracao de plano por IA e exposta somente
pela operacao mensal autenticada:

```txt
POST /api/training-plans/monthly
```

Esse endpoint recebe `DadosUsuario` e gera um plano semanal com 2 a 7 sessoes,
conforme frequencia semanal. A experiencia mensal usa essa capacidade para que
o aluno gere e consulte um unico plano ativo, limitado a uma geracao a cada 30
dias.

## Objetivo

Documentar o comportamento final do formulario de criacao de treino mensal,
com todos os campos necessarios para a IA, usabilidade mobile-first e
persistencia em Supabase Postgres.

## Decisoes Aprovadas

- O formulario implementa abordagem hibrida:
  - mobile: wizard progressivo;
  - desktop: secoes com resumo lateral.
- A organizacao visual aprovada e a opcao A: wizard progressivo em 5 etapas.
- O usuario gera um plano semanal base que fica ativo por 30 dias; somente um
  plano com status `active` pode existir por usuario.
- O usuario pode gerar no maximo um plano a cada 30 dias corridos.
- Enquanto houver plano ativo, a tela mostra plano atual, data de geracao e
  proxima data disponivel para nova geracao.
- O usuario pode abrir e visualizar o plano ativo sempre que quiser.
- A interface desta etapa mostra apenas o plano ativo; historico fica fora do
  escopo visual.
- O backend sera a autoridade da regra de 30 dias.
- A persistencia usa Supabase Postgres.
- A idade e calculada pelo backend a partir da data de nascimento do perfil
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

O wizard implementado oferece todas as opcoes aprovadas em cinco etapas e uma
revisao final. As selecoes estruturadas sao modalidade (volei, basquete,
futebol/futsal e beach tennis), objetivos (performance, condicionamento,
prevencao de lesao, perda de peso e ganho de massa), nivel (iniciante,
intermediario, avancado e profissional), frequencia (2 a 7 vezes por semana),
duracao (30, 45, 60, 75 ou 90 minutos), local (academia, casa ou ar livre),
equipamentos e lesoes/restricoes. Equipamentos e lesoes aceitam selecao
multipla; as opcoes customizadas revelam os campos livres abaixo.

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

O plano mensal ativo representa o plano semanal base valido por 30 dias. A
regra e autoritativa no backend e no banco: a reserva de geracao e atomica, uma
criacao concorrente perde com conflito, e a persistencia garante um unico plano
ativo por usuario. Reservas abandonadas usam lease de 15 minutos e sao
liberadas pelo banco na proxima consulta ou tentativa de reserva. Planos
anteriores expiram para permitir o proximo ciclo, mas nao ha historico visual
nesta etapa.

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

Endpoints implementados:

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
  for permitido gerar novamente;
- nunca expor os metadados internos de execucao do gerador.

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
- calcular idade exclusivamente do perfil autenticado;
- normalizar e sanitizar campos livres antes de montar o snapshot;
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

O endpoint antigo `POST /api/training-plans` foi removido porque aceitava
identidade e idade fornecidas pelo cliente e permitia geracao de IA fora da
regra mensal. O frontend em `/training` usa exclusivamente
`POST /api/training-plans/monthly` e consulta primeiro
`GET /api/training-plans/active`.

## Persistencia Supabase

A persistencia usa Supabase Postgres e a migration
`supabase/migrations/20260723220139_create_training_plan_tables.sql` deve ser
aplicada com `supabase db push`. Ambientes que ja aplicaram a migration base
recebem a migration avancada
`supabase/migrations/20260724093529_secure_monthly_training_plan_rpc.sql`, que
reforca grants, leases e RPCs sem depender apenas de edicao retroativa da
migration original.

Modelo recomendado:

- tabela de perfil atletico;
- tabela de planos mensais.

O frontend nao escreve diretamente nessas tabelas. A aplicacao usa o backend
como porta principal para validar autenticacao, regra de negocio, sanitizacao,
OpenAPI e chamadas de IA.

O backend cria os repositorios Supabase no escopo de cada request autenticado,
com o bearer token do usuario. `training_monthly_plans` e
`training_monthly_plan_generation_reservations` concedem apenas `SELECT` ao
papel `authenticated`; `INSERT`, `UPDATE` e `DELETE` sao revogados de `public`,
`anon` e `authenticated`. Toda escrita nessas tabelas passa pelos RPCs de
estado, reserva, liberacao e conclusao.

Esses RPCs precisam escrever apesar dos grants restritos e, por isso, usam
`SECURITY DEFINER` com defesa estrita: `auth.uid()` deve existir e corresponder
ao dono, `search_path` e vazio, todas as relacoes sao qualificadas, `EXECUTE` e
revogado de `public` e `anon` e concedido explicitamente somente a
`authenticated`. O banco usa `statement_timestamp()` para criar o lease de 15
minutos, expirar reservas pendentes e calcular a janela de 30 dias; timestamps
fornecidos pelo cliente nao controlam elegibilidade.

O RPC de conclusao tambem valida o payload antes de gravar: `plan`, `result`,
`snapshot`, `metadata` e o espelho de `athletic_profile` precisam ter a
estrutura esperada, pertencer ao usuario autenticado, respeitar os limites de
treinos e refletir modalidade, nivel, local, duracao, objetivos, equipamentos e
lesoes usados na geracao. A validacao do banco deve usar allowlists para enums,
comparacoes null-safe entre snapshot e perfil atletico, tipos textuais
explicitos, limites dos campos livres e o contrato basico de cada item em
`alongamentos` e `exercicios`. Isso evita que um usuario autenticado reserve
uma geracao e conclua diretamente com JSON fabricado fora do contrato do
backend.

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

Regras implementadas:

- frontend limita a entrada e exige descricoes customizadas nao vazias;
- backend valida novamente por schema;
- backend remove caracteres de controle, normaliza whitespace e aplica os
  limites de 120, 180 e 80 caracteres antes de persistir;
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

Rota implementada:

```txt
/training
```

Estados:

- carregando status do plano;
- sem plano ativo: exibe wizard;
- gerando plano;
- reserva pendente sem plano ativo: exibe estado de geracao e reconciliacao;
- plano ativo;
- bloqueado por 30 dias;
- erro de consulta, geracao ou validacao com mensagem e acao de tentar
  novamente.

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

Todos os textos visiveis usam i18n. O dashboard oferece a entrada para
`/training`; a rota de treino usa o mesmo shell autenticado do app, mantendo a
navegacao lateral no desktop e a navegacao inferior no mobile, com o item
Treino ativo enquanto concentra o wizard e a visualizacao do plano ativo.

## Testes

Regras obrigatorias:

- toda mudanca de comportamento deve seguir TDD: escrever teste, ver falhar
  pelo motivo correto, implementar o minimo, ver passar e refatorar se
  necessario;
- testes de backend nao devem chamar providers externos reais de IA nem
  Supabase real; devem usar doubles/injecao no nivel de aplicacao;
- toda rota HTTP nova ou alterada deve ter teste para payload invalido, sucesso,
  erro esperado e presenca/atualizacao no OpenAPI;
- o fluxo principal e os estados criticos do frontend possuem E2E Playwright em
  `desktop-chromium` e `mobile-chrome`: navegacao para `/training`, wizard,
  validacao de medidas e textos livres, geracao, plano ativo, detalhes e
  bloqueio mensal;
- o fluxo mobile verifica ausencia de overflow horizontal e o desktop verifica
  a navegacao e o plano ativo em layout amplo;
- fluxos que impactem mobile sao cobertos por viewport mobile no
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
- recupera reserva pendente abandonada apos 15 minutos;
- captura falha de rede na conclusao sem deixar excecao escapar;
- remove a operacao legada do runtime e do OpenAPI;
- documenta `500` nas duas rotas mensais.

Frontend E2E:

- usuario sem plano ativo preenche wizard mobile e gera plano;
- usuario com plano ativo ve resumo, lista de treinos e proxima data de
  liberacao;
- usuario abre detalhe de um treino e ve alongamentos/exercicios;
- campos livres com texto malicioso nao quebram fluxo;
- desktop exibe secoes com resumo lateral;
- mobile nao tem overflow horizontal.
- cada lesao exige gravidade e preserva sua propria observacao;
- revisao mostra todos os campos enviados e o aviso mensal no mobile;
- estados pendente e erro permitem reconciliar e tentar novamente;
- plano ativo mostra modalidade, objetivos, contagens, duracao dos alongamentos
  e observacoes opcionais.

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
