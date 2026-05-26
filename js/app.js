// App principal modularizado
let CONTENT = null;
let FULL_MANUAL_TEXT = null;
let currentView = 'overview';
let chatMessages = [];
let isLoading = false;
const expanded = {};
const CHIPS = ["Como configurar permissões de acesso?","O que é o aprazamento de enfermagem?","Como funciona a assinatura digital?","Quais os tipos de dieta no PEP?","Como ativar a checagem por código de barras?","Como funciona a alta do paciente?"];
let PEP_CONTEXT = `Você é um assistente especialista no Manual do PEP (Prontuário Eletrônico do Paciente) Hospital Geral — SPDATA SGH® Versão 25.`;

function escapeHtml(text) {
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderMarkdown(text) {
  let html = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(\n|$)(?!<li>)/g, '<ul>$1</ul>\n')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  if (!html.startsWith('<')) html = '<p>' + html + '</p>';
  return html;
}

// --- Render / UI ---
function render() {
  const main = document.getElementById('main');
  if (!CONTENT) {
    main.innerHTML = '<div class="content-wrap"><p>Carregando conteúdo...</p></div>';
    return;
  }
  if (currentView === 'overview') renderOverview(main);
  else if (currentView === 'chat') renderChat(main);
  else renderModule(main, currentView);
}

function renderOverview(container) {
  const data = CONTENT.overview;
  const grid = data.modules.map(m => `
    <div class="module-card" onclick="navigate('${m.nav}')">
      <div class="mc-icon"><i class="ti ${m.icon}"></i></div>
      <div class="mc-name">${m.name}</div>
      <div class="mc-desc">${m.desc}</div>
    </div>`).join('');

  container.innerHTML = `<div class="content-wrap">
    <div class="page-header">
      <div class="menu-toggle" onclick="toggleSidebar()"><i class="ti ti-menu-2"></i></div>
      <div class="page-title">${data.title}</div>
      <div class="page-badge">${data.badge}</div>
    </div>
    <p style="font-size:14px;color:var(--text2);margin-bottom:20px;line-height:1.6">O PEP (Prontuário Eletrônico do Paciente) é o módulo central do SPDATA SGH® para registrar dados de saúde do paciente. Selecione um módulo abaixo para estudar seus pontos principais.</p>
    <div class="modules-grid">${grid}</div>
    <div class="cta-card">
      <i class="ti ti-robot"></i>
      <div><div class="cta-title">Assistente IA do Manual</div><div class="cta-desc">Tire dúvidas sobre qualquer funcionalidade do PEP com o assistente de IA treinado no manual.</div></div>
      <button class="cta-btn" onclick="navigate('chat')">Abrir chat →</button>
    </div>
  </div>`;
}

