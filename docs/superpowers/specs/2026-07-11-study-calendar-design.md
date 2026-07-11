# Study Calendar (Phase 2) — Design Spec

**Date:** 2026-07-11
**Author:** Ada + Claude (brainstorming session)
**Status:** Approved design, pre-implementation
**Builds on:** Phase 1 (Resource Library) — `docs/superpowers/specs/2026-07-10-study-hub-design.md`

## 1. Purpose

Turn the existing resource library into a day-by-day study plan: an auto-generated, ordered
(basic → advanced) schedule that answers "what should I study today?" Each calendar day maps
to a real date and lists the resources to cover that day, with per-item check-off that reuses
Phase 1 progress. It is a new *view* over the existing content — no new content, no schema
change.

### Goals
- Auto-generate a complete study plan from the curriculum with zero manual placement.
- Map each day to a real calendar date; highlight "today."
- Handle resources larger than one day's budget honestly (spread across consecutive days).
- Reuse Phase 1 progress so completion stays consistent everywhere.

### Non-goals (Phase 2)
- No manual drag-and-drop reordering (possible later).
- No reflow / "smart" re-planning based on what's done — the plan is stable.
- No backend, accounts, or sync (unchanged from Phase 1).
- No changes to Phase 1 pages beyond adding one nav link.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Plan generation | Auto-generated (no manual placement) |
| Plan length / scope | Content-driven: schedule ALL resources in curriculum order; length is a consequence, not a cap. Presented in month sections. |
| Daily time budget | Configurable (dropdown 30/60/90/120), default 90 min |
| Study cadence | Every day |
| Plan stability | Stable deterministic plan — pure function of (start date, daily budget, curriculum order). Does NOT reflow on progress. |
| Start date | User-picked, defaults to today. Day 1 = start date. |
| Oversized resources | Split into consecutive-day **sessions** of ≤ budget each; content never split, only time. |
| Session check-off | Per-session checkboxes, rolled up to the resource's canonical done-state. |

## 3. Architecture & Data Flow

The layout depends on two runtime settings (start date, daily budget) stored in
`localStorage`, so the calendar cannot be fully pre-rendered.

- **Build time:** `calendar.astro` emits an **ordered JSON array of every resource** (a data
  island). Each entry: `{ id, title, type, url, estMinutes, difficulty, course, courseTitle,
  topic }`. Order = course `term` → course `order` → resource `order` (same basic→advanced
  order as the dashboard). This is a read-only view over the existing content collections.
- **Client:** a pure module `schedule.ts` packs that array into days from the stored budget
  and maps days to dates from the stored start date; a small client render script builds the
  day-card DOM and wires checkboxes.
- **Progress:** reuses Phase 1 `progress.ts` (`isDone`/`setDone`/`toggle`/`courseProgress`)
  unchanged. Session keys are ordinary string keys it already supports.

The calendar is the one JS-rendered page (its layout is a function of user settings). Phase 1
pages are unchanged.

## 4. Scheduling Algorithm (`schedule.ts`, pure & unit-tested)

### 4.1 Ordering
`orderResources(resources)` → resources sorted by `term`, then course `order`, then resource
`order`. (The build step emits them pre-ordered; the function is still defined and tested so
the contract is explicit.)

### 4.2 Sessioning + packing
`packIntoDays(resources, budget)` → `Day[]`, where
`Day = { dayIndex: number, items: SessionItem[], totalMinutes: number, isHeavy: boolean }`
and `SessionItem = { key: string, resourceId: string, title, type, url, estMinutes,
difficulty, courseTitle, topic, part: number|null, partCount: number|null, minutesToday:
number }`.

Rules:
1. Walk resources in order. For each resource:
   - If `estMinutes <= budget`: it is a single session. `key = resourceId`, `part = null`.
   - If `estMinutes > budget`: split into `partCount = ceil(estMinutes / budget)` sessions.
     Session k (1-based) has `key = ${resourceId}#${k}`, `part = k`, `minutesToday =
     min(budget, estMinutes - (k-1)*budget)`. **Each session occupies its own day** (a
     multi-session resource is never combined with other work on the same day).
2. Pack single-session resources greedily: add to the current day while
   `dayTotal + item.minutesToday <= budget`; otherwise start a new day.
