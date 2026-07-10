# Study Hub — Phase 1 (Resource Library) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, data-driven Astro website that presents the Algonquin College Computer Programming diploma curriculum as a clean, visually ordered (basic→advanced) resource library with per-resource check-off and progress bars saved in the browser.

**Architecture:** Astro static site. Curriculum lives in two content collections (`courses`, `resources`) validated by a shared Zod schema. Pages are presentational Astro components that read content at build time. Progress is the only runtime state — an isolated vanilla-JS module backed by `localStorage`, imported as a client script. No backend, no accounts.

**Tech Stack:** Astro 4+, TypeScript, Zod (bundled with Astro content collections), Vitest (unit tests for pure logic), plain CSS with custom properties for theming.

## Global Constraints

- **Node/npm required.** Target Node 18+ (Astro 4 floor).
- **Commits are blocked on this device by a standing rule.** Where a step says `git commit`, run the `git add` and let the user commit manually — do not treat the blocked commit as a failure. Keep the commit messages in the plan for the user's use.
- **Content is data, never code.** No course/resource facts hard-coded in components; everything reads from `src/content/`.
- **Ordering is explicit.** Every course and resource carries an integer `order`; the UI always sorts by it, never by filename or insertion order alone.
- **Difficulty vocabulary is fixed:** `beginner` | `intermediate` | `advanced`.
- **Resource type vocabulary is fixed:** `video` | `article` | `exercise` | `reference` | `note`.
- **Curriculum source of truth:** Algonquin CP diploma, Levels 1–4 (researched 2026-07-10). `term` field = Level number (1–4). Course list embedded in Task 3.

---

### Task 1: Scaffold Astro project and test runner

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/pages/index.astro` (temporary placeholder, replaced in Task 7)

**Interfaces:**
- Produces: a runnable Astro dev server (`npm run dev`) and a Vitest runner (`npm test`).

- [ ] **Step 1: Scaffold a minimal Astro project**

Run in the project root (`/Users/vermilion/Desktop/computer-programming`):
```bash
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict --skip-houston
```
If the CLI refuses because the directory is non-empty (the `docs/` folder exists), scaffold into a temp dir and move files:
```bash
npm create astro@latest .studyhub-tmp -- --template minimal --no-install --no-git --typescript strict --skip-houston
cp -R .studyhub-tmp/. . && rm -rf .studyhub-tmp
```

- [ ] **Step 2: Add Vitest and install**

Add to `package.json` `devDependencies` and scripts, then install:
```jsonc
// package.json — ensure these fields exist
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "check": "astro check",
  "test": "vitest run"
},
"devDependencies": {
  "astro": "^4.15.0",
  "vitest": "^2.0.0",
  "@astrojs/check": "^0.9.0",
  "typescript": "^5.5.0"
}
```
Run:
```bash
npm install
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Verify dev server and test runner boot**

