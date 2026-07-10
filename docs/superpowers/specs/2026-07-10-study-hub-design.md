# Study Hub — Design Spec

**Date:** 2026-07-10
**Author:** Ada + Claude (brainstorming session)
**Status:** Approved design, pre-implementation

## 1. Purpose & Context

A personal study website to prepare for the **Computer Programming Diploma at Algonquin
College**, starting Fall 2026 (~2 months out at time of writing). It organizes the
program's curriculum into a clean, visual, easy-to-browse resource library ordered from
basic to advanced, with lightweight progress tracking. It is a single-user personal tool.

Later phases add a 30-day study calendar and quizzes/cue cards. The design is deliberately
built so those phases reuse the Phase 1 content model without rework.

### Goals
- One visual, well-ordered place to access all study material (videos, docs, exercises, notes).
- Content ordered basic → advanced at every level.
- Easy to extend: adding a resource = adding a small file.
- Motivating: check things off, see progress.

### Non-goals (Phase 1)
- No user accounts / auth (single user).
- No backend / database.
- No cross-device sync (accepted trade-off; see Progress Tracking).
- No per-resource comments or tagging beyond type/difficulty.

## 2. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Content source | Research & reconstruct a realistic Algonquin CP curriculum, refine over time | User has none yet |
| Phasing | Content-first; calendar and quizzes are later phases | Library is the backbone both reuse |
| Hosting | Local now, static build hostable free later | User's call ("local now, host later") |
| Content authoring | Edit data files (Markdown + frontmatter) | Simple, transparent, matches user preference |
| Progress tracking in v1 | Yes — check-off + progress bars via `localStorage` | Cheap, high motivation |
| Tech stack | **Astro** + Markdown/JSON content collections; vanilla JS (or React island) for interactive bits | User has frontend experience; content-first with room to grow into interactivity |

## 3. Information Architecture (content model)

Hierarchy, ordered basic → advanced at each level via an explicit `order` field:

```
Program (Computer Programming Diploma)
└── Term / Semester            (ordered)
    └── Course                 (e.g. "Intro to Programming", "Databases")
        └── Topic / Module      (ordered units within a course)
            └── Resource        (video, doc/article, exercise, reference, note)
```

**Resource** is the atomic unit — the same unit the calendar (Phase 2) schedules and
quizzes (Phase 3) attach to. Supporting one model across all three phases avoids rework.

**Resource types:** `video`, `article` (doc), `exercise` (practice), `reference`
(docs/cheatsheets), `note` (user's own Markdown).

**Resource fields:** title, type, url (or inline Markdown for notes), optional description,
`estMinutes`, `difficulty` (`beginner` | `intermediate` | `advanced`), `order`.

## 4. Content Storage (Astro content collections)

Content is fully separated from code. Schema lives in `src/content/config.ts` and validates
every file at build time (guardrails against missing/typo'd fields).

```
src/
  content/
    courses/
      01-intro-to-programming.md      ← frontmatter = course metadata
      02-oop-fundamentals.md
    resources/
      intro-programming/              ← grouped by course (chosen over flat layout)
        01-what-is-a-variable.md
        02-loops-video.md
  content/config.ts                    ← schema/types for both collections
```

**Course frontmatter:**
```yaml
title: "Introduction to Programming"
term: 1
order: 1
description: "Fundamentals of programming logic, variables, control flow."
difficulty: beginner
```

**Resource frontmatter (Markdown body optional, used for notes):**
```yaml
course: intro-to-programming
topic: "Control Flow"
order: 2
title: "For & While Loops Explained"
type: video
url: "https://youtube.com/..."
estMinutes: 15
difficulty: beginner
```

- Topics are a field on resources (grouped in UI), not a separate folder tree — simpler.
- Numbered filename prefixes keep files human-sortable, matching on-screen order.
- Adding a resource = drop a ~6-line `.md` file in the right folder.

## 5. Pages (Phase 1)

Each page has one job.

1. **Home / Dashboard (`/`)** — terms as an ordered roadmap; each course with an at-a-glance
   progress bar; "Continue where you left off" → next unfinished resource.
2. **Course page (`/course/:slug`)** — topics in order; resources as type-iconed cards
   (title, est. time, difficulty, done checkbox); course-level progress bar at top.
3. **Resource view (`/resource/:slug`)** — renders `note`-type Markdown. External
   videos/docs link out in a new tab (no wrapper page needed), so this page mainly serves notes.
4. **Browse / filter (`/browse`)** — one flat, searchable list across the whole program;
   filter by type, difficulty, or course. For non-linear study ("drill exercises today").

**Global UI:** persistent nav listing terms/courses, a search box, light/dark toggle.
Clean, card-based, visual.

## 6. Progress Tracking

- No accounts → progress in `localStorage`.
- Stable id per resource; check-off stores `{ resourceId: done }`.
- Isolated module `progress.js` exposes `isDone(id)`, `toggle(id)`, `courseProgress(courseId)` → %.
  All progress bars + dashboard read from it.
- **Trade-off:** per-browser, no laptop↔phone sync. Accepted for zero-backend now. Later,
  swap this single module for a cloud store — nothing else changes (clean seam by design).
- **Export / Import progress** button (downloads/loads JSON) for manual backup/transfer.

## 7. Phased Roadmap

**Phase 1 — Resource Library (build now):** content model, researched Algonquin curriculum
populated, dashboard + course + browse pages, progress tracking, dark mode. Fully usable.

**Phase 2 — 30-day Study Calendar:** a dated view distributing resources across days. Uses
existing `estMinutes` + `order` to auto-generate a plan (~90 min/day) and/or drag resources
onto days. A new view over the same content — no new data model.

**Phase 3 — Quizzes & cue cards:** flashcard/quiz decks attached to courses/topics. A `quiz`
content collection (question, answer, options), a flip-card component, and a "quiz me on this
section" button that appears once a topic's resources are checked off.

Phases are independent and additive. Phase 1 is finished and in use before Phase 2 starts.

## 8. Module / Interface Boundaries

- **Content collections** — the data; schema-validated. Consumers read via Astro's typed API.
- **`progress.js`** — the only stateful module; clean seam for future cloud sync.
- **Page components** — presentational; read content + progress, render. No business logic.
- **Interactive islands (later)** — quiz card, calendar; hydrated only where needed.

This isolation means content edits never touch UI, and the sync/calendar/quiz additions each
land behind a well-defined interface.
