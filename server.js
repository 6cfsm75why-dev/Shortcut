const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());
app.use(express.text());

// ── Config ──────────────────────────────────────────────────────────────────
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'hayden-bridge-123'; // change this!

// In-memory store: { [session]: [{ text, ts }] }
const replyStore = {};

// ── 1. Web page sends a message ─────────────────────────────────────────────
// Pipedream posts here, OR the web page posts here directly
// Body: { text, session }
app.post('/messages/:session', (req, res) => {
  const { session } = req.params;
  const text = req.body?.text || req.body || '';
  console.log(`[→ from web] session=${session} text="${text}"`);

  // Send ntfy notification to your phone
  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: {
      'Title':   'Shortcut Bridge',
      'Content-Type': 'text/plain'
    },
    body: `${text}\n\nSession: ${session}`
  }).catch(err => console.error('ntfy error:', err));

  res.json({ ok: true, session, text });
});

// ── 2. Web page polls for replies ───────────────────────────────────────────
app.get('/poll/:session', (req, res) => {
  const { session } = req.params;
  const messages = replyStore[session] || [];
  // Clear after sending so messages only appear once
  replyStore[session] = [];
  res.json({ messages });
});

// ── 3. Your iPhone sends a reply (from Shortcut or ntfy action) ─────────────
// POST /reply/:session  body: { text } or plain text
app.post('/reply/:session', (req, res) => {
  const { session } = req.params;
  const text = req.body?.text || req.body || '';
  console.log(`[← reply] session=${session} text="${text}"`);
  if (!replyStore[session]) replyStore[session] = [];
  replyStore[session].push({ text, ts: Date.now() });
  res.json({ ok: true });
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Shortcut Bridge online 🟢' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bridge running on port ${PORT}`));
