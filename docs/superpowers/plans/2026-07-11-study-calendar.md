# Study Calendar (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auto-generated, date-mapped `/calendar` study plan that packs the curriculum (in order) into days at a configurable daily budget, spreads oversized courses across consecutive-day sessions, and reuses Phase 1 progress with per-session check-off rolled up to each resource's canonical done-state.

**Architecture:** A pure, unit-tested scheduling module (`schedule.ts`) does all ordering, packing, session-splitting, date mapping, and roll-up — no DOM, storage, or clock. `calendar.astro` emits every resource as an ordered JSON island at build time and hosts a bundled client script that reads settings from `localStorage`, builds the schedule, renders day cards, and wires check-off. Phase 1 code is unchanged except one nav link.

**Tech Stack:** Astro 4, TypeScript, Vitest, the existing `progress.ts`, plain CSS.

## Global Constraints

- **Commits are blocked on this device.** Where a step says "Commit", run `git add -A` (STAGE only) and treat the step as done — do NOT run `git commit`.
- **No changes to `progress.ts`, the content schema, or content files.** Reuse `progress.ts`'s existing API: `isDone(id)`, `setDone(id, done)`, `toggle(id)`.
- **Astro reserves `slug`** on content entries: use `course.slug` (built-in), never `course.data.slug`.
- **Client scripts use bundled static imports** (`import ... from '../lib/...'`), never a runtime `import('/src/...')` string.
- **`schedule.ts` is pure:** no DOM, no `localStorage`, no reading the clock inside it. "Today" and "start date" are passed in as ISO `YYYY-MM-DD` strings.
- **localStorage keys (verbatim):** start date `studyhub.calendar.start`, daily budget `studyhub.calendar.budget`.
- **Session key format (verbatim):** single-session resource → key is the plain `resourceId`; multi-session part k (1-based) → `` `${resourceId}#${k}` ``. Canonical "resource done" is always the plain `resourceId`.
- **Budget options:** 30 / 60 / 90 / 120, default **90**. Study **every day**. Start date defaults to **today**.
- **Ordering:** course `term` → course `order` → resource `order` (basic → advanced).

---

### Task 1: `schedule.ts` — ordering, packing, sessioning

**Files:**
- Create: `src/lib/schedule.ts`
- Test: `src/lib/schedule.test.ts`

**Interfaces:**
- Produces:
  - `interface ResourceInput { id, title, type, url, estMinutes, difficulty, course, courseTitle, topic, term, courseOrder, order }` (url `string | null`; numbers for estMinutes/term/courseOrder/order; rest `string`).
  - `interface SessionItem { key, resourceId, title, type, url, difficulty, courseTitle, topic, part, partCount, minutesToday }` (`part`/`partCount` are `number | null`; `minutesToday` number; url `string | null`).
  - `interface Day { dayIndex: number, items: SessionItem[], totalMinutes: number, isHeavy: boolean }`.
  - `orderResources(resources: ResourceInput[]): ResourceInput[]`.
  - `packIntoDays(resources: ResourceInput[], budget: number): Day[]`.

- [ ] **Step 1: Write the failing test**

