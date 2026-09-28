# math-training-app

Math training for AMC-10 / AMC-12 / AIME. Lessons, a large exercise bank, and full LaTeX (KaTeX) with Asymptote figures. Target: working before the AIME in February.

pnpm workspace monorepo, TypeScript strict, Node 20.

## Layout

```
math-training-app/
  apps/
    web/            React + Vite frontend — lesson viewer, exercise player, KaTeX/Asymptote
    api/            Node + Express backend — lessons, exercises, grading, progress
  packages/
    content/        The frozen content contract: Zod schemas, constants, filesystem loader
  content/          Lessons and exercises as markdown + YAML frontmatter
  deploy/           nginx vhosts and the combined-image entrypoint
  docs/
    CONTENT_CONTRACT.md   Frozen contract — read this before writing content
```

`packages/content` is the shared dependency. `apps/web` imports the browser-safe entry (`@mta/content`); `apps/api` also imports `@mta/content/node` for the filesystem loader.

## Requirements

- Node 20.11+ (`.nvmrc` pins it; CI runs 20 and 22)
- pnpm 10.33.2 — `corepack enable` and the `packageManager` field pin it for you

## Setup

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Run locally

```bash
pnpm dev          # api on :3001, web on :5173
```

The web app calls the API through the `VITE_API_BASE` env var. It is empty by default, so in development requests go through the Vite dev proxy to `http://localhost:3001`; in a deployed build set it to the API origin, or leave it empty when nginx serves both on one origin.

```bash
CONTENT_DIR=./content pnpm --filter @mta/api dev            # explicit content root
VITE_API_PROXY=http://localhost:3001 pnpm --filter @mta/web dev
VITE_API_BASE=https://api.example.com pnpm --filter @mta/web build
```

## Verify

Run everything CI runs, in order:

```bash
pnpm typecheck     # tsc --noEmit across the workspace
pnpm lint          # eslint, type-aware
pnpm content:lint  # content frontmatter against the frozen contract
pnpm -r test       # vitest
pnpm build         # tsc build + vite build
```

`pnpm content:lint` is not optional polish: content is data, and malformed frontmatter breaks the lesson viewer at runtime, so it fails the build exactly like broken code does.

## Test

```bash
pnpm -r test              # all packages
pnpm --filter @mta/web test -- --reporter=verbose
pnpm test:coverage
```

## Content

Lessons and exercises live in `content/` as markdown with YAML frontmatter. The file layout, the exercise metadata schema, the eight lesson sections, and the change policy are all in **[docs/CONTENT_CONTRACT.md](docs/CONTENT_CONTRACT.md)** — that contract is frozen, and it is what the backend and frontend are built against.

Authoring rule: structured data in frontmatter, long-form prose in the body. For a lesson the body *is* the `concept` section; everything else is frontmatter. For an exercise the frontmatter is the whole record and the body is ignored at runtime.

Minimal exercise:

```markdown
---
id: m1-quadratics-03
moduleId: M1
lessonId: m1-quadratics
tier: '12'
difficulty: 3
promptLatex: 'Solve for $x$: $2x^2 - 5x + 1 = 0$.'
choices: null
answerLatex: '\frac{5+\sqrt{17}}{4},\frac{5-\sqrt{17}}{4}'
solutionLatex: |-
  $$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a} = \frac{5 \pm \sqrt{17}}{4}$$
hintLatex:
  - 'Write down $a$, $b$, $c$ before you touch the formula.'
  - '$\Delta = 25 - 8 = 17$, and the denominator is $2a = 4$.'
asymptoteSource: null
tags: [algebra, polynomial]
---
```

`choices` is `null` for free response (AIME) and exactly 5 bare LaTeX fragments for AMC multiple choice. The UI supplies the `A`–`E` labels; content must not write them.

## Docker

Three targets:

```bash
docker build --target api -t math-training-api .   # API only, port 3001
docker build --target web -t math-training-web .   # static build via nginx, port 80
docker build --target all -t math-training-app .   # both, API proxied at /api
```

The build stage runs typecheck, lint, tests, and build, so a broken image is a failed build rather than a bad deploy.

```bash
docker run --rm -p 3001:3001 math-training-api
curl localhost:3001/health
```

Health is served at `/health`; the content routes (`/api/modules`, `/api/lessons`, `/api/exercises`, `/api/practice`, `/api/progress`, `/api/grade`) live under `/api`.

## Deploy

`main` is the default branch; `staging` is the preview branch. CI runs on pushes and pull requests to both, plus the `docker` job on `main` that builds the API image and smoke-tests `/api/health`.

The `all` target is the deployable unit: nginx serves the built web app and proxies `/api` to the Node process on the same origin, so the browser never makes a cross-origin request and the app needs no runtime API base URL.

## Contributing

1. Branch off `main`.
2. Make the change; keep it green (`pnpm typecheck && pnpm lint && pnpm content:lint && pnpm -r test && pnpm build`).
3. Open a PR. CI must be green — a red CI is a failure, not a warning.

Content changes go through the contract. Adding an optional field is fine; renaming or removing one is a breaking change to the frozen contract and needs a version bump, a migration of all committed content, and sign-off from the product owner.
