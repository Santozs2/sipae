# SIPAE — mapa de telas, cards e arquivos

O pacote usa navegação por fragmento na página `index.html`. Todos os dados são demonstrativos e ficam em memória durante a sessão da página. Há uma única Coordenação para toda a unidade, compartilhada pelas salas, turmas e docentes; os blocos indicam apenas a localização física dos ambientes.

## Rotas

| Perfil | Página | Fragmento |
|---|---|---|
| Acesso | Login de demonstração | `#login` |
| Docente | Painel do Docente | `#docente/dashboard` |
| Docente / Coordenador / Diretor | Busca de salas e horários | `#docente/encontrar`, `#coordenador/encontrar`, `#diretor/encontrar` |
| Docente | Minhas Reservas | `#docente/reservas` |
| Docente | Calendário de Reservas | `#docente/calendario` |
| Docente | Perfil, acessível pelo avatar | `#docente/perfil` |
| Coordenador | Painel da Coordenação | `#coordenador/dashboard` |
| Coordenador | Gerenciamento de Salas | `#coordenador/salas` |
| Coordenador | Gerenciamento de Docentes | `#coordenador/docentes` |
| Coordenador | Relatórios da unidade | `#coordenador/relatorios` |
| Coordenador | Calendário Escolar | `#coordenador/calendario` |
| Coordenador | Perfil, acessível pelo avatar | `#coordenador/perfil` |
| Diretor | Painel da unidade | `#diretor/dashboard` |
| Diretor | Calendário Geral de Reservas | `#diretor/calendario` |
| Diretor | Gerenciamento de Salas | `#diretor/salas` |
| Diretor | Gerenciamento de Docentes | `#diretor/docentes` |
| Diretor | Reservas Externas | `#diretor/externas` |
| Diretor | Relatório executivo | `#diretor/relatorios` |
| Diretor | Perfil, acessível pelo avatar | `#diretor/perfil` |

## Docente

**Encontrar sala** consulta horários compatíveis com data, duração, turno da turma, disciplina, equipamentos, capacidade e disponibilidade de sala/docente/turma. **Equipamentos necessários** é um campo expansível com checkboxes, idêntico nos três perfis: informa a quantidade selecionada no cabeçalho, permanece aberto entre as marcações, fecha com clique fora ou Esc e oferece **Limpar seleção**. Os cards mostram a imagem do ambiente, recursos e um seletor de horários. **Agendar neste ambiente** prepara o formulário; somente a confirmação cria a reserva. A mesma página atende aos gestores, com seleção de docente. Todos os perfis podem escolher entre as salas e turmas da unidade, conforme as regras de uso e disponibilidade.

| Local | Conteúdo e interação |
|---|---|
| Próximas aulas | Até quatro aulas futuras, ordenadas por data e horário, com disciplina, turma, ambiente e **Ver detalhes da reserva**. |
| Calendário de reservas | Alterna entre **Hoje**, com a grade de ambientes e horários reservados na data, e **Mês**, navegável, com destaque do dia atual, fundo discreto nos dias com aulas, consulta do dia e link para todas as reservas. Ocupa o espaço antes usado por Reservas do mês. |
| Horas por disciplina | Mês selecionável, horas realizadas, agendadas e disponíveis, além da cota mensal. |
| Minhas Reservas | Busca, filtros por status/ambiente/período, paginação e botão **Ver detalhes da reserva**. |
| Calendário de Reservas | Visualizações de **Hoje**, **Mês** e **Semana**, navegação de período e consulta de detalhes. A visualização de dia lista os ambientes reservados nas linhas e os turnos nas colunas. |
| Perfil | Dados demonstrativos do docente, acessíveis pelo avatar, sem campo de área ou departamento. |
| Barra lateral | **Sair** aparece ao lado do nome do professor, dentro da faixa com nome e avatar. |

Nova reserva abre um modal. Para o Docente, o agendamento é único, em nome próprio, com disciplina vinculada ao perfil. Uma reserva válida é confirmada e incluída na agenda imediatamente. As ações de reserva disponíveis ao Docente são agendar e cancelar; não existe aprovação intermediária nem edição do agendamento.

O modal de detalhes mostra docente, ambiente, turma/disciplina, data, horário, status e observações. Uma reserva futura ativa oferece **Cancelar agendamento** e uma confirmação antes de efetuar o cancelamento. O histórico é mantido como Cancelada.

