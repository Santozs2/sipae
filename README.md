# Alocação docente · SIPAE

Tela única em HTML, CSS e JavaScript para a coordenação/direção vincular professores a unidades curriculares e a locais de aula.

## Executar com Node.js

Com Node.js 20 ou superior, execute no diretório deste projeto:

```powershell
npm start
```

Acesse `http://127.0.0.1:3000`. Para reiniciar o servidor automaticamente ao editar `server.mjs`, use `npm run dev`. Não há dependências externas nem etapa de instalação.

O servidor entrega a tela atual em HTML, CSS e JavaScript. As alocações continuam salvas no `localStorage` do navegador; ainda não existe API ou conexão com MySQL. O armazenamento é separado por endereço: registros criados ao abrir `index.html` como arquivo ou em outra porta não aparecem automaticamente em `http://127.0.0.1:3000`.

## Regras

- `HABILITADO = 0` aparece como recomendado. `HABILITADO = 1` também pode ser alocado; a coordenação/direção confirma explicitamente a atuação nos ambientes escolhidos.
- No desktop, o professor pode ser pesquisado e escolhido na lista visível; no mobile, o campo permite digitar ou abrir a lista pela seta. Os locais aparecem em uma lista pesquisável com caixas de seleção.
- Um professor de `CT` vê apenas cursos e unidades de `CT`; um professor de `CAI` vê apenas `CAI`.
- É possível selecionar várias unidades do mesmo curso e vários locais em uma única alocação. O histórico mostra um resumo, a data de salvamento e ações para ver as listas completas, editar ou remover.
- Remover uma alocação salva ou limpar o formulário pede confirmação em um modal; cancelar ou pressionar Esc mantém os dados.
- Registros criados pela versão anterior com uma unidade por linha são reunidos quando pertencem à mesma alocação salva no mesmo momento.
- Os locais são escolhidos entre os 27 ambientes de `Ambientes Ensino.xlsx`.
- Uma combinação idêntica de professor, unidade e local não é duplicada.

## Fontes e limites

`data.js` foi preparado a partir de `Professores.xlsx`, `Cursos (1).xlsx`, `Elementos CTs.xlsx`, `Elementos CAIs.xlsx` e `Ambientes Ensino.xlsx`. A interface usa código, nome, atuação e HABILITADO dos professores; **CPF e admissão não são publicados na página**. Alguns erros evidentes de digitação nos nomes dos cursos foram corrigidos para exibição.

O arquivo de CAI traz cinco linhas iniciais de Mecânico de Usinagem sem nome da unidade curricular. Elas não aparecem no seletor. Não existe, nas planilhas, vínculo prévio entre professor e unidade; este é criado quando o coordenador salva.

Esta versão é uma demonstração local: o navegador guarda as alocações, sem autenticação nem sincronização entre computadores. O [`der.svg`](der.svg) representa o modelo relacional sugerido para uma futura persistência em banco de dados. A seleção atual guarda os identificadores dos ambientes no registro local; registros da versão anterior com local digitado continuam visíveis.

## Banco MySQL

O [`mysql.sql`](mysql.sql) cria o banco `sipae_alocacoes` e as sete tabelas do DER em MySQL 8.0.16 ou superior. Também importa os catálogos de `data.js`: 10 cursos, 73 professores, 113 unidades curriculares e 27 ambientes. A carga preserva registros existentes quando o script é executado novamente; nenhuma alocação de exemplo é inserida.

No cliente MySQL, execute `SOURCE C:/caminho/para/coordenador-alocacoes/mysql.sql` com um usuário que possa criar banco, tabelas e triggers. Depois, consulte `SELECT COUNT(*) FROM curso;` para conferir a carga. O comando `node gerar-carga-mysql.mjs` recria os `INSERT`s no fim do SQL caso `data.js` seja atualizado.

Uma alocação deve ser gravada em uma transação: insira primeiro em `alocacao`, guarde `LAST_INSERT_ID()` e insira cada unidade em `alocacao_unidade` e cada local em `alocacao_ambiente`. Os triggers exigem que professor e curso tenham a mesma atuação, que unidades pertençam ao curso e que `habilitado = 1` tenha confirmação da coordenação. A tela atual ainda usa `localStorage`: o script prepara o banco, mas não conecta o HTML diretamente ao MySQL. Se você já criou o banco com a versão anterior, execute [`mysql-migracao-multiplos-locais.sql`](mysql-migracao-multiplos-locais.sql) antes de executar o `mysql.sql` atualizado.
