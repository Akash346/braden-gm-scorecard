# Braden GM Morning Scorecard

**AI-powered dealership operations dashboard for Braden Auto Group**

> Built as a hiring test demonstration for an AI Operations Builder role, showing the ability to ship a production-quality, AI-integrated dealership tool quickly and securely.

> **Tested with a 2,624-row dealership CSV covering 12 stores and 30 days of activity.** Architecture tested for 5,200+ row datasets and validated with Papa Parse streaming to handle up to 50,000 rows without UI freezing.

> **Security:** CSV is processed locally in the browser. Claude receives only aggregated and scrubbed metrics — no VINs, salesperson names, or customer data. All 60+ day records include a status breakdown (sold/pending/lost) so the AI can provide accurate, grounded analysis.

---

## What This Is

The **Braden GM Morning Scorecard** is a full-stack web application that lets a General Manager or dealership owner:

1. Upload a dealership sales CSV (or load sample data)
2. Instantly view automotive KPIs across all stores
3. See rule-based operational alerts for PVR gaps, aged inventory, and closing ratio issues
4. Generate a Claude-powered AI executive briefing — with findings, watch items, and tomorrow's action plan

The tool is designed to be used every morning before the first manager meeting of the day.

---

## Why It Was Built

This app demonstrates:
- AI integration with proper server-side security (no exposed API keys)
- Real automotive domain knowledge (PVR, front/back gross, F&I, aged inventory, closing ratio)
- Large CSV handling in the browser without a backend or database
- Clean, professional UI appropriate for executive-level users
- End-to-end architecture: CSV → KPIs → alerts → AI briefing

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 with App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| CSV Parsing | Papa Parse (streaming) |
| AI | Anthropic Claude (claude-haiku-4-5) via SDK |
| Deployment | Vercel |
| Database | None — CSV processed in browser memory |

---

## Running Locally

### Prerequisites
- Node.js 18 or higher
- An Anthropic API key ([get one here](https://console.anthropic.com))

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd braden-gm-scorecard

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Then edit .env.local and add your key:
# ANTHROPIC_API_KEY=sk-ant-...

# 4. Start the dev server
npm run dev

# 5. Open http://localhost:3000
```

### Regenerate Sample Data

```bash
npx tsx scripts/generate-sample-data.ts
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for AI) | Your Anthropic API key. Server-side only. Never exposed to the browser. |

**Important:** Never prefix with `NEXT_PUBLIC_`. Never commit `.env.local`. The `.env.local.example` file shows the format.

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then set the environment variable:
vercel env add ANTHROPIC_API_KEY
```

Or via the Vercel dashboard:
1. Import the GitHub repository
2. Go to **Settings → Environment Variables**
3. Add `ANTHROPIC_API_KEY` with your key
4. Deploy

The app is fully Vercel-compatible with no additional configuration required.

---

## Security Decisions

| Decision | Rationale |
|----------|-----------|
| API key in server-only env var | `process.env.ANTHROPIC_API_KEY` is never exposed to the browser. There is no `NEXT_PUBLIC_` prefix. |
| Claude called from API route only | `app/api/analyze/route.ts` is the only place Claude is ever called. All browser code is client-side only. |
| CSV processed in browser | Papa Parse runs in the browser. Raw CSV rows never leave the user's device. |
| PII scrubber before AI payload | Salesperson names are anonymized. No VINs, stock numbers, or customer info are sent to Claude. |
| Payload size validation | Server rejects payloads over 50 KB. Client rejects files over 25 MB. |
| Input as data, not instructions | Claude's system prompt explicitly treats all user-provided values as data, not instructions. |
| Prompt injection guardrails | The system prompt instructs Claude to analyze only provided metrics and return only JSON. |

---

## Large CSV Handling Strategy

- **Papa Parse streaming/chunk mode** — parses in chunks rather than loading the entire file into memory at once
- **Single-pass aggregation** — KPIs are computed in one pass after parsing; no duplicate row storage where avoidable
- **No server upload** — CSV never leaves the browser
- **50,000 row target** — tested architecture handles this without UI freezing
- **Payload compression** — only high-level aggregates (store-level, lead-source-level) are sent to Claude, not individual rows

---

## What I Would Add in Production

1. **CRM/DMS Integration** — Connect to Reynolds & Reynolds, CDK, or DealerSocket via API to pull data automatically instead of requiring CSV upload. Morning scorecard populated before the GM walks in.
2. **Scheduled GM Email/SMS Briefing** — Morning cron job that generates the Claude briefing and emails it to the GM before 7 AM, formatted for quick reading on mobile.
3. **Postgres/Supabase History** — Store daily KPI snapshots to show week-over-week and month-over-month trends. Currently every session starts fresh.
4. **User Authentication** — Clerk or Auth.js for role-based access (GM, owner, regional manager, store manager).
5. **Role-Based Store Access** — Store managers see only their store; GMs see group; owners see everything. Prevent store managers from viewing competitor store data within the group.
6. **Automated Anomaly Monitoring** — Background job that flags unusual gross drops or volume changes and sends real-time alerts via Slack, Teams, or SMS before the manual morning review.
7. **Active Inventory Filter** — Pull only `status=Pending/Active` rows from the DMS to calculate true current aged inventory. Currently 60+ day records include sold and lost status which dilutes the signal.

---

## Project Structure

```
app/
  page.tsx              # Main dashboard page
  layout.tsx            # Root layout with fonts and metadata
  globals.css           # Tailwind and global styles
  api/
    analyze/
      route.ts          # Secure server-side Claude API route

components/
  Header.tsx            # App header with actions
  CsvUploader.tsx       # File upload handler
  DataStatusPanel.tsx   # Loaded data summary
  KpiCards.tsx          # 14 automotive KPI cards
  ChartsGrid.tsx        # 6 Recharts charts
  AlertsPanel.tsx       # Rule-based operational alerts
  StorePerformanceTable.tsx
  LeadSourceTable.tsx
  AiBriefingPanel.tsx   # Claude AI briefing panel

lib/
  types.ts              # All TypeScript interfaces
  csv.ts                # Papa Parse wrapper + validation
  normalize.ts          # Column mapping + value parsers
  kpis.ts               # KPI calculator + chart data builder
  alerts.ts             # Rule-based alert engine
  aiPayload.ts          # PII scrubber + AI payload builder
  formatters.ts         # Currency, number, date formatters

public/
  sample-dealership-sales.csv   # 2,600+ row synthetic dataset

scripts/
  generate-sample-data.ts       # Synthetic data generator
```

---

## Testing Checklist

- [ ] Load sample data → KPI cards populate
- [ ] All 6 charts render with correct data
- [ ] Alert cards appear with correct severity
- [ ] Store table is sortable by all columns
- [ ] Lead source table highlights low closing ratio rows
- [ ] Generate AI Briefing → findings render correctly
- [ ] Copy GM Briefing → clipboard text is correct
- [ ] Tomorrow's actions are checkable/un-checkable
- [ ] Upload a bad CSV → clear error message
- [ ] Upload a file over 25 MB → client-side rejection
- [ ] Upload a CSV missing required columns → validation error
- [ ] Reset Dashboard → returns to empty state
- [ ] No API key visible in browser network requests
- [ ] `npm run build` completes with zero TypeScript errors

---

