# Frontend Capstone · AI Product Studio

> **Week 8 Capstone Portfolio Project:** *“Ship It — Your First Production AI Product”*

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Live%20on%20Vercel-success?logo=vercel)](https://frontend-capstone-shashi-3533.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19.1.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Tests-58%20Passing-success?logo=vitest)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-64.6%25%20Lines-brightgreen)](https://vitest.dev/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA%20Pass-teal)](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 1. Project Brief

Modern developers, product marketers, and founders frequently experience friction when drafting product announcements, outreach sequences, and conversion-focused hero copy. Existing tools often return plain, unstructured text walls that require heavy manual reformatting. **Frontend Capstone AI Product Studio** solves this problem by delivering a high-performance, accessible, production-grade web application that converts prompts into structured marketing copy packages (headline, narrative body, tone classification, key differentiator highlights, and actionable CTA button chips) with 1-click clipboard exporting. Built with **React 19 + Vite 6**, it couples an **AI Action Studio** with an **interactive 3D procedural spatial audio configurator (Three.js / React Three Fiber)** and a **live serverless diagnostic health check gateway**, engineered for enterprise-tier resilience, zero layout shifts, and safe fallback handling.

---

## 2. Live Application & Repository

- **Live Production URL:** [https://frontend-capstone-shashi-3533.vercel.app/](https://frontend-capstone-shashi-3533.vercel.app/)
- **Live Health Diagnostics API:** [https://frontend-capstone-shashi-3533.vercel.app/api/health](https://frontend-capstone-shashi-3533.vercel.app/api/health)
- **Deployment Platform:** Vercel (Edge network + Node.js Serverless Functions)
- **Framework Type:** React 19 Single Page Application (SPA) with Vercel Serverless Functions (`api/`)

---

## 3. Architecture & Tech Stack

```
Browser Client (React 19 + Vite SPA)
  │
  ├─ Hash Router (src/router.jsx)
  │   ├─ #/               → Assignment Studio Home
  │   ├─ #/action-studio  → AI Action Studio (Structured Copy, Streaming, Retry)
  │   ├─ #/configurator   → Interactive 3D Configurator (React Three Fiber / Three.js)
  │   ├─ #/health         → Live Deployment Diagnostics & Telemetry
  │   └─ #/simulate-route-error → Dev Route Error Boundary tester
  │
  ├─ Serverless APIs (api/ on Vercel Node.js runtime)
  │   ├─ GET  /api/health   → Runtime diagnostics, memory usage, uptime, key status
  │   └─ POST /api/generate → Sliding-window rate limiter, prompt schema validator,
  │                           Gemini & Claude routing, SSE streaming
  │
  └─ Upstream AI Providers (Isolated server-side; keys never touch browser)
      ├─ Google Gemini: gemini-3.8-flash (@google/genai) [Primary / Free]
      └─ Anthropic Claude: claude-3-5-haiku-20241022 (@anthropic-ai/sdk) [Fallback]
```

### Stack Breakdown

| Layer | Technology | Rationale |
|---|---|---|
| **UI Framework** | React 19.1.0 | Latest concurrent features, transition hooks, server-state compatibility |
| **Bundler & Dev** | Vite 6.3.5 | Sub-second HMR, optimized Rollup bundling, custom dev middleware proxy |
| **AI Providers** | Google Gemini (`gemini-3.8-flash`) + Anthropic Claude (`claude-3-5-haiku-20241022`) | Dual-provider resilience with automatic fallback chain |
| **3D Engine** | Three.js + React Three Fiber + Drei | Procedural math geometry (0 KB download asset footprint) |
| **Serverless Functions** | Vercel Serverless (`api/`) | Ephemeral server-side endpoints isolating API credentials |
| **Styling** | Modular Vanilla CSS | CSS custom properties, native dark mode, WCAG AAA contrast, zero runtime overhead |
| **Testing** | Vitest 3.2.7 + Testing Library + JSDOM | Fast native ESM test runner with v8 coverage engine |

---

## 4. AI Integration & Prompt Strategy

### Model & Provider Configuration
- **Primary Provider:** Google Gemini via `@google/genai` utilizing `gemini-3.8-flash` (free tier via Google AI Studio).
- **Secondary Provider:** Anthropic Claude via `@anthropic-ai/sdk` utilizing `claude-3-5-haiku-20241022`.
- **Automatic Fallback:** If `GEMINI_API_KEY` is absent or encounters provider-level errors, the endpoint seamlessly switches to Anthropic Claude.

### Prompt Strategy & Structured Outputs
Rather than generating ambiguous conversational text, the system uses strict system instructions to guarantee a structured JSON schema:

```json
{
  "headline": "Punchy, attention-grabbing title",
  "body": "Compelling core narrative (2-3 sentences)",
  "callToAction": "Short, persuasive button CTA (2-4 words)",
  "tone": "Tone descriptor (e.g. Bold, Friendly, Urgency, Inspiring)",
  "keyTakeaways": [
    "Key differentiator or benefit 1",
    "Key differentiator or benefit 2",
    "Key differentiator or benefit 3"
  ]
}
```

The client-side `ActionStudio.jsx` detects this structured package and renders:
1. **Headline & Tone Pill:** High-visibility title paired with tone classification.
2. **Body Copy:** High-converting narrative text.
3. **Key Highlights:** Bulleted takeaway list.
4. **CTA Button Chip:** Recommended action phrasing.
5. **1-Click Clipboard Export:** Copy button with 2-second accessible status confirmation.

### Safe Failure Handling & Defenses
- **Serverless API Key Isolation:** `GEMINI_API_KEY` and `ANTHROPIC_API_KEY` are read solely on the server in `api/generate.js` and `api/health.js`. No `VITE_` prefix is used.
- **Sliding-Window IP Rate Limiter:** Limits traffic to **10 requests per IP per 60 seconds** with `429 Too Many Requests` and standard `Retry-After` HTTP headers.
- **Payload & Input Bounds:** Rejects prompts empty/whitespace or exceeding **1,000 characters** with `400 Bad Request`, and requests exceeding **8 KB** with `413 Payload Too Large`.
- **Cancellation (`AbortController`):** Users can halt in-flight generations cleanly via the "Stop" button.
- **Mid-stream Disconnect Recovery:** Detects dropped Server-Sent Events (SSE) connections and provides a de-duplicated "Retry" button.
- **Safe Sanitized Error Output:** Internal stack traces and key strings are stripped from responses; client receives generic, actionable error messages.

---

## 5. Testing & Verification

The project enforces automated regression testing using **Vitest** and **React Testing Library**.

### Test Suite Execution
```bash
# Run all tests once
npm test

# Run tests with code coverage analysis
npm run test:coverage
```

### Verified Test Results: 58 Tests Passing Across 9 Test Files
```
 ✓ src/test/validatePrompt.test.js (6 tests)
 ✓ src/test/rateLimit.test.js (5 tests)
 ✓ src/test/router.test.jsx (3 tests)
 ✓ src/test/Home.test.jsx (2 tests)
 ✓ src/test/RouteErrorBoundary.test.jsx (3 tests)
 ✓ src/test/HealthCheck.test.jsx (6 tests)
 ✓ src/test/apiGenerate.test.js (11 tests)
 ✓ src/test/ActionStudio.test.jsx (12 tests)
 ✓ src/test/Configurator.test.jsx (10 tests)

 Test Files  9 passed (9)
      Tests  58 passed (58)
```

### Verified Coverage Report (v8 Engine)
*Surpasses the capstone requirement of at least 50% coverage.*

| File / Module | % Stmts | % Branch | % Funcs | % Lines | Status |
|---|---|---|---|---|---|
| **All Project Files** | **64.60%** | **73.44%** | **65.47%** | **64.60%** | **PASS (>50%)** |
| `src/pages/Home.jsx` | 100% | 100% | 100% | 100% | PASS |
| `src/pages/NotFound.jsx` | 100% | 100% | 100% | 100% | PASS |
| `src/router.jsx` | 100% | 92.85% | 85.71% | 100% | PASS |
| `src/pages/ConfiguratorPage.jsx` | 94.75% | 87.75% | 71.42% | 94.75% | PASS |
| `src/pages/HealthCheck.jsx` | 95.28% | 46.80% | 40.00% | 95.28% | PASS |
| `src/pages/ActionStudio.jsx` | 91.01% | 75.36% | 63.15% | 91.01% | PASS |
| `src/components/GenerateButton.jsx` | 100% | 93.33% | 100% | 100% | PASS |
| `src/components/ConfiguratorFallback.jsx`| 100% | 92.30% | 100% | 100% | PASS |
| `src/components/RouteErrorBoundary.jsx` | 97.16% | 81.81% | 100% | 97.16% | PASS |
| `src/components/ConfiguratorErrorBoundary.jsx` | 93.54% | 87.50% | 83.33% | 93.54% | PASS |
| `src/lib/rateLimit.js` | 100% | 100% | 100% | 100% | PASS |
| `api/health.js` | 86.53% | 60.00% | 100% | 86.53% | PASS |

---

## 6. Audits: Lighthouse & WCAG 2.1 AA Accessibility

### Lighthouse Audit Scores (Production Build)

| Category | Score | Target | Status |
|---|---|---|---|
| **Performance** | **98** | 90+ (85 pass) | Exceeded |
| **Accessibility** | **100** | 90+ (85 pass) | Exceeded |
| **Best Practices** | **100** | 90+ (85 pass) | Exceeded |
| **SEO** | **100** | 90+ (85 pass) | Exceeded |

- **First Contentful Paint (FCP):** 0.7s
- **Speed Index:** 0.8s
- **Total Blocking Time (TBT):** 0ms
- **Cumulative Layout Shift (CLS):** 0.000 (Zero layout shift during generation)

### WCAG 2.1 AA Compliance Verification
- **Keyboard Traversal:** Complete keyboard focus order through skip links, nav links, prompt textarea, example chips, action buttons, radio groups, and copy chips.
- **Focus Indicators:** High-contrast visible focus rings via `:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }`.
- **Screen Reader Announcements:** 
  - `aria-busy="true"` dynamically set during active generation.
  - `aria-live="polite"` on output regions and telemetry cards.
  - `role="alert"` and `aria-live="assertive"` on error boundaries.
  - `role="radio"` and `aria-checked` on configurator selectors.
- **Color Contrast:** All body text (`#f5f3ff` on `#0b0714`) achieves a **15.2:1** contrast ratio (exceeding WCAG AAA 7:1).
- **Reduced Motion Support:** Respects `prefers-reduced-motion: reduce` by zeroing out transitions and disabling continuous 3D rotation and pulsing effects.

---

## 7. Deployment & Operations

### Deployment Checklist
- [x] Repository pushed to GitHub `main` branch with clean working tree.
- [x] Vitest suite passes completely (`npm test` → 58 passed).
- [x] Code coverage exceeds rubric threshold (`npm run test:coverage` → 64.6%).
- [x] Production build passes with zero bundle warnings (`npm run build`).
- [x] Vercel environment variables configured for **Production**:
  - `GEMINI_API_KEY`: Set to valid Google AI Studio key.
  - `ANTHROPIC_API_KEY`: Set to valid Anthropic Console key (fallback).
- [x] Live system diagnostics verified via `/#/health` and `/api/health`.
- [x] Verified zero API keys exposed in browser network inspection.

### Monitoring & Health Checks
The application provides real-time operational telemetry on route `#/health` and endpoint `GET /api/health`:
- **Round-trip latency probe:** Millisecond response time monitoring.
- **Runtime metrics:** Memory heap utilization (`heapUsedMb`, `heapTotalMb`), Node.js version, platform.
- **Integration health:** Non-secret confirmation of `geminiConfigured` and `anthropicConfigured`.
- **Status check:** Gateway state returning HTTP 200 `{ status: "ok" }`.

### Instant Rollback Procedure
If a production issue is detected:
1. Navigate to the **Vercel Dashboard** → Select **frontend-capstone**.
2. Go to the **Deployments** tab.
3. Identify the last known healthy deployment (e.g., commit `0f4f543`).
4. Click the **•••** menu on that deployment and select **Instant Rollback (Promote to Production)**.
5. Traffic will instantly route to the prior immutable build artifact in under 5 seconds without triggering a new build.

---

## 8. Reflection

### What was the hardest part?
Managing asynchronous Server-Sent Events (SSE) streaming state alongside user cancellation (`AbortController`) while ensuring zero layout shift. If a user cancels midway or an upstream model drops connection, the UI must safely settle the in-flight state, clear the skeleton shimmer, display actionable error feedback, and offer a de-duplicated retry button without causing unhandled promise rejections or duplicate API calls.

### What would you change with more time?
I would replace the in-memory rate limiter `Map` with **Upstash Redis / Vercel KV**. While the in-memory sliding window provides zero-cost defense for a single serverless instance, it resets on cold boots and does not share state across global edge regions. A shared Redis instance would provide strict cross-region quota enforcement.

### What was one surprising lesson learned?
Procedurally modeling 3D hardware using Three.js mathematical primitives in React Three Fiber resulted in a **0 KB network asset footprint**. Instead of downloading a multi-megabyte external GLTF/GLB model with texture maps over high-latency mobile networks, the procedural headphone geometry renders instantly, eliminating CORS headaches, broken CDN asset URLs, and asset download waterfalls.

---

## 9. License

[MIT](LICENSE)
