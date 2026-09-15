# SIPAE — protótipo em HTML, CSS e JavaScript

O SIPAE demonstra o planejamento e o agendamento de espaços escolares nos perfis Docente, Coordenador e Diretor. Há uma única coordenação para toda a unidade; os blocos identificam a localização física dos ambientes. O pacote funciona no navegador, sem instalação de dependências.

## Como abrir

1. Extraia o pacote inteiro, mantendo os arquivos na mesma pasta.
2. Abra `index.html` no Chrome ou Edge.
3. Use o NIF **123456789**, a senha **sipae2026** e escolha o perfil de demonstração. O seletor no cabeçalho também permite trocar de perfil.

Se preferir servir os arquivos localmente e já tiver Python instalado, abra um terminal na pasta do projeto e execute:

```powershell
python -m http.server 8000
```

Acesse `http://localhost:8000`. Esse servidor é opcional e apenas entrega os arquivos estáticos; ele não adiciona banco de dados nem autenticação.

## O que mudou

- **Reserva externa no dashboard do Malta:** o botão **Agendar reserva externa** abre um modal com quatro etapas: período, ambiente, evento e confirmação. Escolha data inicial e final, horário repetido em cada dia e participantes. A busca apresenta todas as salas compatíveis com o período inteiro, com imagem, capacidade e recursos. O resumo permite revisar os dias e o total de horas antes da confirmação direta.
- **Reserva externa por vários dias:** de 1 a 366 dias consecutivos, com os mesmos horários. Todos os dias devem respeitar funcionamento, capacidade, manutenção, bloqueio para uso externo e disponibilidade, incluindo solicitações externas pendentes. A confirmação revalida tudo e cria um grupo com um registro por dia; nenhum dia é salvo se houver impedimento. A lista explica por que os demais ambientes ficaram indisponíveis.
- **Consulta e cancelamento externo:** a listagem mostra as reservas diretas como Confirmada e oferece filtro correspondente. Os detalhes apresentam contato, participantes, período e cada dia do grupo. O Diretor pode cancelar somente um dia ou os dias futuros, revisando antes a lista que será cancelada; dias já iniciados são preservados. A Coordenação pode consultar os eventos externos no calendário.
- **Encontrar sala:** nova página nos três perfis, com data, turma, disciplina, duração e equipamentos. **Equipamentos necessários** é um campo expansível com checkboxes: o cabeçalho mostra quantos estão selecionados, a lista continua aberta entre as marcações, fecha com clique fora ou Esc e possui **Limpar seleção**. A busca oferece horários em intervalos de 15 minutos dentro do turno da turma e verifica capacidade, funcionamento, manutenção, sobreposição e saldo da disciplina. Ao escolher um horário, o formulário abre preenchido para revisão e confirmação direta. Há um atalho no modal de Nova reserva.
- **Imagens das salas:** cards, detalhes e resultados da busca apresentam ilustrações identificadas como demonstrativas. Coordenador e Diretor podem adicionar, trocar ou remover fotos locais JPG, PNG e WebP de até 3 MB e 24 megapixels em todas as salas da unidade. As imagens são lidas no próprio navegador e duram somente a sessão, sem envio para serviços externos.
- **Ocupação detalhada:** no painel da Coordenação, cada barra de **Ocupação por ambiente** abre os agendamentos do dia que compõem o indicador, por clique ou pelo teclado. O modal mostra registros, horas ocupadas, disponibilidade e percentual, e cada registro permite abrir seus detalhes.
- **Identidade visual:** lateral grafite, vermelho institucional nas ações, títulos mais definidos, cards com bordas suaves e espaçamento consistente. As regras visuais compartilhadas estão em `theme.css`.
- **Tela de entrada:** apresentação em duas colunas com uma agenda ilustrada em CSS e formulário claro; no celular, a composição fica compacta. Estilos isolados em `login.css`, sem depender de fontes ou imagens externas.
- **Uso no celular:** menu lateral com fundo de sobreposição, botão Fechar e suporte a Esc; calendário com indicação de rolagem horizontal. O botão Sair permanece ao lado do nome nos três perfis.
- **Modais:** enquanto um modal está aberto a página de fundo não rola; a rolagem acontece dentro do próprio diálogo e a posição da página é devolvida ao fechar, pelo X, por **Fechar/Cancelar** ou por Esc.

