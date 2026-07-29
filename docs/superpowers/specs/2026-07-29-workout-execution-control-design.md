# Workout Execution Control Design

## Context

A tela de treino ativo hoje preserva o plano mensal em cards por sessao. Cada
card mostra dia, foco, duracao, contagem de alongamentos/exercicios e detalhes
expansiveis com todas as informacoes do treino.

O novo fluxo deve melhorar a execucao do treino sem transformar a experiencia em
um processo rigido. O usuario precisa conseguir acompanhar o que ja fez,
finalizar o treino mesmo com itens pendentes e receber um feedback positivo no
fim.

## Goals

- Manter a estrutura atual da tela de plano ativo.
- Adicionar um controle de execucao por sessao de treino.
- Preservar todas as informacoes atuais de cada alongamento e exercicio.
- Usar `sessionStorage` para guardar progresso durante a sessao do navegador.
- Permitir marcar e desmarcar itens em qualquer ordem.
- Permitir finalizar o treino sem exigir todos os itens marcados.
- Exibir feedback final positivo com animacao relacionada ao esporte/modalidade.

## Non-Goals

- Nao criar historico oficial de treinos no backend nesta fase.
- Nao alterar contrato REST, banco de dados ou OpenAPI.
- Nao impor ordem obrigatoria de execucao.
- Nao adicionar cronometro, descanso automatico ou bloqueio por tempo.
- Nao substituir o plano ativo por uma tela completamente nova.

## Current Structure To Preserve

O plano ativo continua renderizando:

- resumo do plano;
- dados do plano, como modalidade, objetivos, frequencia e duracao;
- cards por sessao de treino;
- detalhes por sessao com `Alongamentos e mobilidade`;
- detalhes por sessao com `Exercicios principais`.

Cada item deve continuar exibindo:

- nome;
- motivo da escolha;
- duracao, no caso de alongamentos;
- series e repeticoes, no caso de exercicios;
- instrucoes de execucao;
- observacoes, quando existirem.

## User Flow

1. Usuario acessa `/training` e ve o plano ativo como hoje.
2. Cada card de treino exibe uma acao `Comecar treino`.
3. Ao clicar em `Comecar treino`, o app registra no `sessionStorage` qual sessao
   esta em andamento e abre uma area de controle para aquela sessao.
4. Enquanto houver treino em andamento, o card daquela sessao ganha foco visual:
   status `Em andamento`, progresso e destaque de borda/superficie.
5. Os demais cards continuam acessiveis, mas ficam visualmente secundarios.
6. A area de controle mostra todos os alongamentos e exercicios da sessao, com
   checkbox grande em cada item e todas as informacoes preservadas.
7. O usuario marca ou desmarca itens em qualquer ordem.
8. O botao `Finalizar treino` fica sempre disponivel.
9. Se houver itens pendentes, o app mostra uma confirmacao leve antes de concluir.
10. Ao confirmar a conclusao, o app exibe um modal positivo com animacao
    relacionada a modalidade do plano.
11. O usuario pode voltar ao plano ou rever o treino.

## Session Storage

O estado de execucao deve ficar em `sessionStorage`, escopado por usuario, plano
e sessao de treino.

Dados esperados:

- id do plano;
- identificador estavel da sessao;
- modalidade do plano;
- conjunto de itens marcados como feitos;
- estado da execucao: `in_progress` ou `completed`;
- timestamp local de inicio;
- timestamp local de conclusao, quando houver.

Como os itens do plano nao possuem IDs dedicados, a chave do item deve ser
derivada de dados estaveis da sessao:

- tipo do item: `stretch` ou `exercise`;
- indice do item dentro da secao;
- nome do item.

Se o plano ativo mudar, o estado antigo nao deve interferir no novo plano.

## Execution Control UI

A area de controle pode aparecer dentro do proprio card em andamento ou logo
abaixo dele. Ela deve priorizar clareza em mobile:

- cabecalho com dia, foco e progresso;
- texto de progresso, por exemplo `3 de 6 concluidos`;
- barra de progresso discreta;
- secoes separadas para alongamentos e exercicios;
- itens com checkbox grande e alvo confortavel para toque;
- informacoes completas do item logo abaixo do titulo;
- botao `Finalizar treino`;
- acao secundaria para voltar/recolher controle sem perder progresso.

O fluxo nao deve impedir o usuario de abrir outros treinos ou navegar no app.

## Completing With Pending Items

O usuario pode concluir com itens pendentes.

Quando isso acontecer, abrir uma confirmacao acessivel:

- titulo: `Finalizar treino?`;
- texto: `Voce ainda tem exercicios pendentes. Quer finalizar mesmo assim?`;
- acao primaria: `Finalizar`;
- acao secundaria: `Continuar treino`.

Se todos os itens estiverem marcados, a finalizacao pode abrir o feedback final
diretamente.

## Positive Feedback Modal

Ao concluir, exibir um modal animado com referencia a modalidade do plano.

Texto base:

- titulo: `Treino concluido`;
- mensagem: `Voce esta cada vez mais funcional.`;

Acoes:

- `Voltar ao plano`;
- `Rever treino`.

Animacoes por modalidade:

- `volei`: bola subindo/cortada, rede ou linha de quadra;
- `basquete`: bola quicando ou arremesso;
- `futebol_futsal`: bola indo para o gol;
- `beach_tenis`: bola/raquete com referencia a areia ou quadra.

A animacao deve ser leve, feita no frontend, sem carregar assets externos e sem
prejudicar legibilidade ou acessibilidade.

## Accessibility And Responsiveness

- Checkboxes devem ser controles reais ou botoes com estado acessivel.
- O progresso deve ser compreensivel por texto, nao apenas por cor.
- Modais devem usar `role="alertdialog"` ou dialogo acessivel equivalente.
- O foco deve ir para o modal ao abrir e voltar para uma acao coerente ao fechar.
- Mobile deve ser prioridade: sem overflow horizontal, sem texto cortado e com
  alvos confortaveis de toque.

## Testing

Adicionar cobertura E2E para:

- iniciar treino a partir de um card do plano ativo;
- ver o card em andamento com foco visual e progresso;
- marcar e desmarcar pelo menos um alongamento/exercicio;
- preservar progresso ao navegar/recarregar dentro da mesma sessao do navegador;
- finalizar com itens pendentes mediante confirmacao;
- exibir modal positivo com texto `Voce esta cada vez mais funcional`;
- exibir uma referencia visual da modalidade do plano no feedback;
- voltar ao plano apos o feedback.

Como nao ha mudanca de API, nao e necessario teste backend nem atualizacao
OpenAPI nesta fase.
