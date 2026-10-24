# SchoolVerse

A premium AI student website. `index.html` is the whole front end (no build step).

## 1. Run it (demo mode, no AI)
Double-click `index.html`. Everything works except real AI answers: timer, quiz, diagrams, notes templates, library, themes, TXT/PNG/PDF export.
Voice input needs `https://` or `http://localhost`, so use step 2 for that.

## 2. Run with real AI
1. Install Node 18+.
2. In this folder:
   - Mac/Linux: `ANTHROPIC_API_KEY=your_key node server.js`
   - Windows (PowerShell): `$env:ANTHROPIC_API_KEY="your_key"; node server.js`
3. Open http://localhost:3000. The sidebar badge turns green: "AI connected".

The key stays on the server. The browser only talks to `/api/chat`.

## 3. Deploy online
- **Demo only (free):** upload `index.html` to Netlify Drop, GitHub Pages or Vercel. AI stays in demo mode.
- **With AI:** deploy the folder to Render / Railway / Fly.io as a Node web service.
  Start command `node server.js`; add `ANTHROPIC_API_KEY` as an environment variable (never commit it).
- Before sharing publicly, add login and a stronger rate limit so strangers can't spend your API credits.

## What is real vs demo
| Feature | Without backend | With backend |
|---|---|---|
| Tutor answers | Pre-written samples for 6 topics (labelled DEMO) | Live AI |
| Notes | Samples for 3 topics, basic text extract, empty template | Live AI |
| Quiz | 23 sample questions | + AI-generated questions |
| Diagrams, timer, library, exports | Fully working | Same |
| Voice input / spoken answers | Browser features (Chrome/Edge/Safari) | Same |
