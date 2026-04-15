# Shannon Workbench — Build Handoff

## What This Is

A Next.js 15 web app that wraps Shannon Lite's autonomous pentest pipeline into an engagement management tool for app pen testers. Full lifecycle: configure → launch → monitor live → triage findings (Shannon + manual) → export structured JSON.

**Project location:** `/Users/sherlock/Projects/shannon-workbench`
**Builds clean:** `npm run build` passes with zero errors.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Database | SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3` |
| UI | shadcn/ui + Tailwind CSS, dark theme (slate-950 base) |
| Shannon integration | `child_process` → `shannon` CLI |
| Run monitoring | `@temporalio/client` polling `getProgress` Temporal query |

---

## What's Built

### Infrastructure (complete)

- **`prisma/schema.prisma`** — 4 models: `Engagement`, `Run`, `Finding`, `ConfigTemplate`
- **`prisma/migrations/`** — initial migration applied, `prisma/dev.db` exists
- **`lib/db.ts`** — Prisma singleton with `PrismaBetterSqlite3` adapter (required by Prisma 7)
- **`lib/utils.ts`** — shadcn `cn()` helper

### Core Libraries (complete)

- **`lib/config-builder.ts`** — `buildConfigYAML(state)` serializes wizard form state to valid Shannon YAML. `condenseDescription()` truncates engagement context to Shannon's 500-char limit. Types: `ConfigWizardState`, `AuthConfig`, `ScopeRule`.

- **`lib/shannon-launcher.ts`** — `launchShannonRun()` shells out to `shannon` CLI, writes temp config YAML, parses workflowId from stdout. `cancelShannonRun()` calls `shannon stop`. Uses `SHANNON_CLI_PATH` env var (default `"shannon"`).

- **`lib/temporal-client.ts`** — `getRunProgress(workflowId)` queries Temporal `getProgress` handler. `cancelWorkflow(workflowId)`. Uses `TEMPORAL_ADDRESS` env var (default `localhost:7233`). Type: `PipelineProgress`.

- **`lib/finding-ingester.ts`** — `ingestFindings({ engagementId, runId, repoPath })` parses Shannon deliverables:
  - Reads `{category}_exploitation_queue.json` for structured finding metadata
  - Reads `{category}_exploitation_evidence.md`, splits on `### ID:` headings, extracts severity/PoC/remediation
  - Creates `Finding` records, skipping duplicates by `shannonId`
  - Categories: `injection`, `xss`, `auth`, `ssrf`, `authz`
  - Disabled findings (Docker-gated) → `status: needs-more-testing`

### API Routes (complete — 10 routes)

| Route | Methods | Purpose |
|---|---|---|
| `/api/engagements` | GET, POST | List all / create engagement |
| `/api/engagements/[id]` | GET, PATCH, DELETE | Single engagement with runs |
| `/api/runs` | POST | Launch Shannon run via CLI, create Run record |
| `/api/runs/[id]` | GET | Single run with finding count |
| `/api/runs/[id]/progress` | GET (SSE) | Stream Temporal progress every 10s, update DB on status change |
| `/api/runs/[id]/cancel` | POST | Cancel workflow + update DB |
| `/api/runs/[id]/ingest` | POST | Import Shannon deliverables into Finding records |
| `/api/findings` | GET, POST | List (filtered) / create manual finding |
| `/api/findings/[id]` | GET, PATCH, DELETE | Single finding CRUD |
| `/api/export/[engagementId]` | GET | Export JSON with findings, summary counts |

### Pages (partial)

| Page | Status |
|---|---|
| `app/layout.tsx` | ✅ Done — dark sidebar layout with nav |
| `app/page.tsx` | ✅ Done — dashboard with engagement table + stats |
| `app/engagements/new/page.tsx` | ✅ Done — create form (all 7 fields) |
| `app/engagements/[id]/page.tsx` | ✅ Done — overview with runs table, findings summary |
| `app/engagements/[id]/edit/page.tsx` | ✅ Done — edit form pre-populated |
| `app/engagements/[id]/run/new/page.tsx` | ❌ Placeholder only — config wizard not built |
| `app/engagements/[id]/run/[runId]/page.tsx` | ❌ Not created — live monitor not built |
| `app/engagements/[id]/findings/page.tsx` | ❌ Not created — triage UI not built |
| `app/engagements/[id]/findings/new/page.tsx` | ❌ Not created — manual finding form not built |
| `app/engagements/[id]/export/page.tsx` | ❌ Not created — export UI not built |