## Coordenação

O cabeçalho do painel mostra a data local do acesso. Os indicadores e a agenda do dia usam essa mesma data e consideram a unidade inteira.

| Card | Conteúdo |
|---|---|
| Aulas agendadas hoje | Quantidade de agendamentos da unidade no dia. |
| Docentes com aulas hoje | Quantidade de docentes distintos com aulas no dia. |
| Ocupação da unidade hoje | Horas ocupadas em relação às horas disponíveis dos ambientes da unidade. |
| Horas de aula hoje | Soma da duração das aulas agendadas no dia. |
| Próximos agendamentos da unidade | Até cinco aulas em andamento ou futuras, com acesso aos detalhes, em uma área com rolagem própria. |
| Agenda de hoje | Reservas da unidade na data atual, em uma tabela com rolagem própria e cabeçalho fixo. |
| Ambientes disponíveis hoje | Horários livres restantes, separados por turno, em uma área com rolagem própria dentro do card; manutenção não é oferecida como disponibilidade. |
| Ocupação por ambiente | Comparação do uso dos ambientes no dia atual, em uma área com rolagem própria e o eixo fixo abaixo dela. Ambientes com 0% não são exibidos e cada barra abre os agendamentos do dia. |

Os relatórios da Coordenação apresentam somente a área de filtros de período, turno e docente. Gráficos, cards, tabelas e resumos não são exibidos abaixo dos filtros; a lógica dos filtros e dos indicadores permanece no código. **Limpar filtros** fica desabilitado enquanto nenhum filtro estiver alterado.

O **Gerenciamento de Docentes** apresenta, para cada docente, a situação no horário atual — em aula, no intervalo, no horário de almoço, disponível ou fora do expediente — calculada pela agenda do dia, pelos turnos da unidade e pelas janelas entre turnos. O botão **Detalhes**, ao lado de **Editar**, abre a sala, os horários de início e término, a turma e a disciplina da aula em andamento ou da próxima, com a agenda do dia.

A navegação mantém gerenciamento de todas as salas, gerenciamento de todos os docentes e calendário escolar da unidade. O calendário permite filtrar bloco físico e docente e oferece as visualizações de dia, mês e semana. As listagens e cadastros não possuem divisão ou filtros por áreas; os campos correspondentes também foram removidos dos formulários. Não há fila de aprovação nem painel de ocorrências de conflitos internos. As verificações de disponibilidade continuam sendo aplicadas ao agendar.

O avatar na faixa inferior abre o Perfil do Coordenador. A página apresenta nome, e-mail, telefone e NIF; o formulário permite alterar nome e contatos durante a sessão. A função é somente leitura, e o campo de área foi removido. O botão **Sair** fica ao lado do nome, na mesma posição usada pelo Docente, e o bloco institucional foi removido da barra lateral.

## Direção e reservas externas

A Direção consulta o conjunto da unidade, seus calendários e relatórios; gerencia salas e docentes e utiliza a tela de Reservas Externas. O painel abre com a saudação ao Diretor e reúne **Ocupação em perspectiva**, em gráfico de colunas com os doze meses do ano corrente, **Como estão os blocos?**, **Ambientes disponíveis hoje** e os rankings **Os 3 ambientes com maior Ocupação** e **Os 3 ambientes com menor Ocupação**. A disponibilidade reutiliza o card da Coordenação, com horários livres restantes por turno e rolagem própria. O gráfico se ajusta à altura dos cards ao lado, sem espaço vazio abaixo, e fica em uma coluna nas telas pequenas. O relatório executivo apresenta somente a área de filtros. Os agrupamentos e filtros por bloco representam localização física, sem divisão da gestão em áreas ou coordenações distintas.

O avatar na faixa inferior abre o Perfil do Diretor, com dados pessoais e formulário de nome e contatos equivalente ao da Coordenação. A função é somente leitura, e o campo de área foi removido. O botão **Sair** fica ao lado do nome, e a barra lateral não exibe o antigo bloco institucional. Os perfis dos gestores não apresentam disciplinas, créditos ou histórico de reservas do Docente.

O sistema não possui aprovação de sala. A tela de Reservas Externas não exibe solicitações pendentes, pendência de aprovação nem as ações de aprovar e recusar; o card e o formulário de reserva externa emergencial também foram removidos. Eventos externos confirmados ocupam o ambiente, sem consumir a cota de uma disciplina do docente.

