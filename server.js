const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname);

let MANUAL_TEXT = null;
let MANUAL_SECTIONS = null;

// Carregar manual uma vez na inicialização
function loadManual() {
  try {
    MANUAL_TEXT = fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'manual.txt'), 'utf-8');
    const sectionRegex = /(?=\n\d+(?:\.\d+)*\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g;
    const parts = MANUAL_TEXT.split(sectionRegex).filter(s => s.trim().length > 100);
    MANUAL_SECTIONS = parts.map(section => {
      const lines = section.trim().split('\n').filter(l => l.trim());
      const title = lines[0] || '';
      return { title: title.trim(), content: section.trim() };
    });
  } catch (e) {
    console.warn('Manual não carregado:', e.message);
    MANUAL_SECTIONS = [];
  }
}

// Busca RAG simples: encontra seções relevantes
function searchManual(query) {
  if (!MANUAL_SECTIONS || MANUAL_SECTIONS.length === 0) return '';
  
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = MANUAL_SECTIONS.map(section => {
    const normalized = (section.title + ' ' + section.content).toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      const matches = (normalized.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    });
    const titleNorm = section.title.toLowerCase();
    queryWords.forEach(word => {
      if (titleNorm.includes(word)) score += 10;
    });
    return { ...section, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.filter(s => s.score > 0).slice(0, 3);
  
  if (top3.length === 0) return '';
  return top3.map(s => s.content.substring(0, 500)).join('\n---\n');
}

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
      const provider = String(payload.provider || 'groq').toLowerCase();
      const providers = {
        groq: {
          apiKey: process.env.GROQ_API_KEY,
          url: 'https://api.groq.com/openai/v1/chat/completions',
          model: 'llama-3.3-70b-versatile'
        },
        cloude: {
          apiKey: process.env.CLOUDE_API_KEY,
          url: 'https://api.cloude.ai/v1/chat/completions',
          model: 'cloude-2.1'
        },
        gemini: {
          apiKey: process.env.GEMINI_API_KEY,
          url: 'https://gemini.googleapis.com/v1/chat/completions',
          model: 'gemini-pro'
        }
      };

      const config = providers[provider] || providers.groq;
      const messages = payload.messages || [];

      if (config.apiKey) {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.3,
            max_tokens: 2048
          })
        });

        const data = await response.json();
        return sendJson(res, response.status, data);
      }

      const userMessage = messages.slice().reverse().find(m => m.role === 'user');
      const userText = userMessage ? String(userMessage.content) : 'sem mensagem';
      const relevantContext = searchManual(userText);
      let reply;

      if (relevantContext) {
        reply = `Com base no manual do PEP:\n\n${relevantContext}\n\n---\n\nPara obter respostas com IA real, configure a variável de ambiente ${provider.toUpperCase()}_API_KEY e escolha o provedor ${provider.toUpperCase()}.`;
      } else {
        reply = `Não encontrei seções do manual relacionadas a "${userText}". Configure a variável de ambiente ${provider.toUpperCase()}_API_KEY e escolha o provedor ${provider.toUpperCase()} para usar a IA real.`;
      }

      return sendJson(res, 200, {
        id: 'mock-chat-1',
        object: 'chat.completion',
        model: 'mock-local-rag',
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

loadManual();
server.listen(PORT, () => {
  console.log(`Servidor local rodando em http://localhost:${PORT}`);
  console.log(`Manual carregado: ${MANUAL_SECTIONS.length} seções`);
  console.log(`Use GROQ_API_KEY, CLOUDE_API_KEY ou GEMINI_API_KEY para ativar o assistente com IA.`);
});