- **Painel do Docente:** Próximas aulas apresenta agendamentos futuros com data, horário, disciplina, turma, ambiente e botão **Ver detalhes da reserva**. Os dados de exemplo acompanham a semana de acesso.
- **Botão Hoje:** **Hoje** é uma visualização do calendário, ao lado de **Mês** e **Semana**. Ela apresenta a grade do dia com os ambientes reservados nas linhas e os turnos nas colunas, mostrando sala, disciplina, docente e horário de cada reserva; as setas avançam e voltam um dia. O mesmo par **Hoje / Mês** está no card **Calendário de reservas** do Painel do Docente, em versão compacta.
- **Calendário de reservas:** o card do painel alterna entre **Hoje**, com a grade de ambientes e horários reservados na data, e **Mês**, com o mês navegável, destaque do dia atual e fundo discreto nos dias com aulas agendadas. Selecionar um dia do mês abre as reservas correspondentes; o card mantém o acesso à listagem completa.
- **Minhas Reservas:** filtros de confirmada, concluída e cancelada, além do botão de detalhes em cada registro.
- **Agendamento interno:** a reserva válida é confirmada imediatamente e aparece na agenda. Nas operações de reserva, o Docente agenda e cancela os próprios agendamentos; não há etapa de aprovação nem edição da reserva.
- **Horas por disciplina:** agendar compromete o saldo do mês da aula, e cancelar libera as horas. As cotas não aumentam com essas operações. As horas realizadas são calculadas pelo horário de término das aulas, sem comprovação de presença.
- **Navegação do Docente:** o avatar abre o perfil, e **Sair** fica ao lado do nome do professor, dentro da faixa de perfil.
- **Navegação da Coordenação e da Direção:** o avatar abre o perfil correspondente, e **Sair** fica ao lado do nome, na mesma posição do Docente. A barra lateral não exibe mais o bloco institucional com os textos sobre a unidade.
- **Perfis e cadastros:** cada perfil apresenta nome, e-mail, telefone e NIF, com formulário para atualizar nome e contatos durante a sessão. A função dos gestores é somente leitura. Os campos de área e departamento foram removidos dos perfis e dos cadastros.
- **Notificações:** verde para confirmação, azul para informações e próximos horários, laranja para cancelamento. Os avisos continuam legíveis depois de marcados como lidos.
- **Painel do Coordenador:** mostra a data local do acesso, aulas e docentes do dia, ocupação e horas de aula, próximos agendamentos da unidade, agenda e ambientes disponíveis hoje. O conteúdo de aprovações e alertas de conflitos internos foi substituído por esses temas.
- **Gestão da unidade:** Coordenação e Direção consultam todas as salas, docentes e agendamentos da unidade. Os calendários dos gestores possuem filtros por bloco e docente, sem divisão por áreas. A busca e o formulário oferecem todas as salas e turmas, mantendo as regras de uso e disponibilidade.
- **Relatórios da Coordenação e da Direção:** as páginas apresentam somente a área de filtros de período, turno e docente. Os blocos de gráficos, cards, tabelas e resumos não são exibidos, e **Limpar filtros** fica desabilitado enquanto nenhum filtro estiver alterado.
- **Docentes:** a listagem mostra a situação de cada docente no horário atual — em aula, no intervalo, no horário de almoço, disponível ou fora do expediente — e um botão **Detalhes**, ao lado de **Editar**, com sala, horários de início e término, turma e disciplina da aula.
- **Painel da Direção:** a saudação abre a página, **Ocupação em perspectiva** usa gráfico de colunas com os doze meses do ano corrente, de janeiro a dezembro, e os rankings apresentam os três ambientes com maior e com menor ocupação.

O Diretor mantém a tela de Reservas Externas. O sistema não possui aprovação de sala: a página não exibe solicitações pendentes nem as ações de aprovar e recusar. O card e o formulário de reserva externa emergencial foram removidos.

A entrada da página é **Agendar reserva externa**, com o fluxo direto do Diretor descrito acima. A listagem reúne os registros confirmados e cancelados, com detalhes e cancelamento por dia ou dos dias futuros.

## Regras e limites da demonstração

As telas compartilham a mesma base em memória. O sistema verifica horário, turno da turma, funcionamento, manutenção, capacidade do ambiente, disponibilidade de sala/docente/turma e saldo de horas da disciplina. Assim, retirar os painéis de conflitos não permite sobrepor agendamentos incompatíveis.