O painel da Direção e a página de Reservas Externas oferecem **Agendar reserva externa**, única entrada de cadastro externo. O modal possui quatro etapas: **Período**, com datas inicial/final, horários e participantes; **Ambiente**, com todas as salas disponíveis no período inteiro, imagens e recursos; **Evento**, com instituição/responsável, contato e finalidade; e **Confirmar**, com resumo de dias e horas. O período tem de 1 a 366 dias consecutivos, com o mesmo horário em cada dia. Não há exclusão silenciosa de finais de semana: a sala deve funcionar em todos os dias selecionados.

A confirmação direta da Direção verifica novamente cada dia e cria todas as ocorrências juntas. Os registros compartilham um grupo e aparecem como **Confirmada** na listagem, com um evento por dia no calendário. Os detalhes mostram contato, participantes, período, finalidade e estados de todas as ocorrências. **Cancelar este dia** e **Cancelar dias futuros** apresentam uma revisão antes de liberar os horários; somente o Diretor pode cancelar reservas externas, e os dias já iniciados são mantidos. A Coordenação pode consultá-las no calendário.

## Notificações e modais

As barras de ocupação por ambiente no painel da Coordenação abrem um modal com os registros do dia, por clique ou pelo teclado. O card **Ambientes disponíveis hoje**, compartilhado pelos dois perfis, mostra os horários livres restantes na data atual. Ocupação inclui eventos externos confirmados e calcula união dos intervalos; horas de aula incluem apenas alocações acadêmicas. O recorte do painel é sempre a data atual.

Enquanto um modal está aberto, a página de fundo não rola: a rolagem acontece dentro do próprio diálogo e a posição da página é restaurada ao fechar pelo X, por **Fechar/Cancelar** ou por Esc.

Os cards e detalhes dos ambientes usam imagens ilustrativas identificadas. Ações de foto ficam disponíveis ao Coordenador e ao Diretor em todas as salas da unidade e mantêm a imagem na memória da página. Uma foto adicionada também aparece nos resultados da busca de salas.

As notificações são abertas pelo sino do cabeçalho. Confirmações usam verde, informações e próximos horários usam azul, cancelamentos usam laranja. Texto e ícone identificam o assunto; a cor complementa essa informação. A ação **Marcar todas como lidas** mantém o conteúdo legível.

Também existem modais de nova reserva, detalhes, cancelamento, consulta diária de sala, cadastro/edição de salas e docentes, reserva externa e recuperação do acesso demonstrativo. Para o acesso de demonstração, use NIF **123456789** e senha **sipae2026**.

## Dados, regras e métricas

- **Datas:** `data.js` desloca a base fictícia para a semana de acesso e prepara aulas futuras do Docente. `data.today` representa a data local, e `data.reference` registra o instante de referência. Calendários e períodos de indicadores são calculados a partir desse contexto.
- **Fonte compartilhada:** as páginas e operações consultam a mesma instância da base em memória, atualizando a interface durante a sessão.
- **Unidade única:** a Coordenação acessa todas as salas, docentes, turmas e agendamentos da unidade. Blocos são localizações físicas; áreas e departamentos não são campos de perfil, cadastro ou filtro. O Docente consulta suas próprias reservas e agenda ou cancela somente em nome próprio.
- **Agendamento:** valida ambiente, docente, turma, data, intervalo, turno, dias de funcionamento, manutenção, capacidade e saldo da disciplina. Dois intervalos que apenas encostam podem coexistir; intervalos sobrepostos na mesma sala, turma ou docente são impedidos.
- **Créditos:** saldo disponível = cota mensal − horas realizadas − horas agendadas. Confirmar uma reserva compromete as horas no mês da aula; cancelar libera essas horas. A cota definida ao criar a base não aumenta com as operações.
- **Horas realizadas:** a duração de uma aula com término anterior ao instante de referência é contabilizada como realizada. Isso é uma simulação por horário, sem confirmação real de presença. Uma hora-aula equivale a 60 minutos.
- **Ocupação:** horas ocupadas divididas pelas horas disponíveis dos ambientes; manutenção fica fora da disponibilidade. Reservas externas confirmadas ocupam a sala, mas não contam como carga acadêmica do docente.
- **Limites:** não há backend, banco, autenticação ou autorização de servidor. Os dados voltam ao estado inicial ao recarregar; somente a preferência de perfil pode ser lembrada pelo navegador. Exportações PDF, Excel e CSV permanecem simuladas.