3. **At least one item per day** (safety net): never emit an empty day and never loop —
   always place at least the next item on the current day before starting a new one. Given
   rule 1 caps every session at ≤ budget, a single item always fits; this guard just makes the
   "never empty / never stall" invariant explicit. Multi-session items are already one-per-day
   by rule 1.
4. `isHeavy = true` when the day holds a session that is `part`-of a multi-session resource.

### 4.3 Date mapping (pure; clock passed in, never read internally)
- `dateForDay(startDateISO, dayIndex)` → ISO date = start + `dayIndex` days.
- `todayIndex(startDateISO, todayISO)` → `dayIndex` for today, or `-1` if before start or
  after the last day.

### 4.4 Roll-up helpers
- `sessionKeys(resourceId, partCount)` → `[resourceId]` if `partCount` is null/1, else
  `[resourceId#1 … resourceId#N]`.
- `isResourceComplete(resourceId, partCount, isDone)` → all session keys done.
- On toggle of a session, the client sets `setDone(resourceId, allSessionsDone)`.
- On load, reconcile: for each multi-session resource where `isDone(resourceId)` is true but
  its session keys are unset, seed all session keys done. Deterministic, one-time per load.

## 5. Page & UX (`/calendar`)

- Added to the `Base.astro` top nav ("Calendar").
- **Settings bar:** start-date `<input type="date">` (default today), daily-budget `<select>`
  (30/60/90/120, default 90), **"Jump to today"** button. Persist to `localStorage`:
  `studyhub.calendar.start`, `studyhub.calendar.budget`. Changing either re-renders.
- **Header summary:** "Day N of M · X% complete · estimated finish 〈date〉." X% = completed
  sessions / total sessions.
- **Body:** days grouped into **month sections** (heading = month + year). Each day is a
  `.card` showing: weekday + date, "Day N", its session rows (type icon; title with "· Part k
  of N" when multi-session; `minutesToday` min; difficulty chip; check-off box), the day's
  total minutes, and an "x/y done" count. Heavy days show a "big one — may take a few
  sittings" note.
- **Today** highlighted (accent border); past days dimmed. "Jump to today" scrolls to today's
  card (or to Day 1 if today is before the start / the plan is finished).
- **Empty state:** if there are no resources, show a friendly message linking to the library.

## 6. Files

**New:**
- `src/lib/schedule.ts` — pure logic from §4.
- `src/lib/schedule.test.ts` — Vitest unit tests (TDD).
- `src/pages/calendar.astro` — emits the ordered-resource JSON island, settings bar, mount
  point; hosts the client render module.

**Modified:**
- `src/layouts/Base.astro` — add "Calendar" nav link (one line).

**Reused unchanged:** `src/lib/progress.ts`, `src/styles/global.css`, card styling, content
collections and schema.

## 7. Testing

Pure logic in `schedule.ts` is unit-tested (Vitest), no DOM/clock needed:
- **Ordering:** term → course order → resource order.
- **Packing:** short items pack multiple per day up to budget; a new day starts when the next
  item would exceed budget; never an empty day.
- **Sessioning:** a resource with `estMinutes > budget` splits into `ceil(est/budget)`
  sessions on consecutive days; `minutesToday` sums to `estMinutes`; last part is the
  remainder; content/URL identical across parts; single day per session.
- **Date mapping:** `dateForDay` adds days correctly across month boundaries; `todayIndex`
  returns the right index, and `-1` before start / after end.
- **Roll-up:** `isResourceComplete` true only when all session keys done; `sessionKeys`
  shape for single vs multi.

Client render + settings persistence verified via `npm run build`, `npm run check`, and a
runtime smoke test (page renders day cards, today highlighted, a check-off persists).

## 8. Module Boundaries

- `schedule.ts` — pure scheduling logic; no DOM, no storage, no clock. Fully testable.
- `progress.ts` — unchanged; the only progress state, now also holding session keys.
- `calendar.astro` + client render — presentational; reads `schedule` + `progress`, writes
  DOM. No business logic beyond wiring.

This keeps the schedulable logic isolated and testable, and confines all Phase-2 statefulness
to the existing progress module plus two small `localStorage` settings.
