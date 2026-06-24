# Visitor Platform

A lightweight visitor analytics + email identity linking platform.

Tracks website visitors, logs page views, calculates time-on-site, and links sessions to email addresses when available.

## Architecture

```
Visitor Website
        │
        ▼
tracker.js (client-side snippet)
        │
        ▼
Visitor Platform API (Express + Prisma)
        │
        ▼
PostgreSQL (session, events, identities)
        │
        ▼
Merchant-OS Retention Dashboard (presentation layer)
```

## How It Works

1. **Tracking Script** (`tracker.js`) is embedded on a website
2. Each visitor gets an **anonymous session_id** (UUID) stored in sessionStorage
3. Page views, session start/end events are sent to `POST /event`
4. When a user submits their email, `POST /identify` links it to the session
5. **Duration** is calculated from first event to last event (or session_end event)
6. **Intent Score** increases when visitors visit pricing/checkout pages
7. All business logic lives here — Merchant-OS only consumes computed data

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Tracker:** Vanilla JavaScript (no dependencies)
- **Infrastructure:** Docker Compose for Postgres

## Getting Started

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment

```bash
cp .env.example .env
```

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start the server

```bash
npm run dev
```

Server starts on `http://localhost:4000`

### 6. Run test flow

```bash
npm run test
```

## API Endpoints

### `POST /event`

Ingest a tracking event.

**Request:**
```json
{
  "anonymous_id": "uuid-v4",
  "type": "page_view",
  "url": "https://example.com/pricing",
  "timestamp": "2026-06-16T10:00:00Z",
  "metadata": {}
}
```

**Event types:**
- `session_start` — first page load
- `page_view` — page navigation (or heartbeat ping)
- `email_captured` — email submitted via form
- `form_submit` — generic form submission
- `checkout_started` — entered checkout flow
- `purchase` — completed purchase
- `session_end` — page unload/beforeunload

**Response:**
```json
{
  "session_id": "uuid",
  "anonymous_id": "uuid",
  "event_id": "uuid"
}
```

### `POST /identify`

Link an email to a session.

**Request:**
```json
{
  "session_id": "uuid",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "identity_id": "uuid",
  "session_id": "uuid",
  "email": "john@example.com"
}
```

### `GET /session/:id`

Get full session details.

**Response:**
```json
{
  "id": "uuid",
  "anonymous_id": "uuid",
  "email": "john@example.com",
  "start_time": "2026-06-16T10:00:00Z",
  "end_time": "2026-06-16T10:07:00Z",
  "duration_seconds": 420,
  "entry_page": "/",
  "exit_page": "/checkout",
  "intent_score": 85,
  "events": [
    {
      "type": "page_view",
      "url": "https://example.com/",
      "timestamp": "2026-06-16T10:00:00Z"
    }
  ]
}
```

### `GET /overview`

Get aggregated stats.

**Response:**
```json
{
  "totalVisitors": 42,
  "identifiedVisitors": 28,
  "avgDurationSeconds": 312,
  "returningVisitors": 15,
  "emailCaptureRate": 66,
  "highIntentVisitors": 10,
  "totalSessions": 87
}
```

### `GET /visitors?page=1&limit=20`

Paginated visitor list.

### `GET /health`

Health check.

## Session Model

- **session_start** = first event timestamp
- **session_end** = last event OR `session_end` event
- **duration_seconds** = end_time - start_time (computed server-side)
- If no `session_end` event is received, the last event timestamp is used
- **intent_score** increases by 15 when visitor hits `/pricing` or `/checkout` (capped at 100)

## Identity Model

- Email is linked to a session via `POST /identify`
- One email can have multiple sessions (returning visitor)
- One session can only have one email
- A Visitor record is created per email, with `firstSeen` and `lastSeen`

## Tracker Script Usage

Add this to your website:

```html
<script>
  window.__VISITOR_API_URL = 'https://your-api.com';
</script>
<script src="https://your-cdn.com/tracker.js" async></script>
```

To programmatically identify a visitor:

```js
window.__identifyVisitor('user@example.com');
```

## Project Structure

```
visitor-platform/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express entry point
│   │   ├── routes/
│   │   │   ├── event.ts       # POST /event
│   │   │   ├── identify.ts    # POST /identify
│   │   │   ├── session.ts     # GET /session/:id
│   │   │   ├── overview.ts    # GET /overview
│   │   │   └── visitors.ts    # GET /visitors
│   │   ├── services/
│   │   │   ├── session.ts     # Session CRUD + overview
│   │   │   ├── identity.ts    # Email linking
│   │   │   └── duration.ts    # Time-on-site calc
│   │   └── db/
│   │       └── prisma.ts      # Prisma client
│   └── prisma/
│       └── schema.prisma      # Database schema
├── tracker/
│   └── tracker.js             # Client-side tracking snippet
├── scripts/
│   └── test-flow.mjs          # End-to-end test flow
├── docker-compose.yml
├── .env.example
└── README.md
```

## Connecting to Merchant-OS

The Merchant-OS Retention Dashboard consumes data from this platform's API. In development, configure the Merchant-OS mock API proxy to point at `http://localhost:4000`.

Once connected, all overview cards, visitor tables, session details, and activity feeds in Merchant-OS will display live data from this platform.