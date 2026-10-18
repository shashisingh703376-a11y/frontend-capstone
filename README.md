# Frontend Capstone

A weekly-assignment showcase built with **React 19 + Vite**. Each assignment lives on its own hash route so earlier work is preserved. The latest assignment (Week 6 / FE-11) adds a real AI generation flow backed by an Anthropic Claude serverless function on Vercel, with rate limiting, input validation, and full accessibility support.

## Live Demo

> **Production URL:** _add your Vercel URL here after deployment_

---

## Features

- **AI-powered generation** — prompts are sent server-side to Claude; API key never touches the browser
- **Rate limiting** — 10 requests per IP per 60-second window on the `/api/generate` endpoint
- **Input validation** — client-side character counter + server-side schema checks; oversized bodies are rejected
- **Accessible UI** — `aria-busy`, `aria-live`, `role="alert"`, `prefers-reduced-motion`, skip links, keyboard navigation
- **Multi-state button** — idle → loading → success / error with CSS micro-animations
- **Per-assignment routing** — hash router keeps every weekly page in place

---

## Screenshots

> _Add screenshots of the live app here. Replace these placeholders before submitting._
>
> **Suggested shots:**
> - Home page
> - AI Action Studio — idle state
> - AI Action Studio — loading state
> - AI Action Studio — success state with generated copy
> - AI Action Studio — error / rate-limited state

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 6 |
| AI provider | Anthropic Claude (`claude-haiku-4-5`) |
| Serverless functions | Vercel Functions (`api/`) |
| Styling | Plain CSS with custom properties |
| Testing | Vitest + Testing Library + jsdom |
| Package manager | npm |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS or later
- npm (bundled with Node.js)
- An [Anthropic API key](https://console.anthropic.com/) (for the real AI call)
- [Vercel CLI](https://vercel.com/docs/cli) (optional — for local serverless function testing)

### Clone and install

```bash
git clone <your-repo-url>
cd frontend-capstone
npm install
```

### Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY to your real key
```

### Start the development server

```bash
# Without serverless functions (Generate button uses forced-outcome mock):
npm run dev

# With serverless functions (real Anthropic call):
npx vercel dev
```

Open the URL printed in the terminal (usually `http://localhost:5173` or `http://localhost:3000`).

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server-side key used by `api/generate.js` to call the Anthropic API. Never exposed to the browser. | Yes (production) |

> **Never** commit `.env.local` or any file containing your real key. The `.env.example` file contains only placeholder values and is safe to commit.

---

## Scripts

```bash
npm run dev          # start Vite dev server
npm run build        # production build → dist/
npm run preview      # serve the production build locally
npm test             # run all tests once (Vitest)
npm run test:watch   # run tests in watch mode
npm run test:coverage # generate coverage report
```

---

## Architecture

```
Browser (React SPA)
  │
  ├─ Hash router  /#/  →  Home page
  │               /#/action-studio  →  ActionStudio page
  │
  └─ POST /api/generate  (fetch)
          │
          ▼
  Vercel Serverless Function  (api/generate.js)
          │  • validates IP rate limit (in-memory sliding window)
          │  • validates prompt (type, length ≤ 1000 chars, body ≤ 8 KB)
          │  • reads ANTHROPIC_API_KEY from env (server-only)
          │
          ▼
  Anthropic Claude API  (claude-haiku-4-5, max_tokens 256)
          │
          ▼
  JSON response  { title, body }  →  rendered in UI
```

**Key files**

| File | Purpose |
|---|---|
| `api/generate.js` | Vercel serverless function; all server-side logic |
| `src/lib/rateLimit.js` | Sliding-window rate limiter (shared, testable module) |
| `src/lib/fakeGenerate.js` | Client fetch wrapper + prompt validator; forced-outcome mock for demo buttons |
| `src/pages/ActionStudio.jsx` | Main page component; state machine for button |
| `src/components/GenerateButton.jsx` | Reusable multi-state button |

---

## Security

| Safeguard | Detail |
|---|---|
| **API key isolation** | `ANTHROPIC_API_KEY` is read only in `api/generate.js`; it is never bundled into the client JS |
| **Rate limiting** | 10 requests / IP / 60 s on `/api/generate`. Returns HTTP 429 with `Retry-After`. In-memory — see trade-offs below. |
| **Input length** | Prompt trimmed and capped at 1,000 characters client-side and server-side |
| **Body size** | Requests larger than 8 KB are rejected with HTTP 413 |
| **Error messages** | Internal errors and stack traces are logged server-side only; clients receive a generic message |
| **`maxDuration`** | Set to 30 s on the serverless function (Vercel Hobby limit) |
| **No `NEXT_PUBLIC_`** | Not a Next.js project; no client-exposed env vars |

---

## Design Decisions and Trade-offs

### In-memory rate limiter

The rate limiter uses a `Map` inside the serverless function module. This means:

- ✅ Zero infrastructure cost, no external dependency
- ⚠️ State is **not shared** across Vercel instances or cold starts. A determined user can exceed the limit by hitting different instances.

**Production upgrade path:** Replace the `Map` with [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Upstash Redis) for a shared, persistent counter.

### Hash routing vs. React Router

A custom 30-line hash router avoids the need for a `vercel.json` rewrite to serve `index.html` for every path, which simplifies the SPA-on-Vercel setup.

### `claude-haiku-4-5` model choice

Haiku is the fastest and cheapest Claude model, appropriate for a demo with short prompts and a 256-token output cap. Swap to `claude-sonnet-4-5` or `claude-opus-4-5` in `api/generate.js` for higher quality at higher cost.

### Forced-outcome demo buttons

**Simulate Success** and **Simulate Failure** bypass the real API call and use the local mock. This lets the UI demo work in plain `npm run dev` without an API key, and keeps demo traffic free.

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** your repository.
3. Framework preset: **Vite** (auto-detected).
4. In **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your real key — enable for **Production** only (not Preview unless you want to spend quota on PR previews).
5. Click **Deploy**. Vercel will run `npm run build` and deploy `dist/` as a static site with the `api/` functions alongside it.
6. Copy the production URL into this README.

### Manual / other platforms

```bash
npm run build
# Serve the dist/ directory from any static host.
# The /api/generate route requires a Node.js serverless or edge runtime.
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Generate button returns "Server configuration error" | `ANTHROPIC_API_KEY` not set | Add the variable in Vercel → Settings → Environment Variables |
| Generate button works locally but not on Vercel | Key set for Development but not Production | Enable the variable for the Production environment |
| Rate-limit resets instantly in local testing | In-memory store resets on each Vercel cold start | Expected; use `npx vercel dev` to simulate a persistent process locally |
| `npm run dev` — Generate returns an error | No `/api/generate` route in plain Vite | Use `npx vercel dev` for local serverless function support, or click Simulate Success |
| Build fails with missing module | `node_modules` out of date | Run `npm install` |

---

## How AI Tools Built This

**Tools used:** Google Antigravity (Claude Sonnet, thinking mode)

**What the agent implemented:**
- Scaffolded the Vite + React 19 project structure
- Built the `GenerateButton` multi-state component and CSS micro-animations
- Wrote the custom hash router
- Created `api/generate.js` with Anthropic SDK integration, rate limiting, and input validation
- Added Vitest configuration and wrote 16 unit and integration tests
- Updated `fakeGenerate.js` to call the real API with a mock fallback for demo buttons
- Wrote this README

**What I reviewed and tested:**
- Confirmed no API keys appear in the browser bundle
- Ran all 16 tests and verified the production build
- _(Add notes about any manual testing you performed on the live URL)_

**Remaining limitations:**
- Rate limiter is in-memory only; shared KV store is not yet implemented
- Safari and mobile browser testing _(note your actual test results here)_
- Production URL placeholder must be replaced before submission

---

## License

[MIT](LICENSE)