function renderModule(container, view) {
  const data = CONTENT[view];
  if (!data) return;
  const sections = data.sections.map((s, i) => {
    const id = view + i;
    if (!(id in expanded)) expanded[id] = true;
    return `
      <div class="card">
        <div class="card-header" onclick="toggleCard('${id}')">
          <div class="card-header-icon"><i class="ti ${s.icon}"></i></div>
          <div class="card-header-title">${s.title}</div>
          <i class="chevron ti ti-chevron-down${expanded[id] ? ' open' : ''}" id="chev-${id}"></i>
        </div>
        <div class="card-body" id="cb-${id}" style="display:${expanded[id] ? 'block' : 'none'}">
          ${s.points.map(p => `<div class="key-point"><div class="kp-dot"></div><div>${p}</div></div>`).join('')}
          ${s.tip ? `<div class="tip-box"><i class="ti ti-bulb"></i><div><strong>Dica:</strong> ${s.tip}</div></div>` : ''}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="content-wrap">
    <div class="page-header">
      <div class="menu-toggle" onclick="toggleSidebar()"><i class="ti ti-menu-2"></i></div>
      <div class="back-btn" onclick="navigate('overview')"><i class="ti ti-arrow-left"></i></div>
      <div class="page-title">${data.title}</div>
      <div class="page-badge">${data.badge}</div>
    </div>
    ${sections}
    <div class="bottom-hint">
      <i class="ti ti-message-question"></i>
      <span>Ficou com dúvidas sobre esse módulo?</span>
      <button onclick="navigate('chat')">Perguntar ao assistente →</button>
    </div>
  </div>`;
}

function renderChat(container) {
  let msgsHtml = '';
  if (chatMessages.length === 0) {
    msgsHtml = `<div class="chat-empty">
      <i class="ti ti-robot"></i>
      <div class="ce-title">Assistente do Manual PEP</div>
      <div class="ce-desc">Pergunte qualquer coisa sobre o SPDATA SGH® Versão 25. Estou treinado no manual completo.</div>
    </div>`;
  } else {
    msgsHtml = chatMessages.map(m => {
      if (m.role === 'user') return `<div class="msg msg-user"><div class="bubble">${escapeHtml(m.content)}</div></div>`;
      return `<div class="msg msg-ai">
        <div class="ai-avatar"><i class="ti ti-robot"></i></div>
        <div class="bubble-wrap">
          <div class="bubble-label">PEP Assistente</div>
          <div class="bubble">${renderMarkdown(m.content)}</div>
        </div>
      </div>`;
    }).join('');
    if (isLoading) msgsHtml += `<div class="msg msg-ai">
      <div class="ai-avatar"><i class="ti ti-robot"></i></div>
      <div class="bubble-wrap"><div class="bubble-label">PEP Assistente</div>
      <div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>
    </div>`;
  }

  const chipsHtml = chatMessages.length === 0 ? `<div class="chips-area">${CHIPS.map(c=>`<div class="chip" onclick="sendChip(this)">${c}</div>`).join('')}</div>` : '';

  container.innerHTML = `<div class="chat-area">
    <div class="chat-topbar">
      <div class="menu-toggle" onclick="toggleSidebar()"><i class="ti ti-menu-2"></i></div>
      <div class="back-btn" onclick="navigate('overview')"><i class="ti ti-arrow-left"></i></div>
      <div class="ct-title">Assistente IA</div>
      ${chatMessages.length > 0 ? `<button class="clear-btn" onclick="clearChat()">Limpar</button>` : ''}
    </div>
    <div class="chat-messages" id="msgs">${msgsHtml}</div>
    ${chipsHtml}
    <div class="chat-input-area">
      <textarea id="inp" placeholder="Pergunte sobre qualquer funcionalidade do PEP..." onkeydown="handleKey(event)"></textarea>
      <button class="send-btn" id="sbtn" onclick="sendMessage()" ${isLoading?'disabled':''}><i class="ti ti-send"></i></button>
    </div>
  </div>`;

  const msgs = document.getElementById('msgs');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// --- Interactions ---
function navigate(view) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('nav-' + view);
  if (el) el.classList.add('active');
  currentView = view;
  if (window.innerWidth <= 768) toggleSidebar(false);
  render();
}

function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const isOpen = sidebar.classList.contains('open');
  const nextState = force !== undefined ? force : !isOpen;
  if (nextState) { sidebar.classList.add('open'); overlay.classList.add('active'); }
  else { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
}

function toggleCard(id) {
  expanded[id] = !expanded[id];
  const body = document.getElementById('cb-' + id);
  const chev = document.getElementById('chev-' + id);
  if (body) body.style.display = expanded[id] ? 'block' : 'none';
  if (chev) chev.className = 'chevron ti ti-chevron-down' + (expanded[id] ? ' open' : '');
}

function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
function sendChip(el) { const text = el.textContent; const inp = document.getElementById('inp'); if (inp) inp.value = text; sendMessage(); }
function clearChat() { chatMessages = []; render(); }

// --- Manual search (RAG) ---
function getManualSections() {
  if (!FULL_MANUAL_TEXT) return [];
  if (window._manualSections) return window._manualSections;
  const raw = FULL_MANUAL_TEXT;
  const sectionRegex = /(?=\n\d+(?:\.\d+)*\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g;
  const parts = raw.split(sectionRegex).filter(s => s.trim().length > 100);
  window._manualSections = parts.map(section => {
    const lines = section.trim().split('\n').filter(l => l.trim());
    const title = lines[0] || '';
    return { title: title.trim(), content: section.trim() };
  });
  return window._manualSections;
}

function searchManual(query) {
  const sections = getManualSections();
  if (sections.length === 0) return 'Manual não carregado.';
  const queryWords = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(w => w.length > 2);
  const scored = sections.map(section => {
    const normalized = (section.title + ' ' + section.content).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let score = 0; queryWords.forEach(word => { const matches = (normalized.match(new RegExp(word, 'g')) || []).length; score += matches; });
    const titleNorm = section.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); queryWords.forEach(word => { if (titleNorm.includes(word)) score += 10; });
    return { ...section, score };
  });
  scored.sort((a, b) => b.score - a.score);
  let result = ''; let charCount = 0; const maxChars = 40000;
  const top5 = scored.filter(s => s.score > 0).slice(0, 5);
  for (const section of top5) {
    if (charCount + section.content.length > maxChars) {
      const remaining = maxChars - charCount;
      if (remaining > 500) { result += '\n---\n' + section.content.substring(0, remaining) + '...\n'; }
      break;
    }
    result += '\n---\n' + section.content + '\n';
    charCount += section.content.length;
  }
  return result || 'Nenhuma seção relevante encontrada no manual.';
}

// --- Chat ---
async function sendMessage() {
  const inp = document.getElementById('inp');
  if (!inp || isLoading) return; const text = inp.value.trim(); if (!text) return;
  chatMessages.push({ role: 'user', content: text }); inp.value = ''; isLoading = true; render();
  try {
    const relevantContext = searchManual(text);
    const messages = [ { role: 'system', content: PEP_CONTEXT + '\n\nTRECHOS RELEVANTES DO MANUAL COMPLETO:\n\n' + relevantContext }, ...chatMessages.map(m => ({ role: m.role, content: m.content })) ];
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
    const data = await res.json();
    if (data.error) { chatMessages.push({ role: 'assistant', content: 'Erro da API: ' + (data.error.message || String(data.error)) }); }
    else {
      const responseText = data.choices?.[0]?.message?.content || data.content || 'Não consegui processar a resposta.';
      chatMessages.push({ role: 'assistant', content: responseText });
    }
  } catch (e) {
    chatMessages.push({ role: 'assistant', content: 'Ocorreu um erro ao conectar com o assistente. Tente novamente.' });
  }
  isLoading = false; render();
}

// --- Inicialização ---
async function loadContent() {
  try {
    const r = await fetch('data/content.json');
    if (!r.ok) throw new Error('Falha ao carregar content.json');
    CONTENT = await r.json();
  } catch (e) {
    console.error('Erro ao carregar content.json', e);
    CONTENT = null;
  }
}

async function loadManual() {
  try {
    const r = await fetch('data/manual.txt');
    if (!r.ok) throw new Error('manual.txt não encontrado');
    FULL_MANUAL_TEXT = await r.text();
  } catch (e) {
    console.warn('manual.txt não carregado — fallback para window.FULL_MANUAL_TEXT se definido');
    if (typeof window.FULL_MANUAL_TEXT !== 'undefined') FULL_MANUAL_TEXT = window.FULL_MANUAL_TEXT;
  }
}

async function init() {
  await loadContent();
  await loadManual();
  // expose functions for inline handlers
  window.navigate = navigate;
  window.toggleSidebar = toggleSidebar;
  window.toggleCard = toggleCard;
  window.sendChip = sendChip;
  window.clearChat = clearChat;
  window.sendMessage = sendMessage;
  window.handleKey = handleKey;
  render();
}

init();