`src/lib/schedule.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { orderResources, packIntoDays, type ResourceInput } from './schedule';

function r(over: Partial<ResourceInput>): ResourceInput {
  return {
    id: over.id ?? 'x', title: over.title ?? 'X', type: over.type ?? 'article',
    url: over.url ?? null, estMinutes: over.estMinutes ?? 30, difficulty: over.difficulty ?? 'beginner',
    course: over.course ?? 'c', courseTitle: over.courseTitle ?? 'C', topic: over.topic ?? 'T',
    term: over.term ?? 1, courseOrder: over.courseOrder ?? 1, order: over.order ?? 1,
  };
}

describe('orderResources', () => {
  it('sorts by term, then course order, then resource order', () => {
    const out = orderResources([
      r({ id: 'a', term: 1, courseOrder: 2, order: 1 }),
      r({ id: 'b', term: 1, courseOrder: 1, order: 2 }),
      r({ id: 'c', term: 1, courseOrder: 1, order: 1 }),
      r({ id: 'd', term: 2, courseOrder: 1, order: 1 }),
    ]).map((x) => x.id);
    expect(out).toEqual(['c', 'b', 'a', 'd']);
  });
});

describe('packIntoDays', () => {
  it('packs short items up to the budget, then starts a new day', () => {
    const days = packIntoDays(
      [r({ id: '1', estMinutes: 30 }), r({ id: '2', estMinutes: 30 }),
       r({ id: '3', estMinutes: 30 }), r({ id: '4', estMinutes: 30 })], 90);
    expect(days.length).toBe(2);
    expect(days[0].items.map((i) => i.resourceId)).toEqual(['1', '2', '3']);
    expect(days[0].totalMinutes).toBe(90);
    expect(days[1].items.map((i) => i.resourceId)).toEqual(['4']);
    expect(days[0].items[0].key).toBe('1');
    expect(days[0].items[0].part).toBeNull();
  });

  it('starts a new day when the next item would exceed the budget', () => {
    const days = packIntoDays([r({ id: '1', estMinutes: 50 }), r({ id: '2', estMinutes: 50 })], 90);
    expect(days.length).toBe(2);
  });

  it('splits an oversized resource into consecutive-day sessions', () => {
    const days = packIntoDays([r({ id: 'big', estMinutes: 200 })], 90);
    expect(days.length).toBe(3); // ceil(200/90)
    expect(days.every((d) => d.isHeavy)).toBe(true);
    expect(days.map((d) => d.items[0].key)).toEqual(['big#1', 'big#2', 'big#3']);
    expect(days.map((d) => d.items[0].minutesToday)).toEqual([90, 90, 20]);
    expect(days.map((d) => d.items[0].part)).toEqual([1, 2, 3]);
    expect(days.every((d) => d.items.length === 1)).toBe(true);
  });

  it('does not merge a single item onto a heavy multi-session day', () => {
    const days = packIntoDays([r({ id: 'big', estMinutes: 200 }), r({ id: 'small', estMinutes: 30 })], 90);
    expect(days.length).toBe(4);
    expect(days[3].items.map((i) => i.resourceId)).toEqual(['small']);
    expect(days[3].isHeavy).toBe(false);
  });

  it('never emits an empty day', () => {
    const days = packIntoDays([r({ id: '1', estMinutes: 10 })], 90);
    expect(days.length).toBe(1);
    expect(days[0].items.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/schedule.test.ts`
Expected: FAIL — cannot resolve `./schedule`.

- [ ] **Step 3: Write the implementation**

`src/lib/schedule.ts`:
```ts
export interface ResourceInput {
  id: string;
  title: string;
  type: string;
  url: string | null;
  estMinutes: number;
  difficulty: string;
  course: string;
  courseTitle: string;
  topic: string;
  term: number;
  courseOrder: number;
  order: number;
}

export interface SessionItem {
  key: string;
  resourceId: string;
  title: string;
  type: string;
  url: string | null;
  difficulty: string;
  courseTitle: string;
  topic: string;
  part: number | null;
  partCount: number | null;
  minutesToday: number;
}

export interface Day {
  dayIndex: number;
  items: SessionItem[];
  totalMinutes: number;
  isHeavy: boolean;
}

export function orderResources(resources: ResourceInput[]): ResourceInput[] {
  return [...resources].sort(
    (a, b) => a.term - b.term || a.courseOrder - b.courseOrder || a.order - b.order,
  );
}

function sessionItem(
  r: ResourceInput,
  key: string,
  part: number | null,
  partCount: number | null,
  minutesToday: number,
): SessionItem {
  return {
    key,
    resourceId: r.id,
    title: r.title,
    type: r.type,
    url: r.url,
    difficulty: r.difficulty,
    courseTitle: r.courseTitle,
    topic: r.topic,
    part,
    partCount,
    minutesToday,
  };
}

export function packIntoDays(resources: ResourceInput[], budget: number): Day[] {
  const days: Day[] = [];
  let current: Day | null = null;

  const newDay = (): Day => {
    const d: Day = { dayIndex: days.length, items: [], totalMinutes: 0, isHeavy: false };
    days.push(d);
    return d;
  };

  for (const r of resources) {
    if (r.estMinutes > budget) {
      const partCount = Math.ceil(r.estMinutes / budget);
      for (let k = 1; k <= partCount; k++) {
        const minutesToday = Math.min(budget, r.estMinutes - (k - 1) * budget);
        const d = newDay();
        d.items.push(sessionItem(r, `${r.id}#${k}`, k, partCount, minutesToday));
        d.totalMinutes = minutesToday;
        d.isHeavy = true;
      }
      current = null; // next resource starts a fresh day
    } else {
      if (!current || current.isHeavy || current.totalMinutes + r.estMinutes > budget) {
        current = newDay();
      }
      current.items.push(sessionItem(r, r.id, null, null, r.estMinutes));
      current.totalMinutes += r.estMinutes;
    }
  }

  return days;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/schedule.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Stage (commit blocked)**

