# Validação das alterações

## Reserva externa direta por período e guia de hospedagem — 15/09/2026

- **115 cenários passaram**, sem falhas: reservas 37, planejamento 17, dados da unidade 6, relatórios da unidade 13, motor externo por período 35 e integração externa 7. Os 14 arquivos JavaScript da raiz passaram em `node --check`.
- O motor externo foi validado para datas reais e futuras, intervalos de 15 minutos em um turno, limite de 366 dias, público, capacidade, manutenção, bloqueio externo, funcionamento de todos os dias, conflitos e solicitações pendentes. Busca não altera a base; confirmação revalida os dados e não grava parte do período quando há impedimento. IDs permanecem únicos, mesmo em confirmações no mesmo instante.
- Os testes verificam que somente a Direção confirma/cancela reservas externas, que a Coordenação apenas consulta, e que o cancelamento em grupo preserva dias passados, iniciados e solicitações pendentes. As regressões de reserva interna direta e créditos do Docente continuaram passando.
- No navegador, o botão **Agendar reserva externa** no dashboard do Malta abriu as quatro etapas. Para 05 a 07/10/2026, 13h–17h e 30 participantes, a busca ofereceu oito salas. O Auditório foi escolhido e o resumo mostrou **3 dias, 4 h por dia e 12 h no total**. Avançar para a revisão também foi conferido com Enter.
- A confirmação criou três registros **Confirmada** na listagem e três eventos no calendário de outubro. Cancelar somente 05/10 manteve os outros dois eventos; cancelar os dias futuros removeu os eventos de 06 e 07/10. Nova busca ofereceu novamente o Auditório para todo o período.
- Em **390 × 844 px**, o formulário e os cards ficaram em uma coluna, com controles legíveis e rolagem dentro do modal. A busca para 10 e 11/10/2026, sábado e domingo, mostrou nenhum ambiente disponível e explicou que nenhum dia havia sido reservado, sem pular datas.
- Os percursos executados não registraram erros ou avisos no console do navegador. Os dados usados nos testes de interação são fictícios e pertencem somente à sessão local.
- O guia `HOSPEDAR-NA-VERCEL.md` foi conferido com a documentação oficial e descreve ZIP pelo Drop, GitHub/painel e CLI. A publicação na Vercel **não foi executada**; o teste local não comprova uma implantação remota. A hospedagem do pacote mantém o login simulado e os dados em memória.

Comandos das novas suítes:

```powershell
node --test tests/externas-periodo.test.cjs tests/externa-integracao.test.cjs
```

Esta revisão adiciona o fluxo direto do Diretor aprovado pelo usuário, separado do cadastro comum de solicitações externas. O antigo formulário de emergência continua removido.

## Coordenação única e retirada da reserva emergencial — 13/09/2026

- As quatro suítes passaram: reservas **37/37**, planejamento **17/17**, dados da unidade **6/6** e relatórios da unidade **13/13**; total de **73 cenários**, sem falhas.
- A base pública possui uma única unidade, com 18 ambientes, 14 docentes e 16 turmas. Os testes verificam a normalização dos vínculos, a independência entre recriações dos dados e datas demonstrativas sem sobreposições.
- A busca e o agendamento da Coordenação alcançam toda a unidade. Os testes também confirmam a reserva e o cancelamento envolvendo docentes e salas antes separados por área, preservando capacidade, turno, saldo e disponibilidade. O Docente continua limitado a agendar e cancelar em nome próprio.
- O card e o formulário de reserva externa emergencial foram removidos. Um teste de regressão confirma que o antigo atributo de emergência não permite criar uma reserva externa aprovada diretamente. O formulário comum registra uma solicitação Pendente para análise da Direção.
- No navegador, a Coordenação exibiu **18 de 18 ambientes**, controles de foto em todas as salas e **14 docentes** sem coluna ou filtro de área. A edição de Sala B07 abriu normalmente, sem campo de departamento e com responsável “Coordenação da unidade”.
- O painel da Coordenação apresentou a data atual de 13/09/2026 e os próximos agendamentos de toda a unidade. O seletor de perfil exibe apenas “Coordenador”, e Sair continua ao lado do nome.
- Os relatórios da Direção comparam blocos físicos A, B, C e D. As suítes verificam os totais, os filtros de período/turno/docente, a ocupação externa e a abertura dos detalhes por mouse e teclado. No navegador, Espaço em “Ver aulas de Bloco C · Manhã” abriu uma aula de 4 h, exatamente como o indicador, com o registro de Sala C01.
- O formulário comum de Reservas Externas foi aberto no navegador: apresenta “Registrar solicitação”, sem criação emergencial direta.
- Os 12 arquivos JavaScript da raiz passaram em `node --check`. Os percursos desta revisão não registraram erros ou avisos no console do navegador.

