# Agent Activity Explorer

Take-home for Clean Machines AI. Two parts:

**Part A** — React + Vite + TypeScript event explorer.
Filters, pagination, a detail panel, and a histogram — all URL-synced.

**Part B** — diagnosed and fixed 8 performance bugs in a plain HTML/JS page.
Details in [PERF.md](PERF.md). Decisions and tradeoffs in [NOTES.md](NOTES.md).

## Running it

```bash
npm install
npm run api          # mock API → http://localhost:4000
npm run perf-clinic  # Part B → http://localhost:5174

cd app
npm install
npm run dev          # Part A → http://localhost:5174 (or next available port)
```

The API must be running before the Part A app will show data.
