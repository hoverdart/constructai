# ConstructAI — Production Dashboard

A supply-order tracking dashboard for construction teams, built with Next.js 16 (App Router), Tailwind CSS v4, and two AI integrations: a Claude-powered interactive chat agent and an OpenAI-powered proactive insights engine.

---

## Getting started

```bash
npm install
```

Add your API keys to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```

```bash
npm run dev
# → http://localhost:3000
```

---

## What it does

The dashboard reads a list of supply orders from `data/data.json` and gives a site manager three things:

1. **A filterable order table** — see all current orders at a glance, with live status counts.
2. **An AI chat agent** — ask free-form questions about the visible orders; the agent knows exactly what's on screen and highlights rows when it references them.
3. **Proactive insight popups** — a background scan automatically flags things that need attention (delayed orders with near-term due dates, large pending deliveries, unloading prep) without the user having to ask.

---

## Features

### Order table

Orders are loaded server-side in `app/page.tsx` (a React Server Component) and passed down as props. There's no client-side fetch for the initial data — the page HTML arrives with the table already rendered. Each row gets a stable DOM `id` derived from its content via `orderDomId()` so that scroll-to-row works reliably.

### Filters

Three independent filters — status, supplier, text search — live in `Dashboard`'s state and run through a pure `filterOrders()` function in `lib/orders.ts`. Keeping the filter logic separate from any component means it's easy to test or extend (e.g. adding a date-range picker later).

### Stat cards

The four count chips (Total, On Track, Pending, Delayed) react to the active filters. You're always looking at counts for what's currently visible, not the full dataset — so the numbers stay useful when you've drilled into a specific supplier or status.

### AI chat agent (`/api/chat`)

Powered by **Claude claude-sonnet-4-6** (Anthropic). The agent receives the currently-visible orders as a formatted context string on every request — so if you've filtered to "Delayed" orders, it only reasons about those. Responses stream back over SSE for a fast, token-by-token feel.

The system prompt instructs Claude to use a custom link syntax whenever it references a supplier:

```
[Clearwater Plumbing](highlight:Clearwater Plumbing)
```

`MarkdownContent.tsx` intercepts any `highlight:` link and renders it as a blue chip button instead of a plain anchor. Clicking the chip calls `Dashboard.handleHighlight()`, which scrolls the matching row into view and flashes an amber highlight for ~2 seconds. The agent's answers are directly navigable — you don't have to scan the table yourself to find what it's talking about.

### Proactive insights (`/api/insights`)

Powered by **OpenAI** with structured JSON output (`json_schema` response format). Every time the visible order list changes (with a 350 ms debounce to avoid hammering the API on fast typing), a background request asks the model to flag up to four actionable insights: overdue confirmations, near-term delayed deliveries, large-quantity coordination risks, and upcoming unloading prep.

Each insight carries a `targetOrderIds` array that maps back to specific rows, a severity level (`info` / `warning` / `critical`), and a recommended next action. Clicking an insight card scrolls to and selects its corresponding table row — the same interaction as the chat chips.

The structured schema is enforced by the API itself, so the server-side parsing is just straightforward JSON — no regex, no prompt-hacking to extract fields.

---

## Architecture

```
app/
├── page.tsx                  Server component — reads data.json, mounts Dashboard
├── types/orders.ts           Shared TypeScript interfaces (Order, OrderInsight, etc.)
├── lib/orders.ts             Pure data utilities — filter, format, ID generation
├── api/
│   ├── chat/route.ts         Streaming SSE endpoint — Claude chat
│   └── insights/route.ts     Structured JSON endpoint — OpenAI insight scan
└── components/
    ├── Dashboard.tsx         Single state owner — filters, highlight, insights
    ├── OrdersTable.tsx       Renders rows; receives highlightedOrderId as a prop
    ├── FilterBar.tsx         Controlled inputs; emits FilterState changes upward
    ├── AIAgent.tsx           Chat UI — floating collapsible panel, streaming messages
    ├── MarkdownContent.tsx   Markdown renderer + highlight: link → chip interception
    ├── InsightPopups.tsx     Dismissable insight cards, wired to row selection
    ├── StatCard.tsx          Reusable count tile
    └── StatusBadge.tsx       Colour-coded status pill
```

**State ownership is centralized in `Dashboard`.** Both the chat agent and the insights panel need to trigger row highlights and scrolls — having a single `handleHighlight` / `selectOrder` function in the parent means neither child needs to know about the DOM or about each other. They just call a callback and the parent handles the rest.

**Two AI providers, two jobs.** Claude handles open-ended conversation well. OpenAI's structured output format is a better fit for the insight scan, which needs a guaranteed JSON schema with validated fields — you get a typed response rather than text you have to parse. They operate independently; the chat context and the insight context are both derived from the same `visibleOrders` array but sent to separate endpoints.

---

## Tradeoffs & what I'd do differently with more time

### Static data
Orders come from a static `data.json` file. For a real app you'd fetch from a database or a procurement API, add loading and error states, and likely poll or use webhooks for live status updates. The static file keeps the setup simple and lets the AI integration be the focus.

### `uiId` stability
Each order's `uiId` is derived from its content (supplier + description + date + index). This is fine for a static dataset but would drift if orders were reordered or edited. A production solution would be a database-assigned UUID, or at minimum a hash of content-only fields without the index.

### Insight scan cost
The insights endpoint fires on every filter change (debounced). With 10 orders this is cheap; at hundreds of orders across many concurrent users it could get expensive fast. The right fix is to cache insights per order-set fingerprint with a short TTL, or move the scan to a background job that runs on a schedule rather than being triggered by the user's interactions.

### Ephemeral chat history
Conversation history lives in React state — refreshing the page loses it. For a production tool you'd persist it to `localStorage` at minimum, or to the server so conversations can be resumed across sessions and devices.

### No authentication
Any visitor can hit the API routes and consume tokens. A simple API-key gate or NextAuth session would be the first thing to add before any kind of public deploy.

### Manual SSE streaming
The chat streaming is implemented by hand (reading chunks, splitting on `data:` lines). The [Vercel AI SDK](https://sdk.vercel.ai) handles all of this boilerplate — plus abort-on-unmount, hook-based state, and multi-provider support — for free. The manual approach is kept here because it's transparent and adds zero dependencies, but the SDK is the right long-term choice.

### No pagination or virtualisation
The table renders all rows at once. Fine for 10–50 orders; for hundreds you'd want server-side pagination or a virtualised list (e.g. `@tanstack/react-virtual`) so the DOM stays small.

### Mobile layout
The AI panel is a fixed floating drawer that collapses to a header strip — usable on mobile but not truly native-feeling. A bottom-sheet pattern would be a better fit on small screens.