### shadcn/ui Components Installed

badge, button, card, dialog, drawer, input, label, progress, scroll-area, select, separator, sheet, skeleton, sonner, table, tabs, textarea

---

## What Remains

### 1. Config Wizard — `app/engagements/[id]/run/new/page.tsx`

Replace the current placeholder. Multi-step form (use `Tabs` or step state):

**Step 1 — Context Review**
- Show engagement `description`, `threatModel`, `notes` (read-only display)
- Live preview of how they'll be condensed into Shannon's 500-char description (call `condenseDescription` from `config-builder.ts`)
- Character counter showing condensed length

**Step 2 — Authentication**
- `login_type` select: form / sso / api / basic
- `login_url` input
- `username` + `password` inputs
- `totp_secret` input (optional, labeled "TOTP Secret (Base32)")
- `login_flow` — dynamic list of steps (add/remove/reorder plain text steps)
- `success_condition` — type select + value input

**Step 3 — Scope Rules**
- Two sections: Focus Rules + Avoid Rules
- Each rule: `type` select (path/subdomain/domain/method/header/parameter) + `description` input + `url_path` input
- Add/remove rows
- Client-side duplicate detection (same type + url_path)
- Client-side conflict detection (same rule in both focus and avoid)

**Step 4 — Pipeline Settings**
- `maxConcurrentPipelines`: slider or select 1–5 (default 2)
- `retryPreset`: toggle "default" / "subscription" (subscription = extended timeouts for API rate limits)

**Step 5 — Review + Launch**
- Rendered YAML preview (syntax-highlighted code block, use `configYAML` from `buildConfigYAML(wizardState)`)
- "Launch Run" button → POST `/api/runs` with `{ engagementId, configYAML, wizardState }`
- On success → redirect to `/engagements/[id]/run/[runId]`

State type `ConfigWizardState` is already defined in `lib/config-builder.ts`. Import `buildConfigYAML` and `getDefaultWizardState` from there.

---

### 2. Live Run Monitor — `app/engagements/[id]/run/[runId]/page.tsx`

Connect to SSE at `GET /api/runs/[runId]/progress`. Parse `PipelineProgress` events.

**Layout:**
- Header: Run ID (monospace), started at, elapsed time (live counter), status badge
- Left panel — Phase Timeline:
  ```
  ○ preflight
  ✓ pre-recon      ($3.56 · 11m 34s)
  ✓ recon          ($2.91 · 12m 16s)
  ▶ vulnerability-analysis  ← current phase
    ✓ injection-vuln
    ✓ xss-vuln
    ▶ auth-vuln  ← spinning indicator
    ○ ssrf-vuln
    ○ authz-vuln
  ○ exploitation
  ○ reporting
  ```
  The 13 agents from Shannon: `pre-recon`, `recon`, `injection-vuln`, `xss-vuln`, `auth-vuln`, `ssrf-vuln`, `authz-vuln`, `injection-exploit`, `xss-exploit`, `auth-exploit`, `ssrf-exploit`, `authz-exploit`, `report`

- Right panel — Stats:
  - Running cost: `$0.00` updating live (sum of `agentMetrics[*].costUsd`)
  - Agents complete: `X / 13`
  - Current agent
  - Progress bar

- Footer: "Request Cancellation" button (POST `/api/runs/[id]/cancel`) | "Import Findings" button (POST `/api/runs/[id]/ingest`, enabled only when `status === "completed"`)

SSE usage pattern:
```typescript
const es = new EventSource(`/api/runs/${runId}/progress`)
es.onmessage = (e) => setProgress(JSON.parse(e.data))
```

---

### 3. Findings Triage — `app/engagements/[id]/findings/page.tsx`

**Layout:** Filter bar on top, two-panel below (list left, detail right).

**Filter bar:** severity (multi-select badges), category (multi-select), status (multi-select), source (shannon/manual toggle). "Add Finding" button.

