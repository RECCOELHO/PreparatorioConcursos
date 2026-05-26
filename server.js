const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const raw = await getBody(req);
      const payload = JSON.parse(raw || '{}');
      const userMessage = (payload.messages || []).reverse().find(m => m.role === 'user');
      const userText = userMessage ? String(userMessage.content).slice(0, 300) : 'sem mensagem';
      const reply = `Resposta mock do assistente local. Mensagem recebida: ${userText}`;
      return sendJson(res, 200, {
        id: 'mock-chat-1',
        object: 'chat.completion',
        model: 'mock-local',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: reply
            }
          }
        ]
      });
    } catch (error) {
      return sendJson(res, 400, { error: { message: 'Falha ao processar JSON de entrada.' } });
    }
  }

  let pathnameSafe = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, pathnameSafe);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acesso proibido');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (pathname === '/') {
        return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado');
    }
    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor local rodando em http://localhost:${PORT}`);
});