```bash
git add src/lib/schedule.ts src/lib/schedule.test.ts
# commits are blocked on this device — staging only
```

---

### Task 2: `schedule.ts` — date mapping + roll-up helpers

**Files:**
- Modify: `src/lib/schedule.ts` (append functions)
- Modify: `src/lib/schedule.test.ts` (append tests)

**Interfaces:**
- Consumes: nothing from Task 1 (independent pure functions in the same file).
- Produces:
  - `dateForDay(startISO: string, dayIndex: number): string` — ISO `YYYY-MM-DD`.
  - `daysBetween(startISO: string, otherISO: string): number`.
  - `todayIndex(startISO: string, todayISO: string, dayCount: number): number` — index, or `-1` if before start or `>= dayCount`.
  - `sessionKeys(resourceId: string, partCount: number | null): string[]`.
  - `isResourceComplete(resourceId: string, partCount: number | null, isDone: (key: string) => boolean): boolean`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/schedule.test.ts`:
```ts
import {
  dateForDay, daysBetween, todayIndex, sessionKeys, isResourceComplete,
} from './schedule';

describe('date mapping', () => {
  it('maps a day index to a date, crossing month boundaries', () => {
    expect(dateForDay('2026-09-01', 0)).toBe('2026-09-01');
    expect(dateForDay('2026-09-01', 30)).toBe('2026-10-01');
  });
  it('counts days between two dates', () => {
    expect(daysBetween('2026-09-01', '2026-09-10')).toBe(9);
    expect(daysBetween('2026-09-10', '2026-09-01')).toBe(-9);
  });
  it('returns todayIndex within range, else -1', () => {
    expect(todayIndex('2026-09-01', '2026-09-05', 10)).toBe(4);
    expect(todayIndex('2026-09-01', '2026-08-30', 10)).toBe(-1); // before start
    expect(todayIndex('2026-09-01', '2026-09-20', 10)).toBe(-1); // past end (index 19 >= 10)
  });
});