## Responsabilidade dos arquivos

Os arquivos estão na raiz da pasta extraída, sem diretório `dist`.

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura da página, cabeçalho, navegação, faixa do perfil, saída e diálogo da aplicação. |
| `styles.css` | Base visual, componentes gerais, painéis, tabelas e responsividade. |
| `pages.css` | Estilos de páginas, calendários, perfil, formulários, cards do Docente e notificações. |
| `theme.css` | Acabamento visual compartilhado: paleta, tipografia, barra lateral, cards, estados de foco e adaptação ao celular. |
| `login.css` | Composição da tela de entrada, agenda ilustrativa em CSS e ajustes para telas baixas e celulares. |
| `planning.css` | Busca de salas, imagens dos ambientes e componentes de detalhamento dos indicadores. |
| `external-reservation.css` | Etapas do modal externo, cards de salas, resumo, estados e adaptação ao celular. |
| `external-booking.js` | Busca externa por período, validação de todos os dias, confirmação conjunta e cancelamento de dias futuros. |
| `external-reservation.js` | Modal do agendamento externo direto no dashboard, seleção de sala, dados do evento, revisão e sucesso. |
| `room-search.js` | Motor de busca sem mutações, com validações e geração de horários compatíveis. |
| `room-finder.js` | Formulário da busca, resultados por ambiente e integração com a confirmação de reserva. |
| `room-media.js` | Ilustrações SVG, imagens locais da sessão, controles de foto e restrições por perfil. |
| `report-details.js` | Recorte dos registros dos indicadores e apresentação do modal de detalhes. |
| `data.js` | Base fictícia, datas relativas ao acesso, agendamentos, ambientes, turmas, docentes e cotas de disciplinas. |
| `metrics.js` | Períodos, disponibilidade, ocupação, carga, créditos e validação de reservas. |
| `app.js` | Navegação, estado do perfil, componentes compartilhados e painel da Coordenação. |
| `charts.js` | Gráficos SVG, incluindo linhas, colunas, rosca, mapa de calor e dispersão. |
| `views.js` | Relatórios da Coordenação, painel e relatório da Direção. |
| `pages.js` | Login, painel e reservas do Docente, perfis dos três papéis, calendários, cadastros e reservas externas. |
| `actions.js` | Formulários, criação confirmada, cancelamento, notificações, modais e ações de navegação dos calendários. |
| `webmcp.js` | Integração opcional, dependente de suporte do navegador. |
| `LEIA-ME.md` | Como abrir, credenciais demonstrativas, funcionamento, limites e roteiro de conferência. |
| `MAPA-DE-TELAS-E-CARDS.md` | Este inventário de telas, componentes e responsabilidades. |
| `HOSPEDAR-NA-VERCEL.md` | Instruções de publicação do pacote estático na Vercel, por ZIP, GitHub ou CLI. |

## Conferência manual sugerida

Abra `index.html` diretamente ou use o servidor estático opcional descrito em `LEIA-ME.md`. Confira o painel do Docente e seus botões de detalhes; crie uma reserva em horário livre e verifique a confirmação imediata; cancele e confira histórico, disponibilidade e créditos. Observe as notificações e a posição de Sair. Depois, troque para Coordenador, confira a data do acesso e os novos cards e navegue pelos relatórios.

Na Coordenação e na Direção, confira a ausência dos textos institucionais na barra lateral, o acesso ao perfil pelo avatar e a posição de **Sair** ao lado do nome. Abra cada perfil, altere nome ou contato e confira a atualização durante a sessão; a função deve continuar somente leitura e os campos de área e departamento não devem aparecer. Confira todas as salas e docentes nas listagens e filtre os calendários por bloco ou docente.

Na Direção, abra os detalhes dos indicadores por bloco e turno e confira o recorte exibido. No dashboard, use **Agendar reserva externa**, selecione um período futuro, confira as salas, informe o evento e confirme. Verifique os registros no calendário e na listagem, cancele um dia e depois os demais futuros. A sala deve voltar à busca após os cancelamentos. Em Reservas Externas, confira que não há aprovação, recusa nem solicitações pendentes.

Este documento descreve o comportamento e o roteiro esperado. Ele não declara execução de testes; evidências de verificação devem ser registradas separadamente.
