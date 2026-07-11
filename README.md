# Study Hub

A personal study website for the **Computer Programming Ontario College Diploma** at
Algonquin College. It turns the program's curriculum into a clean, visual, ordered
(basic → advanced) library of study resources — videos, articles, exercises, and reference
docs — with progress you can check off as you go.

Built content-first: every course and resource is a small Markdown file, so the whole study
plan is data you can read, edit, and grow over time.

## Features

- **Dashboard** — all four levels as an ordered roadmap, each course with a live progress bar.
- **Course pages** — resources grouped by topic, ordered, each with a type icon, estimated
  time, difficulty tag, and a check-off box.
- **Browse** — one searchable, filterable list of every resource (by text, type, or difficulty).
- **Progress tracking** — saved in your browser (`localStorage`); no account, no backend.
- **Backup / Restore** — export your progress to a JSON file and re-import it on another machine.
- **Dark mode** — with a no-flash theme toggle.

## Tech stack

- [Astro](https://astro.build/) (static site, zero JS by default)
- Content Collections + [Zod](https://zod.dev/) schema for build-time validation of every content file
- A small vanilla-JS progress module backed by `localStorage`
- [Vitest](https://vitest.dev/) for unit tests (schema + progress logic)
- Plain CSS with custom properties for theming

## Getting started

```sh
npm install
npm run dev      # local dev server at http://localhost:4321
```

| Command           | Action                                        |
| :---------------- | :-------------------------------------------- |
| `npm run dev`     | Start the local dev server                    |
| `npm run build`   | Build the static site to `./dist/`            |
| `npm run preview` | Preview the production build locally          |
| `npm run check`   | Type-check with `astro check`                 |
| `npm test`        | Run the Vitest unit tests                     |

The site builds to plain static files, so it can be hosted for free (GitHub Pages, Netlify,
etc.) whenever you want — no server required.

## Project structure

```text
src/
├── content/
│   ├── config.ts                  # content collections wired to the schema
│   ├── courses/                   # one Markdown file per course
│   │   └── <slug>.md
│   └── resources/                 # resources grouped by course
│       └── <course-slug>/
│           └── NN-<name>.md
├── layouts/Base.astro             # shared shell: nav, dark mode, backup/restore
├── components/                    # ProgressBar, ResourceCard
├── pages/                         # index (dashboard), course/[slug], browse
├── lib/
│   ├── schema.ts                  # Zod schemas + shared vocabularies
│   ├── nav.ts                     # groups courses by term
│   └── progress.ts                # localStorage progress (the only stateful module)
└── styles/global.css              # theme tokens + base styles
```

## Adding a resource

Adding study material never means touching UI code — just drop a file in the right folder.

Create `src/content/resources/<course-slug>/NN-short-name.md`:

```markdown
---
course: "intro-to-computer-programming"   # must match a course slug
topic: "Control Flow"                       # groups the card on the course page
order: 3                                     # sort order within the course
title: "For & While Loops Explained"
type: video                                  # video | article | exercise | reference | note
url: "https://example.com/..."               # omit for a `note` (writes render inline)
estMinutes: 15
difficulty: beginner                         # beginner | intermediate | advanced
---

Optional Markdown notes go here (shown for `note`-type resources).
```

Run `npm run build` and the Zod schema validates every field — a typo or missing value fails
the build with a clear message. To add a whole new course, create
`src/content/courses/<slug>.md` with `title`, `term`, `order`, `slug`, `description`, and
`difficulty`.

> **Note:** Astro reserves `slug` as a built-in field on content entries, so a course's URL
> slug comes from its filename (`<slug>.md`). Keep the filename and the `slug:` frontmatter
> value in sync.

## Content status

The curriculum (all 19 courses across Levels 1–4) is populated. **Level 1 is fully seeded
with study resources**; later levels have course entries ready to fill in the same way.
