const chat = document.querySelector('#chat');
const form = document.querySelector('#form');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
const clear = document.querySelector('#clear');
const STORAGE_KEY = 'friendai-history';
const MAX_HISTORY = 60;

let history = loadHistory();
let busy = false;

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved)
      ? saved.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-MAX_HISTORY)
      : [];
  } catch { return []; }
}

function saveHistory() {
  history = history.slice(-MAX_HISTORY);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch {}
}

function render() {
  chat.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<strong>👋 Hey!</strong><span>I’m Friend-Ai. Ask me anything, or just start chatting.</span>';
    chat.appendChild(empty);
    return;
  }
  for (const m of history) addBubble(m.role, m.content, false);
  scrollToBottom();
}

function addBubble(role, text, save = true) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = String(text ?? '');
  chat.appendChild(el);
  if (save) {
    history.push({ role, content: String(text ?? '') });
    saveHistory();
  }
  scrollToBottom();
  return el;
}

function scrollToBottom() {
  requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
}

function setBusy(value) {
  busy = value;
  send.disabled = value;
  send.textContent = value ? '…' : '➤';
  input.disabled = value;
}

function formatError(value, status) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
    try { return JSON.stringify(value); } catch {}
  }
  return `Request failed (${status}).`;
}

async function readResponse(res) {
  const raw = await res.text();
  if (!raw.trim()) throw new Error(`Server returned an empty response (${res.status}).`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const hint = raw.includes('<!DOCTYPE') || raw.includes('<html')
      ? 'Vercel returned a web page instead of the API response.'
      : `Server returned invalid JSON (${res.status}).`;
    throw new Error(hint);
  }

  if (!res.ok) throw new Error(formatError(data.error ?? data.message, res.status));
  if (typeof data.reply !== 'string') throw new Error('API response is missing a reply.');
  return data.reply;
}

render();

clear.onclick = () => {
  if (!history.length || confirm('Clear this chat?')) {
    history = [];
    localStorage.removeItem(STORAGE_KEY);
    render();
    input.focus();
  }
};

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 140) + 'px';
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;

  addBubble('user', text);
  input.value = '';
  input.style.height = 'auto';
  setBusy(true);
  const pending = addBubble('assistant', 'Thinking…', false);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ messages: history })
    });

    const reply = await readResponse(res);
    pending.remove();
    addBubble('assistant', reply);
  } catch (err) {
    const message = err instanceof Error ? err.message : formatError(err);
    pending.textContent = `⚠️ ${message || 'Something went wrong.'}`;
    pending.dataset.error = 'true';
  } finally {
    setBusy(false);
    input.focus();
  }
});