**Finding list (left):**
- Each row: severity badge (colored), ID (`AUTH-VULN-01` monospace), title, status pill, source icon
- Sorted: critical → high → medium → low → info, then by date
- Click to select → show detail panel

**Detail panel (right):**
- Title (editable inline)
- Severity select: critical / high / medium / low / info
- Status select: needs-review / confirmed / dismissed / needs-more-testing
- Category + Source badges (read-only)
- Shannon ID (monospace, read-only)
- Description (markdown-rendered or textarea)
- PoC section: syntax-highlighted code blocks (the `poc` field contains fenced code blocks)
- Code Location (monospace)
- Remediation (textarea, editable)
- Tester Notes (textarea, editable, auto-save on blur)
- CVSS score (optional number input)
- Auto-save all edits via PATCH `/api/findings/[id]`

All changes → PATCH `/api/findings/[id]`.

---

### 4. Manual Finding Form — `app/engagements/[id]/findings/new/page.tsx`

Simple form (or use a Sheet/drawer from the triage page):
- Category select, Title, Severity select, Description (textarea), PoC (textarea), Code Location, Remediation, Tester Notes
- POST `/api/findings` with `source: "manual"`
- Redirect back to findings triage

---

### 5. Export Page — `app/engagements/[id]/export/page.tsx`

- Status filter checkboxes: confirmed ✓ (default), dismissed, needs-review, needs-more-testing
- Summary panel: counts by severity + category (colored badges)
- JSON preview: scrollable `<pre>` block with the full export JSON
- "Download JSON" button → triggers file download
- "Copy to clipboard" button

Fetch from `GET /api/export/[engagementId]?statuses=confirmed,dismissed` etc.

---

## Design System Reference

```
Background:    bg-slate-950
Cards:         bg-slate-900, border border-slate-800
Sidebar:       bg-slate-900
Text primary:  text-slate-100
Text muted:    text-slate-400 / text-slate-500
Borders:       border-slate-800

Severity colors:
  critical:    text-red-400    bg-red-500/10    border-red-500/30
  high:        text-orange-400 bg-orange-500/10 border-orange-500/30
  medium:      text-yellow-400 bg-yellow-500/10 border-yellow-500/30
  low:         text-blue-400   bg-blue-500/10   border-blue-500/30
  info:        text-slate-400  bg-slate-500/10  border-slate-500/30

Status colors:
  confirmed:         text-green-400  bg-green-500/10
  dismissed:         text-slate-400  bg-slate-500/10
  needs-review:      text-yellow-400 bg-yellow-500/10
  needs-more-testing:text-blue-400   bg-blue-500/10

Primary action:  bg-violet-600 hover:bg-violet-500
```

---

## Environment Variables

```bash
# .env
DATABASE_URL="file:./prisma/dev.db"
TEMPORAL_ADDRESS="localhost:7233"
SHANNON_CLI_PATH="shannon"
```

---

## Key Files to Know

| File | What it does |
|---|---|
| `lib/db.ts` | Prisma client singleton (Prisma 7 + better-sqlite3 adapter) |
| `lib/config-builder.ts` | `buildConfigYAML()`, `getDefaultWizardState()`, `ConfigWizardState` type |
| `lib/shannon-launcher.ts` | `launchShannonRun()` — shells to `shannon` CLI, returns `{ workflowId, sessionId }` |
| `lib/temporal-client.ts` | `getRunProgress()` — queries Temporal, returns `PipelineProgress` |
| `lib/finding-ingester.ts` | `ingestFindings()` — parses Shannon `deliverables/` into DB `Finding` records |
| `prisma/schema.prisma` | DB schema: Engagement, Run, Finding, ConfigTemplate |
| `prisma/dev.db` | SQLite database file |

---

## Run Locally

```bash
cd /Users/sherlock/Projects/shannon-workbench
npm run dev          # starts on http://localhost:3000
npm run build        # production build (currently clean)
```

Requires Shannon CLI installed and Temporal running at `localhost:7233` for run launch/monitor to work. The rest of the UI (engagement CRUD, triage, export) works without Shannon/Temporal.
