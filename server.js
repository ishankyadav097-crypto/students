// SchoolVerse backend — keeps your API key on the server, never in the browser.
// Run:  ANTHROPIC_API_KEY=sk-ant-... node server.js   (Node 18+)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const PORT = process.env.PORT || 3000;

const SYSTEM = {
  tutor: (g) => `You are SchoolVerse's friendly study tutor for a Class ${g || '6-12'} student in India. Reply in the language the student uses (Hindi, Hinglish or English). Give simple, accurate, step-by-step explanations with a short example or analogy. Use markdown: "## heading", "- bullets", "**bold**". If the answer is better shown visually, mention which diagram would help. End with no more than one short follow-up question. If you are unsure, say so.`,
  notes: (g) => `You write clear study notes for a Class ${g || '9'} student. Use only markdown: "# title", "## section", "- bullets", "**bold**". Create exactly the sections requested, in order. Be accurate and concise.`,
  quiz: () => `You write school quiz questions. Return ONLY a JSON array, no other text. Each item: {"q": string, "o": [4 option strings], "a": index of correct option (0-3), "e": short explanation}.`,
};

const hits = new Map(); // naive per-IP rate limit: 30 requests / minute
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 30;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => {
      d += c;
      if (d.length > 100_000) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

async function askClaude(system, messages, max = 1500) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: max, system, messages }),
  });
  if (!r.ok) throw new Error(`Model API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(DIR, 'index.html')));
    }
    if (req.method === 'GET' && req.url === '/api/health') {
      return KEY ? send(res, 200, { ok: true }) : send(res, 503, { error: 'ANTHROPIC_API_KEY is not set' });
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      if (!KEY) return send(res, 503, { error: 'ANTHROPIC_API_KEY is not set on the server.' });
      if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'Too many requests. Please wait a minute.' });
      const b = JSON.parse(await readBody(req));
      const g = String(b.grade || '').slice(0, 3);
      if (b.task === 'tutor') {
        const msgs = (b.messages || []).slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) }));
        if (!msgs.length || msgs[0].role !== 'user') return send(res, 400, { error: 'Invalid messages' });
        return send(res, 200, { reply: await askClaude(SYSTEM.tutor(g), msgs) });
      }
      if (b.task === 'notes') {
        const prompt = `Subject: ${b.subject}\nTopic: ${b.topic || '(from pasted text)'}\nSections: ${(b.sections || []).join(', ')}\n${b.text ? 'Source text:\n' + String(b.text).slice(0, 8000) : ''}`;
        return send(res, 200, { reply: await askClaude(SYSTEM.notes(g), [{ role: 'user', content: prompt }], 3000) });
      }
      if (b.task === 'quiz') {
        const n = Math.min(Math.max(+b.count || 10, 3), 15);
        const prompt = `Write ${n} multiple-choice questions. Subject: ${b.subject}. Chapter: ${b.chapter}. Difficulty: ${b.difficulty}. Class ${g}.`;
        return send(res, 200, { reply: await askClaude(SYSTEM.quiz(), [{ role: 'user', content: prompt }], 3000) });
      }
      return send(res, 400, { error: 'Unknown task' });
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`SchoolVerse running at http://localhost:${PORT}  (AI ${KEY ? 'enabled' : 'DISABLED — set ANTHROPIC_API_KEY'})`));
