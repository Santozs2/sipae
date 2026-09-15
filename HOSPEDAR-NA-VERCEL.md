# Como hospedar o SIPAE na Vercel

Guia conferido na documentação oficial em **15/09/2026**. A publicação ainda não foi executada.

Este pacote é um site estático em HTML, CSS e JavaScript. A pasta que deve ser publicada é:

```text
C:\Users\angel\OneDrive\Documents\ChatGPT\malta\SIPAE-html-css-js
```

Ela contém `index.html`, os arquivos `.css` e os módulos `.js`. A pasta superior `malta` possui outro aplicativo e não deve ser enviada inteira para publicar esta versão. O ZIP `SIPAE-html-css-js-atualizado.zip` reúne o pacote deste projeto.

## Opção rápida: enviar o ZIP pelo Vercel Drop

1. Entre na sua conta e abra [Vercel Drop](https://vercel.com/drop).
2. Arraste `SIPAE-html-css-js-atualizado.zip` para a página. Também é possível selecionar a pasta `SIPAE-html-css-js` já extraída.
3. Escolha sua conta/equipe e um nome para o projeto, por exemplo, `sipae-demo`.
4. Confira se `index.html` está no primeiro nível dos arquivos. Se a interface pedir a página inicial em **Root (/)**, selecione `index.html`.
5. Clique em **Deploy** e aguarde a URL gerada. Esse envio publica diretamente o projeto.

O Drop aceita sites estáticos sem Git ou terminal. Cada envio pelo Drop cria um **novo projeto**; para atualizar continuamente o mesmo site, use GitHub ou a CLI nas opções abaixo. [Documentação oficial do Vercel Drop](https://vercel.com/docs/drop)

## Opção com atualizações automáticas: GitHub e painel da Vercel

### 1. Colocar o pacote no GitHub

Crie um repositório próprio, por exemplo, `sipae-demo`. Envie o **conteúdo extraído** de `SIPAE-html-css-js`, incluindo todos os `.html`, `.css` e `.js`, para a raiz desse repositório. O `index.html` deve aparecer logo ao abrir a lista de arquivos.

No GitHub, use **Add file → Upload files**, arraste os arquivos/pastas, escreva uma mensagem para a alteração e conclua o commit. Se optar por uma nova branch, conclua também a integração dela à branch que será publicada. Enviar somente o ZIP ao repositório não fornece os arquivos extraídos que a Vercel precisa servir. [Como enviar arquivos ao GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

### 2. Importar na Vercel

No [painel da Vercel](https://vercel.com/dashboard), escolha **New Project** — também pode aparecer em **Add New → Project**. Conecte o GitHub, autorize o acesso ao repositório e selecione o projeto enviado. A próxima tela permite configurar nome, framework, pasta e comandos antes de publicar. [Importação de repositórios](https://vercel.com/docs/git#deploying-a-git-repository)

### 3. Preencher os campos

| Campo | Valor para este SIPAE |
| --- | --- |
| Project Name | Um nome de sua escolha, como `sipae-demo` |
| Framework Preset | **Other** |
| Root Directory | Raiz do repositório, se o `index.html` estiver nela. Se estiver dentro de uma subpasta `SIPAE-html-css-js`, selecione essa subpasta. |
| Build Command | Ative **Override** e deixe o campo **vazio**. |
| Output Directory | **`.`** (um ponto), relativo à Root Directory selecionada. |
| Install Command | Deixe sem comando personalizado. Este pacote não tem dependências para instalar. |
| Environment Variables | Nenhuma variável é necessária nesta demonstração. |

A Vercel serve HTML/CSS/JS diretamente com **Other** e sem etapa de build. Sem uma pasta `public`, a saída padrão é a raiz (`.`); você pode defini-la explicitamente. [Configuração oficial de build e pasta raiz](https://vercel.com/docs/builds/configure-a-build)

### 4. Publicar e atualizar

Clique em **Deploy**. Quando terminar, abra a URL exibida. Para atualizar, envie os arquivos alterados à branch de produção do repositório, normalmente `main`; a integração dispara outra publicação automaticamente. [Deploys a partir do Git](https://vercel.com/docs/git)

## Alternativa: publicar pelo PowerShell

Esta opção exige Node.js e npm disponíveis no computador. Instale a CLI oficial e autentique-se quando for executar a publicação:

```powershell
npm.cmd install --global vercel
vercel.cmd login
```

A CLI oferece instalação pelo npm e login pela conta Vercel. [Documentação da CLI](https://vercel.com/docs/cli)

Na primeira publicação desta pasta como projeto independente:

```powershell
Set-Location -LiteralPath 'C:\Users\angel\OneDrive\Documents\ChatGPT\malta\SIPAE-html-css-js'
vercel.cmd --prod
```

No assistente, escolha sua conta/equipe, crie um projeto novo, informe um nome e use `./` como diretório do código. Confira as configurações estáticas da tabela acima. Para atualizar esse mesmo projeto depois de vinculado, execute novamente `vercel.cmd --prod` nessa pasta. O comando envia os arquivos à Vercel; o parâmetro `--prod` seleciona a publicação de produção. [Comando oficial de deploy](https://vercel.com/docs/cli/deploy#prod)

Se você já importou um repositório com `SIPAE-html-css-js` como subpasta, prefira atualizar pelo Git para manter a configuração de Root Directory consistente.

## Conferir depois da publicação

1. Abra a URL recebida e confira a tela de entrada e os estilos.
2. Use o login de demonstração: NIF **123456789** e senha **sipae2026**.
3. Selecione **Diretor** e abra o dashboard do Malta.
4. Experimente o botão de agendar reserva externa, busque uma sala e confirme um período disponível.
5. Confira os registros no calendário e em Reservas Externas, e experimente o cancelamento.
6. Teste também no celular e atualize uma página interna para conferir a navegação.

O projeto usa rotas com `#`, por exemplo `/#diretor/dashboard`. Elas são tratadas pelo JavaScript no navegador. Para esta estrutura, não é necessário adicionar regra de rewrite ou `vercel.json`.

Se aparecer um 404 na página inicial, confira se o `index.html` está dentro da Root Directory e da pasta de saída selecionadas. Se a interface abrir sem estilos ou ações, verifique se todos os `.css` e `.js` do pacote foram enviados junto com ele. Se aparecer erro procurando `dist` ou tentando executar um build, reveja **Other**, o comando vazio e a saída `.`. [Sites estáticos sem etapa de build](https://vercel.com/docs/builds#skipping-the-build-step)

## O que essa hospedagem disponibiliza

A publicação permite abrir e demonstrar a interface por uma URL. O login e a troca de perfil são simulados; os dados de exemplo ficam nos arquivos do navegador. **Reservas, edições e fotos adicionadas durante o uso continuam em memória e são perdidas ao recarregar**, sem sincronização entre pessoas ou dispositivos.

Para operar com reservas reais compartilhadas, será necessário acrescentar autenticação, autorização e persistência em servidor/banco de dados. Hospedar o pacote atual na Vercel preserva seu funcionamento como demonstração.
