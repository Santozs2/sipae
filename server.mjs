import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';

const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/data.js', ['data.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]
]);

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número entre 1 e 65535.');
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Método não permitido.');
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url || '/', 'http://localhost').pathname;
  } catch {
    response.writeHead(400, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Endereço inválido.');
    return;
  }

  const asset = publicFiles.get(pathname);
  if (!asset) {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Arquivo não encontrado.');
    return;
  }

  try {
    const [fileName, contentType] = asset;
    const body = await readFile(new URL(fileName, import.meta.url));
    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Falha ao ler arquivo público:', error);
    response.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Erro interno do servidor.');
  }
});

server.listen(port, host, () => {
  console.log(`SIPAE Alocação Docente: http://${host}:${port}`);
});