Para repetir, execute na pasta do projeto:

```powershell
node tests/reservas.test.cjs
node tests/planejamento.test.cjs
node --test tests/unidade-data.test.cjs tests/relatorios-unidade.test.cjs
```

Os registros de setembro abaixo são históricos. As referências anteriores a escopo por área, salas de TI e área nos perfis foram substituídas pela coordenação única nesta revisão. Os dados continuam sendo uma demonstração em memória, sem autenticação real, persistência ou validação de uso simultâneo.

## Busca de salas, imagens e relatórios — 11/09/2026

- `node tests/reservas.test.cjs`: **32/32** cenários anteriores passaram.
- `node tests/planejamento.test.cjs`: **17/17** cenários novos passaram. Cobrem área, turno, capacidade, equipamentos, manutenção, dias sem funcionamento, horário passado, datas inválidas, disciplina e saldo, sobreposição de sala/docente/turma, reserva externa, adjacência, filtros dos relatórios e equivalência dos totais com as métricas existentes.
- Todos os arquivos JavaScript da raiz passaram em `node --check`.
- No navegador, a busca do Docente para 05/10/2026, turma WEB-01, duração de 2 horas e computadores retornou quatro laboratórios. Selecionar Lab. de Sistemas, 13h–15h, preencheu corretamente sala, turma, disciplina, data e horários. Confirmar criou a reserva diretamente; os resultados passaram a oferecer 15h–17h, respeitando a ocupação do docente e da turma.
- A Coordenação apresentou seis controles de foto, um por sala de TI, e a busca incluiu apenas seu escopo. A busca da Direção por outra área foi validada na suíte automatizada.
- Um PNG criado exclusivamente para teste foi selecionado pelo seletor de arquivos da Direção. A foto apareceu no card e no modal da mesma sala; remover restaurou a ilustração. O arquivo de teste não integra o pacote.
- Enter na barra de Lab. de Redes abriu nove agendamentos, 32 h e 12,1% sobre 264 h, os mesmos valores do gráfico. Espaço no segmento Tarde de TI na Direção abriu 67 aulas e 264 h, respeitando o período semestral.
- A interface de busca e os detalhes dos relatórios foram conferidos em 390 × 844 px. A página manteve sua largura; tabelas extensas rolam dentro do modal. Os controles de escolha de horário usam fonte de 16 px no celular.
- Os percursos de navegador executados não registraram erros ou avisos no console.

Os dados continuam sendo uma demonstração local. Estas verificações não validam autenticação, persistência ou uso simultâneo por pessoas diferentes.

## Aprimoramento visual — 11/09/2026