describe('roll-up helpers', () => {
  it('builds session keys for single vs multi-session', () => {
    expect(sessionKeys('r', null)).toEqual(['r']);
    expect(sessionKeys('r', 1)).toEqual(['r']);
    expect(sessionKeys('r', 3)).toEqual(['r#1', 'r#2', 'r#3']);
  });
  it('is complete only when all session keys are done', () => {
    const done = new Set(['r#1', 'r#2']);
    expect(isResourceComplete('r', 3, (k) => done.has(k))).toBe(false);
    done.add('r#3');
    expect(isResourceComplete('r', 3, (k) => done.has(k))).toBe(true);
    expect(isResourceComplete('s', null, (k) => k === 's')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/schedule.test.ts`
Expected: FAIL — `dateForDay` (and the other new imports) not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/schedule.ts`:
```ts
const DAY_MS = 86_400_000;

function parseISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateForDay(startISO: string, dayIndex: number): string {
  return toISO(parseISO(startISO) + dayIndex * DAY_MS);
}

export function daysBetween(startISO: string, otherISO: string): number {
  return Math.round((parseISO(otherISO) - parseISO(startISO)) / DAY_MS);
}

export function todayIndex(startISO: string, todayISO: string, dayCount: number): number {
  const idx = daysBetween(startISO, todayISO);
  return idx >= 0 && idx < dayCount ? idx : -1;
}

export function sessionKeys(resourceId: string, partCount: number | null): string[] {
  if (!partCount || partCount <= 1) return [resourceId];
  return Array.from({ length: partCount }, (_, i) => `${resourceId}#${i + 1}`);
}

export function isResourceComplete(
  resourceId: string,
  partCount: number | null,
  isDone: (key: string) => boolean,
): boolean {
  return sessionKeys(resourceId, partCount).every(isDone);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/schedule.test.ts`
Expected: PASS (all schedule tests: 7 from Task 1 + 4 new = 11). Then run the full suite: `npm test` → 14 (Phase 1) + 11 = 25 tests pass.

- [ ] **Step 5: Stage (commit blocked)**

```bash
git add src/lib/schedule.ts src/lib/schedule.test.ts
```

---

### Task 3: `calendar.astro` shell + data island + nav link

**Files:**
- Create: `src/pages/calendar.astro`
- Modify: `src/layouts/Base.astro` (add one nav link)

**Interfaces:**
- Consumes: content collections `courses`, `resources`.
- Produces: a `/calendar` route that renders the settings bar, a `#cal-summary` element, a `#cal-root` mount point, and a `<script type="application/json" id="calendar-data">` island whose text is a JSON array of `ResourceInput` (see Task 1), pre-sorted by term → courseOrder → order.

- [ ] **Step 1: Add the Calendar nav link to `Base.astro`**

In `src/layouts/Base.astro`, find:
```astro
      <a href="/browse">Browse</a>
```
and change it to:
```astro
      <a href="/browse">Browse</a>
      <a href="/calendar">Calendar</a>
```

- [ ] **Step 2: Create the calendar page shell + data island**

`src/pages/calendar.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import { getCollection } from 'astro:content';

const courses = await getCollection('courses');
const courseBySlug = new Map(courses.map((c) => [c.slug, c]));
const resources = await getCollection('resources');

const items = resources
  .map((r) => {
    const c = courseBySlug.get(r.data.course);
    return {
      id: r.id,
      title: r.data.title,
      type: r.data.type,
      url: r.data.url ?? null,
      estMinutes: r.data.estMinutes,
      difficulty: r.data.difficulty,
      course: r.data.course,
      courseTitle: c?.data.title ?? r.data.course,
      topic: r.data.topic,
      term: c?.data.term ?? 999,
      courseOrder: c?.data.order ?? 999,
      order: r.data.order,
    };
  })
  .sort((a, b) => a.term - b.term || a.courseOrder - b.courseOrder || a.order - b.order);

// Escape `<` so the JSON can never break out of the <script> element.
const dataJson = JSON.stringify(items).replace(/</g, '\\u003c');
---
<Base title="Study Calendar">
  <h1>Study Calendar</h1>
  <p style="color:var(--muted)">An auto-generated day-by-day plan through the curriculum. Pick a start date and how many minutes you can study per day.</p>

  <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end; margin:16px 0">
    <label style="font-size:13px; color:var(--muted)">Start date<br>
      <input type="date" id="cal-start" class="btn" style="margin-top:4px" />
    </label>
    <label style="font-size:13px; color:var(--muted)">Minutes per day<br>
      <select id="cal-budget" class="btn" style="margin-top:4px">
        <option value="30">30</option>
        <option value="60">60</option>
        <option value="90" selected>90</option>
        <option value="120">120</option>
      </select>
    </label>
    <button class="btn" id="cal-today">Jump to today</button>
  </div>

  <p id="cal-summary" style="color:var(--muted); font-size:14px"></p>
  <div id="cal-root"></div>
  <p id="cal-empty" style="display:none; color:var(--muted)">No resources scheduled yet. Add some in the <a href="/">library</a>.</p>

  <script type="application/json" id="calendar-data" set:html={dataJson}></script>
</Base>
```

- [ ] **Step 3: Verify build emits the data and page**

Run: `npm run build`
Expected: build succeeds; `dist/calendar/index.html` exists. Confirm the data island is populated (should contain the seeded resources):
```bash
grep -c 'calendar-data' dist/calendar/index.html   # expect 1
grep -o 'What Is Programming' dist/calendar/index.html | head -1   # a seeded title appears in the JSON
```
Also confirm the nav link is present: `grep -o '/calendar' dist/index.html | head -1`.

- [ ] **Step 4: Stage (commit blocked)**

```bash
git add src/pages/calendar.astro src/layouts/Base.astro
```

---

### Task 4: Calendar client script — render, settings, progress

**Files:**
- Modify: `src/pages/calendar.astro` (add the bundled client `<script>` before `</Base>`, after the JSON island)

**Interfaces:**
- Consumes: `schedule.ts` (`packIntoDays`, `dateForDay`, `todayIndex`, `sessionKeys`, `isResourceComplete`, types), `progress.ts` (`isDone`, `setDone`), the `#calendar-data` island, and DOM ids `cal-start`, `cal-budget`, `cal-today`, `cal-summary`, `cal-root`, `cal-empty`.
- Produces: the interactive calendar (renders day cards, persists settings, checks off sessions, rolls up completion).

- [ ] **Step 1: Add the client script**

In `src/pages/calendar.astro`, immediately AFTER the `<script type="application/json" id="calendar-data">...</script>` line and before `</Base>`, add:
```astro
  <script>
    import * as p from '../lib/progress';
    import {
      packIntoDays, dateForDay, todayIndex, sessionKeys, isResourceComplete,
      type ResourceInput, type Day,
    } from '../lib/schedule';

    const START_KEY = 'studyhub.calendar.start';
    const BUDGET_KEY = 'studyhub.calendar.budget';
    const ICON: Record<string, string> = { video: '▶', article: '📄', exercise: '⚡', reference: '📘', note: '📝' };
    const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dataEl = document.getElementById('calendar-data');
    const items: ResourceInput[] = dataEl ? JSON.parse(dataEl.textContent || '[]') : [];

    const startInput = document.getElementById('cal-start') as HTMLInputElement | null;
    const budgetSelect = document.getElementById('cal-budget') as HTMLSelectElement | null;
    const summaryEl = document.getElementById('cal-summary');
    const root = document.getElementById('cal-root');
    const emptyEl = document.getElementById('cal-empty');

    function todayISO(): string {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function getStart(): string { return localStorage.getItem(START_KEY) || todayISO(); }
    function getBudget(): number { return Number(localStorage.getItem(BUDGET_KEY)) || 90; }

    function escapeHtml(s: string): string {
      return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    }
    function monthLabel(iso: string): string {
      const [y, m] = iso.split('-').map(Number);
      return `${MONTHS[m - 1]} ${y}`;
    }
    function weekday(iso: string): string {
      const [y, m, d] = iso.split('-').map(Number);
      return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    }

    // If a multi-session resource was marked done elsewhere (course page), seed its sessions.
    function reconcile(days: Day[]): void {
      const seen = new Set<string>();
      for (const day of days) {
        for (const it of day.items) {
          if (it.partCount && it.partCount > 1 && !seen.has(it.resourceId)) {
            seen.add(it.resourceId);
            if (p.isDone(it.resourceId)) {
              for (const k of sessionKeys(it.resourceId, it.partCount)) p.setDone(k, true);
            }
          }
        }
      }
    }

    function render(): void {
      if (!root) return;
      const start = getStart();
      const budget = getBudget();
      if (startInput) startInput.value = start;
      if (budgetSelect) budgetSelect.value = String(budget);

      const days = packIntoDays(items, budget);
      reconcile(days);

      if (emptyEl) emptyEl.style.display = days.length === 0 ? '' : 'none';

      const tIdx = todayIndex(start, todayISO(), days.length);
      let totalSessions = 0;
      let doneSessions = 0;

      root.innerHTML = '';
      let currentMonth = '';
      for (const day of days) {
        const iso = dateForDay(start, day.dayIndex);
        const ml = monthLabel(iso);
        if (ml !== currentMonth) {
          currentMonth = ml;
          const h = document.createElement('h2');
          h.textContent = ml;
          h.style.cssText = 'font-size:15px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:28px';
          root.appendChild(h);
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '12px';
        if (day.dayIndex === tIdx) { card.style.borderColor = 'var(--accent)'; card.id = 'cal-today-card'; }
        else if (tIdx >= 0 && day.dayIndex < tIdx) { card.style.opacity = '0.6'; }

        const doneInDay = day.items.filter((it) => p.isDone(it.key)).length;
        totalSessions += day.items.length;
        doneSessions += doneInDay;

        const head = document.createElement('div');
        head.style.cssText = 'display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--muted);margin-bottom:8px';
        head.innerHTML =
          `<strong style="color:var(--text)">${weekday(iso)} ${iso}${day.dayIndex === tIdx ? ' · Today' : ''}</strong>` +
          `<span>Day ${day.dayIndex + 1} · ${day.totalMinutes} min · <span class="day-count">${doneInDay}/${day.items.length}</span> done</span>`;
        card.appendChild(head);

        if (day.isHeavy) {
          const note = document.createElement('div');
          note.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:8px';
          note.textContent = 'A big one — may take a few sittings.';
          card.appendChild(note);
        }

        for (const it of day.items) {
          const row = document.createElement('label');
          row.style.cssText = 'display:flex;gap:10px;align-items:center;padding:6px 0';
          const box = document.createElement('input');
          box.type = 'checkbox';
          box.className = 'cal-box';
          box.checked = p.isDone(it.key);
          box.addEventListener('change', () => {
            p.setDone(it.key, box.checked);
            p.setDone(it.resourceId, isResourceComplete(it.resourceId, it.partCount, p.isDone));
            render();
          });
          const label = document.createElement('div');
          label.style.flex = '1';
          const part = it.part ? ` · Part ${it.part} of ${it.partCount}` : '';
          const titleHtml = it.url
            ? `<a href="${escapeHtml(it.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(it.title)}</strong></a>`
            : `<strong>${escapeHtml(it.title)}</strong>`;
          label.innerHTML =
            `${ICON[it.type] || '•'} ${titleHtml}${part}` +
            `<div style="color:var(--muted);font-size:12px">${escapeHtml(it.courseTitle)} · ${it.minutesToday} min · <span class="chip">${escapeHtml(it.difficulty)}</span></div>`;
          row.appendChild(box);
          row.appendChild(label);
          card.appendChild(row);
        }
        root.appendChild(card);
      }

      if (summaryEl) {
        if (days.length === 0) {
          summaryEl.textContent = '';
        } else {
          const pct = totalSessions ? Math.round((doneSessions / totalSessions) * 100) : 0;
          const finish = dateForDay(start, days.length - 1);
          const where = tIdx >= 0 ? `Day ${tIdx + 1} of ${days.length}` : `${days.length}-day plan`;
          summaryEl.textContent = `${where} · ${pct}% complete · estimated finish ${finish}`;
        }
      }
    }

    startInput?.addEventListener('change', () => {
      if (startInput.value) { localStorage.setItem(START_KEY, startInput.value); render(); }
    });
    budgetSelect?.addEventListener('change', () => {
      localStorage.setItem(BUDGET_KEY, budgetSelect.value); render();
    });
    document.getElementById('cal-today')?.addEventListener('click', () => {
      document.getElementById('cal-today-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    render();
  </script>
```

- [ ] **Step 2: Verify build + type-check**

Run: `npm run build` then `npm run check`
Expected: build passes; `astro check` reports 0 errors. If `check` flags the `type` import, ensure `schedule.ts` exports `ResourceInput`/`Day` as `interface` (they are) and the import uses `type` — already the case above.

- [ ] **Step 3: Runtime smoke test**

Run:
```bash
npm run preview &
# wait for the URL, then:
curl -s http://localhost:4321/calendar/ -o /dev/null -w "%{http_code}\n"   # 200
```
Open `/calendar` in a browser and confirm: month sections and day cards render; today's card is accent-bordered; checking a session box updates the "x/y done" count and the summary percent; changing the budget dropdown re-packs the days; changing the start date re-labels dates; "Jump to today" scrolls to today's card. Stop the preview server. (If headless, rely on the build + `check` + the unit tests, which cover all scheduling logic.)

- [ ] **Step 4: Full verification**

Run:
```bash
npm test        # 25 tests pass (14 Phase 1 + 11 schedule)
npm run check   # 0 errors
npm run build   # passes; dist/calendar/index.html present
```

- [ ] **Step 5: Stage (commit blocked)**

```bash
git add src/pages/calendar.astro
```

---

## Self-Review Notes (author's check against the spec)

- **Spec §3 architecture** (build-time JSON island + client `schedule.ts` + reuse `progress.ts`) → Task 3 (island), Task 4 (client), Tasks 1–2 (schedule). ✅
- **Spec §4.1 ordering** → `orderResources` (Task 1) + the build sort in Task 3. ✅
- **Spec §4.2 packing + sessioning** (≤ budget packs; oversized → `ceil` sessions one-per-day; at-least-one-per-day; `isHeavy`) → Task 1 `packIntoDays` + tests. ✅
- **Spec §4.3 date mapping** (pure, clock passed in) → Task 2 `dateForDay`/`daysBetween`/`todayIndex` + tests. ✅
- **Spec §4.4 roll-up + reconcile** → `sessionKeys`/`isResourceComplete` (Task 2) + `reconcile()` and the checkbox roll-up `setDone(resourceId, isResourceComplete(...))` (Task 4). ✅
- **Spec §5 page/UX** (settings bar, defaults, header summary, month sections, day cards, today highlight, heavy note, jump-to-today, empty state) → Tasks 3–4. ✅
- **Spec §6 files** and **§8 boundaries** (pure `schedule.ts`; unchanged `progress.ts`; one nav link) → matches. ✅
- **localStorage keys / session key format / budget defaults** copied verbatim into Global Constraints and used consistently in Tasks 3–4. ✅
- **Deferred (not in scope):** manual drag-and-drop, reflow planning, sync — per spec §1 non-goals.