Run:
```bash
npm run build
```
Expected: build succeeds (the minimal template's `index.astro` compiles). Then:
```bash
npm test
```
Expected: Vitest runs and reports "No test files found" (exit 0) — the runner works; tests come next.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts .gitignore src/
git commit -m "chore: scaffold Astro project with Vitest"
```

---

### Task 2: Content schema (courses + resources collections)

**Files:**
- Create: `src/content/config.ts`
- Create: `src/lib/schema.ts` (exported Zod schemas, imported by both content config and tests)
- Test: `src/lib/schema.test.ts`

**Interfaces:**
- Produces: `courseSchema`, `resourceSchema` (Zod objects); TS types `Course`, `Resource`. Course fields: `title:string, term:number, order:number, slug:string, description:string, difficulty:enum`. Resource fields: `course:string(courseSlug), topic:string, order:number, title:string, type:enum, url?:string, estMinutes:number, difficulty:enum`.

- [ ] **Step 1: Write the failing test**

`src/lib/schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { courseSchema, resourceSchema } from './schema';

describe('courseSchema', () => {
  it('accepts a valid course', () => {
    const parsed = courseSchema.parse({
      title: 'Introduction to Computer Programming',
      term: 1, order: 1, slug: 'intro-to-computer-programming',
      description: 'Fundamentals.', difficulty: 'beginner',
    });
    expect(parsed.term).toBe(1);
  });
  it('rejects an unknown difficulty', () => {
    expect(() => courseSchema.parse({
      title: 'x', term: 1, order: 1, slug: 'x', description: 'x', difficulty: 'wizard',
    })).toThrow();
  });
});

describe('resourceSchema', () => {
  it('accepts a valid video resource', () => {
    const parsed = resourceSchema.parse({
      course: 'intro-to-computer-programming', topic: 'Variables', order: 1,
      title: 'Variables 101', type: 'video', url: 'https://y.tube/x',
      estMinutes: 12, difficulty: 'beginner',
    });
    expect(parsed.type).toBe('video');
  });
  it('rejects an unknown resource type', () => {
    expect(() => resourceSchema.parse({
      course: 'x', topic: 'x', order: 1, title: 'x', type: 'podcast',
      estMinutes: 1, difficulty: 'beginner',
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Write the schema**

`src/lib/schema.ts`:
```ts
import { z } from 'astro:content';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const RESOURCE_TYPES = ['video', 'article', 'exercise', 'reference', 'note'] as const;

export const courseSchema = z.object({
  title: z.string(),
  term: z.number().int().min(1),
  order: z.number().int().min(1),
  slug: z.string(),
  description: z.string(),
  difficulty: z.enum(DIFFICULTIES),
});

export const resourceSchema = z.object({
  course: z.string(),            // course slug
  topic: z.string(),
  order: z.number().int().min(1),
  title: z.string(),
  type: z.enum(RESOURCE_TYPES),
  url: z.string().url().optional(),
  estMinutes: z.number().int().min(1),
  difficulty: z.enum(DIFFICULTIES),
});

export type Course = z.infer<typeof courseSchema>;
export type Resource = z.infer<typeof resourceSchema>;
```

> Note: `astro:content` re-exports `zod` as `z`. If running the Vitest test outside Astro's module resolution errors on the `astro:content` import, change the first line to `import { z } from 'zod';` and add `zod` to devDependencies (`npm install -D zod`). Astro bundles a compatible Zod, so the schema stays identical.

- [ ] **Step 4: Wire the schema into content collections**

`src/content/config.ts`:
```ts
import { defineCollection } from 'astro:content';
import { courseSchema, resourceSchema } from '../lib/schema';

const courses = defineCollection({ type: 'content', schema: courseSchema });
const resources = defineCollection({ type: 'content', schema: resourceSchema });

export const collections = { courses, resources };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/lib/schema.test.ts`
Expected: PASS (4 tests). If the `astro:content` import fails under Vitest, apply the Step 3 note and re-run.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.ts src/lib/schema.test.ts src/content/config.ts
git commit -m "feat: add validated content schema for courses and resources"
```

---

### Task 3: Seed the real Algonquin curriculum + starter resources

**Files:**
- Create: `src/content/courses/*.md` (one per course below)
- Create: `src/content/resources/intro-to-computer-programming/*.md` (3 starter resources)
- Create: `src/content/resources/introduction-to-database/*.md` (1 starter resource)

**Interfaces:**
- Consumes: `courseSchema`, `resourceSchema` from Task 2.
- Produces: a populated content library that `astro build` validates. Course `slug` values become the URLs used by Task 6.

**Course list (embed verbatim — `term` = Level, `order` = sequence within level).** Difficulty: Level 1–2 → `beginner`, Level 3 → `intermediate`, Level 4 → `advanced`.

| term | order | slug | title |
|---|---|---|---|
| 1 | 1 | foundation-of-ai-assisted-development | Foundation of AI-Assisted Development (CST2003) |
| 1 | 2 | intro-to-computer-programming | Introduction to Computer Programming (CST8116) |
| 1 | 3 | computer-essentials | Computer Essentials (CST8118) |
| 1 | 4 | introduction-to-database | Introduction to Database (CST8215) |
| 1 | 5 | professional-communication-essentials | Professional Communication Essentials (ENL1004) |
| 1 | 6 | technical-mathematics | Technical Mathematics for Computer Science (MAT8001C) |
| 2 | 1 | database-systems | Database Systems (CST2355) |
| 2 | 2 | operating-system-fundamentals | Operating System Fundamentals — GNU/Linux (CST8102) |
| 2 | 3 | oop-java | Object Oriented Programming — Java (CST8284) |
| 2 | 4 | web-programming | Web Programming (CST8326) |
| 2 | 5 | communicating-technical-information | Communicating Technical Information (ENL2019T) |
| 3 | 1 | systems-analysis-and-design | Systems Analysis and Design (CST2234) |
| 3 | 2 | mobile-gui-programming | Mobile Graphical Interface Programming (CST2335) |
| 3 | 3 | python-data-structures-algorithms | Python, Data Structures and Algorithms (CST8003) |
| 3 | 4 | network-programming | Network Programming (CST8109) |
| 3 | 5 | oop-design-patterns | Object Oriented Programming with Design Patterns (CST8288) |
| 4 | 1 | advanced-database-topics | Advanced Database Topics (CST8276) |
| 4 | 2 | enterprise-application-programming | Enterprise Application Programming (CST8277) |
| 4 | 3 | software-development-project | Software Development Project (CST8319) |

- [ ] **Step 1: Create one course file per row above**

Template — `src/content/courses/intro-to-computer-programming.md`:
```markdown
---
title: "Introduction to Computer Programming"
term: 1
order: 2
slug: "intro-to-computer-programming"
description: "Programming fundamentals: variables, data types, control flow, methods, and problem-solving using a first language."
difficulty: beginner
---
```
Create the remaining 18 files the same way, copying `title`, `term`, `order`, `slug`, `difficulty` from the table. Write a one-sentence `description` for each based on the course title (e.g. Database Systems → "Relational database design, normalization, and advanced SQL querying."). The filename must equal `<slug>.md`.

- [ ] **Step 2: Create 3 starter resources for `intro-to-computer-programming`**

`src/content/resources/intro-to-computer-programming/01-what-is-programming.md`:
```markdown
---
course: "intro-to-computer-programming"
topic: "Getting Started"
order: 1
title: "What Is Programming? (overview)"
type: video
url: "https://www.youtube.com/watch?v=zOjov-2OZ0E"
estMinutes: 10
difficulty: beginner
---
```
`src/content/resources/intro-to-computer-programming/02-variables-and-types.md`:
```markdown
---
course: "intro-to-computer-programming"
topic: "Fundamentals"
order: 2
title: "Variables and Data Types"
type: article
url: "https://www.w3schools.com/java/java_variables.asp"
estMinutes: 15
difficulty: beginner
---
```
`src/content/resources/intro-to-computer-programming/03-loops-practice.md`:
```markdown
---
course: "intro-to-computer-programming"
topic: "Control Flow"
order: 3
title: "Loops — Practice Problems"
type: exercise
url: "https://www.hackerrank.com/domains/java"
estMinutes: 30
difficulty: beginner
---

My notes: start with `for`, then `while`. Trace each loop on paper first.
```

- [ ] **Step 3: Create 1 starter resource for `introduction-to-database`**

`src/content/resources/introduction-to-database/01-sql-basics.md`:
```markdown
---
course: "introduction-to-database"
topic: "SQL Basics"
order: 1
title: "SQL in 100 Seconds + SELECT basics"
type: video
url: "https://www.youtube.com/watch?v=zsjvFFKOm3c"
estMinutes: 12
difficulty: beginner
---
```

- [ ] **Step 4: Verify content validates**

Run: `npm run build`
Expected: build succeeds with no Zod validation errors. If a file fails, the error names the file and field — fix and rebuild.

- [ ] **Step 5: Commit**

```bash
git add src/content/courses src/content/resources
git commit -m "content: seed Algonquin CP curriculum and starter resources"
```

---

### Task 4: Progress module (localStorage)

**Files:**
- Create: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`

**Interfaces:**
- Produces: `isDone(id: string): boolean`, `toggle(id: string): boolean` (returns new state), `setDone(id, done): void`, `courseProgress(resourceIds: string[]): number` (0–100, integer), `exportProgress(): string` (JSON), `importProgress(json: string): void`. Backed by `localStorage` key `studyhub.progress`. `id` is `` `${course}/${resourceOrder}` `` or the resource file slug — Task 6 passes the resource's `id` (its collection entry `id`).

- [ ] **Step 1: Write the failing test**

`src/lib/progress.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal localStorage shim for node env
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemStorage());
  vi.resetModules();
});

async function load() { return await import('./progress'); }

describe('progress', () => {
  it('starts not done and toggles on', async () => {
    const p = await load();
    expect(p.isDone('a')).toBe(false);
    expect(p.toggle('a')).toBe(true);
    expect(p.isDone('a')).toBe(true);
  });
  it('toggles back off', async () => {
    const p = await load();
    p.toggle('a'); p.toggle('a');
    expect(p.isDone('a')).toBe(false);
  });
  it('computes course progress as integer percent', async () => {
    const p = await load();
    p.setDone('x', true); p.setDone('y', true);
    expect(p.courseProgress(['x', 'y', 'z', 'w'])).toBe(50);
    expect(p.courseProgress([])).toBe(0);
  });
  it('exports and imports', async () => {
    const p = await load();
    p.setDone('a', true);
    const dump = p.exportProgress();
    p.setDone('a', false);
    p.importProgress(dump);
    expect(p.isDone('a')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/progress.test.ts`
Expected: FAIL — cannot resolve `./progress`.

- [ ] **Step 3: Write the implementation**

`src/lib/progress.ts`:
```ts
const KEY = 'studyhub.progress';

type State = Record<string, boolean>;

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : {};
  } catch {
    return {};
  }
}

function write(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function isDone(id: string): boolean {
  return read()[id] === true;
}

export function setDone(id: string, done: boolean): void {
  const state = read();
  if (done) state[id] = true;
  else delete state[id];
  write(state);
}

export function toggle(id: string): boolean {
  const next = !isDone(id);
  setDone(id, next);
  return next;
}

export function courseProgress(resourceIds: string[]): number {
  if (resourceIds.length === 0) return 0;
  const state = read();
  const done = resourceIds.filter((id) => state[id] === true).length;
  return Math.round((done / resourceIds.length) * 100);
}

export function exportProgress(): string {
  return JSON.stringify(read(), null, 2);
}

export function importProgress(json: string): void {
  const parsed = JSON.parse(json) as State;
  write(parsed);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/progress.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat: add localStorage-backed progress module"
```

---

### Task 5: Base layout, global nav, and dark mode

**Files:**
- Create: `src/layouts/Base.astro`
- Create: `src/styles/global.css`
- Create: `src/lib/nav.ts` (builds the term→course tree for nav; reused by dashboard in Task 7)

**Interfaces:**
- Consumes: `getCollection('courses')` from Astro; `Course` type from Task 2.
- Produces: `getCourseTree(): Promise<{ term: number; courses: Course[] }[]>` — courses sorted by `order`, grouped by `term`, terms ascending. `Base.astro` provides `<slot />`, the nav, and a theme toggle that sets `data-theme` on `<html>` and persists to `localStorage` key `studyhub.theme`.

- [ ] **Step 1: Write the nav helper**

`src/lib/nav.ts`:
```ts
import { getCollection } from 'astro:content';

export async function getCourseTree() {
  const entries = await getCollection('courses');
  const byTerm = new Map<number, typeof entries>();
  for (const e of entries) {
    const list = byTerm.get(e.data.term) ?? [];
    list.push(e);
    byTerm.set(e.data.term, list);
  }
  return [...byTerm.entries()]
    .sort(([a], [b]) => a - b)
    .map(([term, courses]) => ({
      term,
      courses: courses.sort((a, b) => a.data.order - b.data.order),
    }));
}
```

- [ ] **Step 2: Write the global stylesheet**

`src/styles/global.css` — theme tokens + base layout:
```css
:root {
  --bg: #f7f8fa; --surface: #ffffff; --text: #1a1d21; --muted: #5a6270;
  --border: #e3e6ea; --accent: #3b6cff; --accent-weak: #e7edff;
  --ok: #1f9d55; --radius: 12px; --maxw: 1080px;
}
:root[data-theme='dark'] {
  --bg: #14161a; --surface: #1d2026; --text: #e8eaed; --muted: #9aa2ad;
  --border: #2b2f37; --accent: #6f9bff; --accent-weak: #21283a; --ok: #37c46f;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.55 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.container { max-width: var(--maxw); margin: 0 auto; padding: 0 20px; }
.topbar {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 20px; border-bottom: 1px solid var(--border);
  background: var(--surface); position: sticky; top: 0; z-index: 10;
}
.topbar .brand { font-weight: 700; }
.topbar .spacer { flex: 1; }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
}
.progress { height: 8px; background: var(--border); border-radius: 99px; overflow: hidden; }
.progress > span { display: block; height: 100%; background: var(--ok); }
.btn {
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
  border-radius: 8px; padding: 6px 12px; cursor: pointer; font: inherit;
}
.chip {
  font-size: 12px; padding: 2px 8px; border-radius: 99px;
  background: var(--accent-weak); color: var(--accent);
}
```

- [ ] **Step 3: Write `Base.astro`**

`src/layouts/Base.astro`:
```astro
---
import '../styles/global.css';
interface Props { title: string; }
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} · Study Hub</title>
    <script is:inline>
      const t = localStorage.getItem('studyhub.theme');
      if (t) document.documentElement.setAttribute('data-theme', t);
    </script>
  </head>
  <body>
    <header class="topbar">
      <a class="brand" href="/">📚 Study Hub</a>
      <a href="/browse">Browse</a>
      <span class="spacer"></span>
      <button class="btn" id="theme-toggle" aria-label="Toggle theme">🌓</button>
    </header>
    <main class="container" style="padding-top:24px; padding-bottom:64px;">
      <slot />
    </main>
    <script>
      const btn = document.getElementById('theme-toggle');
      btn?.addEventListener('click', () => {
        const el = document.documentElement;
        const next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        el.setAttribute('data-theme', next);
        localStorage.setItem('studyhub.theme', next);
      });
    </script>
  </body>
</html>
```

- [ ] **Step 4: Verify it builds and renders**

Run: `npm run build && npm run dev`
Open the dev URL. Expected: top bar with brand + Browse link + theme toggle; clicking the toggle flips light/dark and persists on reload. (Placeholder `index.astro` from Task 1 still shows below — replaced in Task 7.)

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Base.astro src/styles/global.css src/lib/nav.ts
git commit -m "feat: add base layout, theme toggle, and nav helper"
```

---

### Task 6: Reusable cards + course page

**Files:**
- Create: `src/components/ProgressBar.astro`
- Create: `src/components/ResourceCard.astro`
- Create: `src/pages/course/[slug].astro`

**Interfaces:**
- Consumes: `getCollection`, `Base.astro`, `progress.ts` (client-side).
- Produces: a route per course at `/course/<slug>`. Each resource card renders a checkbox wired to `progress.toggle(id)` where `id` is the resource entry's `id`. A per-course progress bar reads `courseProgress` on load.
- Resource `id` contract: Astro gives each resource entry an `id` like `intro-to-computer-programming/01-what-is-programming.md`. This exact string is the progress key everywhere.

- [ ] **Step 1: Write `ProgressBar.astro`**

```astro
---
interface Props { percent: number; }
const { percent } = Astro.props;
---
<div class="progress" aria-label={`${percent}% complete`}>
  <span style={`width:${percent}%`}></span>
</div>
```

- [ ] **Step 2: Write `ResourceCard.astro`**

`src/components/ResourceCard.astro`:
```astro
---
interface Props {
  id: string; title: string; type: string;
  url?: string; estMinutes: number; difficulty: string;
}
const { id, title, type, url, estMinutes, difficulty } = Astro.props;
const icon = { video: '▶', article: '📄', exercise: '⚡', reference: '📘', note: '📝' }[type] ?? '•';
const href = type === 'note' ? undefined : url;
---
<div class="card resource" data-resource-id={id}
     style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
  <input type="checkbox" class="done-box" aria-label={`Mark ${title} done`} />
  <span style="font-size:20px">{icon}</span>
  <div style="flex:1">
    {href
      ? <a href={href} target="_blank" rel="noopener"><strong>{title}</strong></a>
      : <strong>{title}</strong>}
    <div style="color:var(--muted); font-size:13px">
      {type} · {estMinutes} min · <span class="chip">{difficulty}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Write the course page**

`src/pages/course/[slug].astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import ResourceCard from '../../components/ResourceCard.astro';
import ProgressBar from '../../components/ProgressBar.astro';

export async function getStaticPaths() {
  const courses = await getCollection('courses');
  return courses.map((c) => ({ params: { slug: c.data.slug }, props: { course: c } }));
}

const { course } = Astro.props;
const all = await getCollection('resources');
const resources = all
  .filter((r) => r.data.course === course.data.slug)
  .sort((a, b) => a.data.order - b.data.order);

// group by topic, preserving first-seen order
const topics: { topic: string; items: typeof resources }[] = [];
for (const r of resources) {
  let g = topics.find((t) => t.topic === r.data.topic);
  if (!g) { g = { topic: r.data.topic, items: [] }; topics.push(g); }
  g.items.push(r);
}
const resourceIds = resources.map((r) => r.id);
---
<Base title={course.data.title}>
  <p><a href="/">← All courses</a></p>
  <h1>{course.data.title}</h1>
  <p style="color:var(--muted)">{course.data.description}</p>
  <div style="margin:16px 0"><ProgressBar percent={0} /></div>
  <p id="course-progress-label" style="color:var(--muted); font-size:13px"></p>

  {topics.length === 0 && <p><em>No resources added yet. Drop a file in <code>src/content/resources/{course.data.slug}/</code>.</em></p>}

  {topics.map((t) => (
    <section style="margin-top:24px">
      <h2 style="font-size:18px">{t.topic}</h2>
      {t.items.map((r) => (
        <ResourceCard id={r.id} title={r.data.title} type={r.data.type}
          url={r.data.url} estMinutes={r.data.estMinutes} difficulty={r.data.difficulty} />
      ))}
    </section>
  ))}

  <script define:vars={{ resourceIds }}>
    import('/src/lib/progress.ts').then((p) => {
      const bar = document.querySelector('.progress > span');
      const label = document.getElementById('course-progress-label');
      const refresh = () => {
        const pct = p.courseProgress(resourceIds);
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = pct + '% complete';
      };
      document.querySelectorAll('.resource').forEach((el) => {
        const id = el.getAttribute('data-resource-id');
        const box = el.querySelector('.done-box');
        box.checked = p.isDone(id);
        box.addEventListener('change', () => { p.toggle(id); refresh(); });
      });
      refresh();
    });
  </script>
</Base>
```

> Note on the client import path: Astro serves `src/` modules in dev, but for the production build use a bundled client script instead of a runtime string import. If `import('/src/lib/progress.ts')` fails in `npm run build`, replace the inline `<script>` with a top-level module import at the frontmatter-adjacent client boundary: change the script tag to `<script>` (no `is:inline`) and `import * as p from '../../lib/progress';` at its top, keeping `resourceIds` passed via a `data-` attribute JSON blob on a container element and read with `JSON.parse`. Verify with `npm run build` in Step 4.

- [ ] **Step 4: Verify build + behavior**

Run: `npm run build`
Expected: static pages generated for all 19 courses (`dist/course/intro-to-computer-programming/index.html` exists). Then `npm run dev`, open `/course/intro-to-computer-programming`: three resources grouped by topic; checking a box moves the progress bar and survives reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProgressBar.astro src/components/ResourceCard.astro src/pages/course/
git commit -m "feat: add course page with resource cards and live progress"
```

---

### Task 7: Home dashboard (term roadmap)

**Files:**
- Modify/replace: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCourseTree` (Task 5), `getCollection('resources')`, `ProgressBar`, `progress.ts`.
- Produces: the `/` dashboard — terms in order, each course as a linked card with a live progress bar keyed on that course's resource ids.

- [ ] **Step 1: Replace `index.astro`**

`src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import ProgressBar from '../components/ProgressBar.astro';
import { getCourseTree } from '../lib/nav';
import { getCollection } from 'astro:content';

const tree = await getCourseTree();
const resources = await getCollection('resources');
const idsByCourse: Record<string, string[]> = {};
for (const r of resources) {
  (idsByCourse[r.data.course] ??= []).push(r.id);
}
---
<Base title="Dashboard">
  <h1>Computer Programming — Study Hub</h1>
  <p style="color:var(--muted)">Algonquin College · ordered basic → advanced. Check things off as you go.</p>

  {tree.map((group) => (
    <section style="margin-top:28px">
      <h2 style="font-size:16px; color:var(--muted); text-transform:uppercase; letter-spacing:.05em">Level {group.term}</h2>
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; margin-top:12px">
        {group.courses.map((c) => (
          <a class="card" href={`/course/${c.data.slug}`}
             data-course-ids={JSON.stringify(idsByCourse[c.data.slug] ?? [])}
             style="display:block">
            <strong>{c.data.title}</strong>
            <div style="color:var(--muted); font-size:13px; margin:6px 0 10px">{c.data.description}</div>
            <ProgressBar percent={0} />
            <div class="course-pct" style="font-size:12px; color:var(--muted); margin-top:6px">0%</div>
          </a>
        ))}
      </div>
    </section>
  ))}

  <script>
    import('/src/lib/progress.ts').then((p) => {
      document.querySelectorAll('[data-course-ids]').forEach((el) => {
        const ids = JSON.parse(el.getAttribute('data-course-ids') || '[]');
        const pct = p.courseProgress(ids);
        const bar = el.querySelector('.progress > span');
        const lbl = el.querySelector('.course-pct');
        if (bar) bar.style.width = pct + '%';
        if (lbl) lbl.textContent = pct + '%';
      });
    });
  </script>
</Base>
```

- [ ] **Step 2: Verify build + behavior**

Run: `npm run build` then `npm run dev`. Open `/`.
Expected: four "Level" sections, courses ordered within each; every card links to its course; checking resources off on a course page and returning shows updated % on the dashboard. Apply the same client-import fallback from Task 6 Step 3 note if the production build errors on the runtime import.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add dashboard with term roadmap and per-course progress"
```

---

### Task 8: Browse / filter page

**Files:**
- Create: `src/pages/browse.astro`

**Interfaces:**
- Consumes: `getCollection('resources')`, `getCollection('courses')`, `Base.astro`.
- Produces: `/browse` — a flat list of every resource with client-side filtering by type, difficulty, and course. Pure DOM filtering (no framework).

- [ ] **Step 1: Write `browse.astro`**

`src/pages/browse.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import { getCollection } from 'astro:content';

const courses = await getCollection('courses');
const titleBySlug = new Map(courses.map((c) => [c.data.slug, c.data.title]));
const resources = (await getCollection('resources')).sort((a, b) => {
  const t = (titleBySlug.get(a.data.course) || '').localeCompare(titleBySlug.get(b.data.course) || '');
  return t !== 0 ? t : a.data.order - b.data.order;
});
const types = ['video', 'article', 'exercise', 'reference', 'note'];
const diffs = ['beginner', 'intermediate', 'advanced'];
---
<Base title="Browse">
  <h1>Browse all resources</h1>
  <div style="display:flex; gap:10px; flex-wrap:wrap; margin:16px 0">
    <input id="q" class="btn" placeholder="Search title…" style="flex:1; min-width:180px" />
    <select id="f-type" class="btn"><option value="">All types</option>{types.map((t) => <option value={t}>{t}</option>)}</select>
    <select id="f-diff" class="btn"><option value="">All levels</option>{diffs.map((d) => <option value={d}>{d}</option>)}</select>
  </div>
  <div id="list">
    {resources.map((r) => (
      <div class="card row" data-type={r.data.type} data-diff={r.data.difficulty}
           data-title={r.data.title.toLowerCase()}
           style="display:flex; gap:12px; align-items:center; margin-bottom:8px">
        <div style="flex:1">
          {r.data.url
            ? <a href={r.data.url} target="_blank" rel="noopener"><strong>{r.data.title}</strong></a>
            : <strong>{r.data.title}</strong>}
          <div style="color:var(--muted); font-size:13px">
            {titleBySlug.get(r.data.course)} · {r.data.type} · {r.data.estMinutes} min · <span class="chip">{r.data.difficulty}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
  <p id="empty" style="display:none; color:var(--muted)">No resources match those filters.</p>

  <script>
    const q = document.getElementById('q');
    const fType = document.getElementById('f-type');
    const fDiff = document.getElementById('f-diff');
    const rows = [...document.querySelectorAll('.row')];
    const empty = document.getElementById('empty');
    function apply() {
      const term = q.value.toLowerCase();
      let shown = 0;
      rows.forEach((el) => {
        const ok =
          (!term || el.dataset.title.includes(term)) &&
          (!fType.value || el.dataset.type === fType.value) &&
          (!fDiff.value || el.dataset.diff === fDiff.value);
        el.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      empty.style.display = shown === 0 ? '' : 'none';
    }
    [q, fType, fDiff].forEach((el) => el.addEventListener('input', apply));
  </script>
</Base>
```

- [ ] **Step 2: Verify build + behavior**

Run: `npm run build` then `npm run dev`. Open `/browse`.
Expected: all seeded resources listed; typing in search narrows live; type/level dropdowns filter; clearing shows all; "No resources match" appears only when nothing matches.

- [ ] **Step 3: Commit**

```bash
git add src/pages/browse.astro
git commit -m "feat: add browse page with client-side filtering"
```

---

### Task 9: Export/import progress + final verification

**Files:**
- Modify: `src/layouts/Base.astro` (add Export/Import controls to the top bar)

**Interfaces:**
- Consumes: `progress.ts` (`exportProgress`, `importProgress`).
- Produces: a "Backup" control that downloads progress JSON and a "Restore" control (hidden file input) that re-applies it.

- [ ] **Step 1: Add controls to `Base.astro`**

In the `.topbar`, before the theme toggle button, add:
```astro
<button class="btn" id="export-progress">⬇ Backup</button>
<button class="btn" id="import-progress">⬆ Restore</button>
<input type="file" id="import-file" accept="application/json" hidden />
```
Add to the bottom `<script>` in `Base.astro`:
```js
import('/src/lib/progress.ts').then((p) => {
  document.getElementById('export-progress')?.addEventListener('click', () => {
    const blob = new Blob([p.exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'studyhub-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const file = document.getElementById('import-file');
  document.getElementById('import-progress')?.addEventListener('click', () => file.click());
  file?.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    p.importProgress(await f.text());
    location.reload();
  });
});
```

- [ ] **Step 2: Full-project verification**

Run:
```bash
npm test
npm run check
npm run build
```
Expected: all Vitest tests pass; `astro check` reports no type errors; build succeeds and emits `dist/` with `index.html`, `browse/index.html`, and a `course/<slug>/index.html` for all 19 courses. Then `npm run dev` and confirm end-to-end: check items on a course → dashboard % updates → Backup downloads JSON → toggle items off → Restore re-applies them.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: add progress backup/restore"
```

---

## Self-Review Notes (author's check against the spec)

- **Spec §3 hierarchy** → Tasks 2 (schema), 3 (content), 6 (course page groups by topic). ✅
- **Spec §4 storage/schema guardrails** → Task 2 Zod schema + build validation. ✅
- **Spec §5 pages:** Dashboard (Task 7), Course (Task 6), Browse (Task 8), Resource/note view → notes render inline on the course card as `note` type (no separate route needed; matches spec's "this page mainly serves notes" and YAGNI). If a standalone note route is later wanted, it's additive. ✅ (documented deviation)
- **Spec §6 progress + export/import** → Task 4 (module + tests), Tasks 6/7 (UI wiring), Task 9 (backup/restore). ✅
- **Spec §2 dark mode** → Task 5 theme toggle. ✅
- **Ordering basic→advanced** → `term`/`order` sorting in Tasks 5–8. ✅
- **Client import fallback** documented in Task 6 and referenced by Tasks 7/9 to avoid a repeated failure mode in the production build.
- **Deferred to later phases (not in this plan):** 30-day calendar (Phase 2), quizzes/cue cards (Phase 3), cross-device sync. Matches spec §7.