Os dados são fictícios. As datas de exemplo são deslocadas para a semana de acesso; a data atual usa o relógio local do dispositivo. Os períodos dos relatórios e calendários acompanham essa referência. Uma hora-aula equivale a 60 minutos neste protótipo.

**As alterações são perdidas ao recarregar a página.** A opção de lembrar o perfil guarda apenas essa preferência no navegador. O login e os perfis são simulados; não existe autenticação real, autorização em servidor, banco de dados ou backend. Os cálculos de aulas concluídas não substituem presença ou execução efetiva da aula.

As exportações PDF, Excel e CSV são simuladas. A integração opcional `webmcp.js` depende do suporte do navegador e não é necessária para usar a interface.

As fotos reais da unidade não foram fornecidas. As ilustrações dos ambientes não representam a disposição física das salas. O envio de uma foto a substitui no card, na busca e nos detalhes durante a sessão.

## Roteiro para conferir

Antes dos passos abaixo, experimente **Encontrar sala**: escolha uma data futura, turma, disciplina e equipamentos, execute a busca e use **Agendar neste ambiente**. Confira o preenchimento do formulário e confirme. Os horários ocupados devem desaparecer dos resultados. Nos gestores, abra **Salas**, adicione uma foto local e confira a mesma imagem nos detalhes; depois remova. Nos relatórios, selecione uma barra interativa com o mouse ou use Tab e Enter/Espaço, confira os filtros e abra um registro.

1. Entre como Docente e confira as próximas aulas, o calendário do painel — inclusive **Hoje** — e o botão **Ver detalhes da reserva**.
2. Abra uma reserva futura e confira seus dados e a opção **Cancelar agendamento**.
3. Crie uma reserva em dia útil futuro, usando sala com capacidade suficiente, turma do turno selecionado e disciplina com saldo. Se o horário estiver ocupado, escolha outro indicado como disponível. A confirmação deve atualizar agenda, listagem e créditos imediatamente.
4. Cancele esse agendamento e confira o status Cancelada, a liberação do horário e a devolução das horas ao saldo.
5. Abra as notificações, observe suas cores e marque-as como lidas. Confira o acesso ao perfil pelo avatar e a posição de Sair.
6. Troque para Coordenador e confira a data do dia no painel, os indicadores da unidade, todas as salas e docentes, a agenda e os horários disponíveis. Explore os filtros por bloco e docente no calendário e os filtros dos relatórios.
7. Nos perfis Coordenador e Diretor, abra o cadastro pelo avatar, confira os dados pessoais e salve uma alteração de nome ou contato. Confira a atualização da faixa de perfil e o botão **Sair** ao lado do nome. Os perfis e cadastros devem estar sem campos de área ou departamento.
8. Como Diretor, confira a saudação do painel, o gráfico de colunas de **Ocupação em perspectiva** e os rankings de maior e menor ocupação. Em **Reservas Externas**, confira que não há aprovação, recusa nem solicitações pendentes.
9. No dashboard do Diretor, use **Agendar reserva externa**. Escolha um período futuro disponível, uma sala e os dados do evento; revise e confirme. Confira um registro Confirmada por dia na listagem e no calendário. Cancele um dia e confira a preservação dos demais; depois cancele os dias futuros e refaça a busca para conferir a liberação.
10. Recarregue a página para restaurar os dados de demonstração.

O arquivo `MAPA-DE-TELAS-E-CARDS.md` descreve as rotas, os cards e a responsabilidade dos arquivos. Este roteiro orienta a conferência manual; não é um registro de execução de testes.

Os resultados das verificações realizadas estão em `VALIDACAO.md`. Para repetir os testes de lógica, com Node.js instalado, execute `node tests/reservas.test.cjs` na pasta do projeto.

Para os novos cenários de busca e detalhamento de indicadores, execute `node tests/planejamento.test.cjs`.

Para conferir a coordenação única, os vínculos dos dados e os relatórios por bloco, execute `node --test tests/unidade-data.test.cjs tests/relatorios-unidade.test.cjs`.

Para as reservas externas por período e sua integração com detalhes/cancelamento, execute `node --test tests/externas-periodo.test.cjs tests/externa-integracao.test.cjs`.

## Hospedar na Vercel

Siga [Como hospedar o SIPAE na Vercel](HOSPEDAR-NA-VERCEL.md). O guia apresenta envio do ZIP pelo Vercel Drop, importação por GitHub e CLI, com a pasta correta e as configurações para HTML/CSS/JS. A hospedagem mantém os limites da demonstração em memória descritos acima.
