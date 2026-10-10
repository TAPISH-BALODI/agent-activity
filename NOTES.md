# Notes

## What I built

**Part A — Agent Activity Explorer** (React + Vite + TypeScript)

Core requirements all done:

- Event list table with timestamp, agent, tool, status (colour-coded badge), latency (green/yellow/red by threshold), and `argsPreview` as a muted tooltip. Total event count shown in the header.
- Cursor-based "Load more" pagination (not infinite scroll — avoids losing scroll position when the detail panel opens and closes).
- URL-synchronised filters: free-text `?q=`, repeatable `?agent=`, `?status=`, and `?from=`/`?to=` for time range. Filter changes reset the cursor and push a history entry, so back/forward and copied URLs work correctly.
- Detail panel: slide-in aside, opened by clicking a row or sharing `?id=evt_xxx`. Escape closes it; clicking the backdrop closes it. Focus trap inside the panel. Shows `args` (formatted JSON), `result`, `policyMatches`.
- All four data states: shimmer skeleton (appears after 300ms, not immediately — avoids flash on fast connections), empty state (distinguishes "no results for filters" vs "no data"), inline error with retry, and a slow-network banner after 3 seconds.

Optional items I picked:

- **Histogram chart** (stretch) — SVG bar chart of events over time, reflects current filters, click-and-drag sets `?from=`/`?to=` in the URL which immediately filters the event list. No charting library — plain SVG.
- **Tests** (stretch) — vitest + testing-library + msw covering: `useUrlState` (8 cases: filter resets cursor, repeatable agent params, id/filter isolation, clearing params), API client error propagation (ApiError type, status code, message), and DetailPanel (Escape key, backdrop click, close button, error state, data display).
- **Dark mode** — `@media (prefers-color-scheme: light)` flips the CSS custom properties. Default is dark.
- **`prefers-reduced-motion`** — skeleton shimmer animation and panel slide-in animation are disabled.
- **Responsive** — table hides the preview column below 768px; filter bar wraps.

**Part B — Perf Clinic** — see `PERF.md` for all 8 fixes in detail.

## Framework choice: Vite + React, not Next.js

This is a purely client-side app: no public URLs to index, no server rendering needed, no per-route data loading that would benefit from RSC. Next.js App Router would add meaningful complexity (layout files, server/client component boundaries, `useSearchParams` requiring a Suspense boundary) for zero user-facing benefit. Vite + React is the honest choice.

## Tradeoffs

- **Pagination is "Load more", not cursor-in-URL**: The cursor isn't persisted in the URL. A user copying the URL at page 3 gets page 1 — but that's the expected behaviour (the URL represents a filter view, not a specific page). Storing the cursor in the URL would make back/forward navigate through pages, which conflicts with the intuition that back goes to "previous search".
- **Histogram uses `5m` buckets by default**: `1m` buckets produce too many bars at 50K+ events. `5m` strikes the right balance for readability. The bucket size isn't user-configurable — adding a bucket picker would be the next thing.
- **No virtualisation on the event list**: With "Load more" at 50 per page, the DOM size stays manageable. If users could load thousands of rows at once, virtualisation would be necessary.
- **CSS Modules over Tailwind**: The assignment involves a CSS-heavy perf clinic. Using hand-rolled CSS demonstrates the same knowledge that Part B requires. Tailwind would have been faster to write but less signal.

## Known issues / incomplete

- The histogram's click-drag range selection uses SVG mouse coordinates; it does not work on touch devices.
- `pctToTime` in the histogram assumes buckets are uniform — if the bucket list has large gaps, the time interpolation will be slightly off.
- The agent dropdown in the filter bar closes when you click elsewhere on the page (native `<details>` behaviour), but doesn't close on Escape key.

## How I used AI tools

I used Cursor (Claude) throughout. Specifically:

- **Scaffolding**: generated the initial folder structure, `types.ts`, and the API client (`client.ts`, `events.ts`). I reviewed all of it before committing.
- **Component skeletons**: generated first drafts of `EventTable`, `FilterBar`, `DetailPanel`, `Histogram`, `States`. I rewrote `EventsPage` from scratch after the generated version mutated component state inside a `queryFn` (a react-query anti-pattern).
- **Tests**: generated test stubs; I wrote the assertions and the MSW handler setup.
- **`useUrlState`**: wrote this by hand — it's the most critical piece of the app and I wanted to own every line. The `useSyncExternalStore` + `popstate` pattern for URL-driven state is something I've used before.
- **Part B (perf-clinic)**: identified all 8 bugs by reading the source code and cross-referencing with browser performance knowledge. I did not use AI to find these — I wanted the analysis to be genuine and verifiable against DevTools. The fixes were written by hand.
- **PERF.md and NOTES.md**: written by hand.

Every file was read, understood, and where necessary rewritten before being committed.