- Inspeção em desktop de 1280 × 720 px e celular de 390 × 844 px: painel docente, coordenação, perfis, calendário, formulários e login.
- O login completo coube na altura de 720 px após reduzir espaçamentos; os controles mantêm fonte de 16 px no celular.
- Entrar pela tela de demonstração abriu o painel docente normalmente. Os dados e as ações existentes foram preservados.
- O calendário móvel mantém a rolagem dentro da grade e agora informa como consultar os demais dias. A grade também recebe foco pelo teclado.
- A tecla de seta moveu a grade em 40 px sem deslocar horizontalmente a página. Textos secundários e indicadores de foco receberam maior contraste.
- O menu móvel abre com fundo de sobreposição, fecha com Esc, devolve o foco ao botão do menu e fecha ao sair da conta. O botão Sair continua na faixa de nome/avatar.
- Ao abrir o menu móvel, o conteúdo ao fundo recebe `inert`; ao sair da conta, a sobreposição e o bloqueio são removidos. Não houve avisos ou erros no console nos percursos finais.
- O visual usa apenas CSS e fontes disponíveis no dispositivo. Animações e transições são desativadas quando o usuário prefere movimento reduzido.
- Após o aprimoramento, os 32 cenários automatizados de reservas passaram novamente, sem falhas.

As verificações anteriores de lógica e perfis estão registradas abaixo.

Verificação realizada em 10/09/2026, no projeto extraído de `SIPAE-html-css-js.zip`.

## Testes de lógica

O comando abaixo usa apenas módulos internos do Node.js, sem instalar dependências:

```powershell
node tests/reservas.test.cjs
```

Resultado: **32 cenários passaram, nenhuma falha**. O teste executa os dados, métricas e eventos de envio/cancelamento reais com um DOM mínimo em memória. Cobre confirmação imediata, registros vinculados, débito de créditos, cancelamento e devolução sem duplicidade, impedimento de cancelar outro docente, disponibilidade de sala/docente/turma, horários adjacentes e cotas.

As datas simuladas incluem domingo, fim de mês, virada de ano e 29/02/2028. Nessas datas, a base produziu cinco novas aulas demonstrativas futuras em dias úteis, sem sobreposição. Os estados internos gerados são confirmada e cancelada.

Todos os arquivos JavaScript da raiz passaram pela verificação de sintaxe `node --check`.

## Conferência no navegador

- Painel do docente: próximas aulas preenchidas, resumo das reservas do mês e botões explícitos de detalhes.
- Reserva criada para 22/09/2026, 13h–14h, Lab. de Sistemas: apareceu imediatamente no calendário como Confirmada; o saldo de Programação Web passou de 13,50 h para 12,50 h.
- Cancelamento da reserva de teste: o saldo voltou a 13,50 h e o resumo mensal registrou o cancelamento.
- Sobreposição com aula existente: envio impedido com mensagem de horário já reservado.
- Notificações: confirmação verde, cancelamento laranja, próximas aulas azuis; marcar todas como lidas atualizou os rótulos.
- Coordenação: data local de 10/09/2026, aulas e docentes do dia, próximos agendamentos, agenda e disponibilidade. Relatório exibiu os novos temas de uso e agendamento.
- Tela de 390 × 844 px: painel docente sem rolagem horizontal; botão de detalhes acionado por Enter.
- Nenhum erro ou aviso apareceu nos registros do navegador durante os fluxos inspecionados.

## Limites

As verificações cobrem o protótipo local. As informações são demonstrativas; alterações feitas na página não são gravadas em banco e desaparecem ao recarregar. O login não fornece autenticação real. A execução em VM complementa a inspeção no navegador e não simula um servidor ou usuários simultâneos.

## Ajuste dos perfis da Coordenação e da Direção

- A barra lateral dos três perfis mantém um único link Sair dentro da faixa de nome/avatar. O bloco de textos institucionais da lateral foi removido.
- O avatar abre a página de perfil correspondente: docente, coordenador ou diretor.
- No navegador, os nomes da coordenação e da direção foram alterados e salvos separadamente, atualizando a barra lateral. A troca de perfil preservou o nome Daniel Oliveira do docente.
- Função e área de atuação dos gestores são somente leitura. Nome, e-mail e telefone podem ser atualizados durante a sessão demonstrativa.
- Os testes de reservas continuaram passando em 32 de 32 cenários após o ajuste. Os arquivos JavaScript alterados passaram pela verificação de sintaxe.
