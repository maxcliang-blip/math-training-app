# Frozen Content Contract — v1

**Status: FROZEN.** This is the contract `apps/api` (MAX-4) and `apps/web` (MAX-5) build against.

**Source of truth:** Alice (PM), [Content Architecture](/MAX/issues/MAX-2#document-content_architecture) and [Lesson Layout & Exercise Interaction Spec](/MAX/issues/MAX-2#document-lesson_exercise_spec). Field names, enum values, and nullability below are copied from that spec, not redesigned. Where this document and the spec disagree, the spec wins and this file is a bug.

**Executable form:** the Zod schemas in [`packages/content/src`](../packages/content/src) are the authority at runtime. If prose here and a schema diverge, the schema is correct and this document needs fixing.

**Change policy:**

- **Additive** (new optional field, new tag) — allowed, bump the minor version.
- **Breaking** (rename, remove, change type, change nullability, change an enum value) — requires a version bump, a migration of all committed content, and sign-off from Alice.

---

## 1. Content file layout

```
content/
  modules.yaml                                  # the 9 modules
  lessons/<module-slug>/<lesson-slug>.md        # YAML frontmatter + concept prose body
  exercises/<module-slug>/<lesson-slug>/<exercise-slug>.md
```

- The module directory is named for the **module** (`m1-algebra-foundations`, `m2-number-theory`, …), not for `topicSlug`. `code` and the directory are 1:1; the loader walks the tree and resolves module membership from each record's `moduleId`.
- `lesson-slug` and `exercise-slug` are lowercase kebab-case (`m1-linear-equations`, `03`).
- The exercise's `id` field is the contract; the filename is a readability convention. The loader keys records by the `id` in frontmatter.
- **Structured data in frontmatter, long-form prose in the body.** For a lesson the body *is* the `concept` section — the only 400–900 word prose field. Every other section is structured frontmatter. For an exercise the frontmatter is the whole record; the body is authoring notes and is ignored at runtime.

## 2. Module (`content/modules.yaml`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | `M1`..`M9` | yes | The module id used in `Lesson.moduleId` / `Exercise.moduleId`. |
| `title` | string | yes | |
| `topicSlug` | `Tag` | yes | Drawn from the closed tag vocabulary — filters are only buildable if this is a closed set. |
| `order` | int 1–9 | yes | Display order. |
| `summary` | string | yes | One line, used on the module card. |
| `tiers` | `("10"\|"12"\|"A"\|"A+")[]` | yes | Tiers this module covers, min 1. |
| `targetExerciseCount` | int > 0 | yes | Calibration target from the content architecture, not enforced. |

The nine modules are fixed: M1 Algebra Foundations, M2 Number Theory, M3 Counting & Combinatorics, M4 Sequences & Series, M5 Geometry, M6 Coordinate & Analytic Geometry, M7 Probability, M8 Trigonometry, M9 Precalculus & Proof Technique.

## 3. Exercise

Every field is required unless marked optional/defaulted. This is the record `ExerciseSchema` validates.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | kebab-case slug | yes | Unique across all content, e.g. `m1-linear-equations-03`. |
| `moduleId` | `M1`..`M9` | yes | |
| `lessonId` | slug | yes | Must be a real lesson in the same module. |
| `tier` | `10` \| `12` \| `A` \| `A+` | yes | Literal strings. No `AIME1`/`AIME2` variants. |
| `difficulty` | int 1–5 | yes | 1 warm-up, 5 AIME II / olympiad. |
| `promptLatex` | string | yes | Raw LaTeX. Must read correctly as plain text if math fails to render. |
| `choices` | `string[]` \| `null` | yes | Exactly 5 bare inline fragments, or `null` for free response. |
| `answerLatex` | string | yes | One canonical form. No `$`, no leading `+`, no trailing `.`, no `\boxed`. |
| `solutionLatex` | string | yes | Full derivation as `$$…$$` blocks. **Never just an answer.** |
| `hintLatex` | `string[]` | yes | 2–3 progressive rungs. `[]` hides the hint control. |
| `asymptoteSource` | string \| `null` | yes | Raw Asymptote program. Never pre-rendered. |
| `tags` | `Tag[]` | yes | Controlled vocabulary, min 1. |
| `answerAlternatives` | `string[]` | no (`[]`) | Extra accepted free-response forms. |
| `asymptoteAlt` | string | no | **Required whenever `asymptoteSource` is non-null.** |
| `asymptoteAspectRatio` | number > 0 | no (`1.333`) | width/height used to reserve figure space *before* compiling. |
| `angleUnit` | `deg` \| `rad` | no (`deg`) | Degrees by default; radians only when declared. |
| `explanation` | string | no | One line, shown inline on a correct MC answer. |
| `estimatedMinutes` | int 1–120 | no | For session sizing. |

Cross-field rules enforced by the schema and by `pnpm content:lint`:

1. `choices` is `null` **or** exactly 5 entries. A `choices` array shorter than 5 is a content bug, not something the UI papers over.
2. Tier `A` (AIME) is free response: `choices` must be `null`.
3. `asymptoteSource !== null` requires `asymptoteAlt`.
4. `hintLatex` rungs escalate: direction only (nudge) → method/theorem → concrete setup. **A hint that gives the answer must not be rung 1.** The UI reveals one rung per click and nothing after rung 3 except "Show solution".
5. Choices are bare inline LaTeX with no `(A)` prefix and no `$…$` wrapper. The UI supplies the `A`–`E` labels.
6. A figure never carries information absent from the prose and `asymptoteAlt`. If the Asymptote build is unavailable the lesson is still fully usable.

## 4. Lesson

Eight sections, **fixed order, non-negotiable**, rendered with these exact anchor ids:

```
objective → prerequisites → concept → techniques → pitfalls → practice → solutions → mastery
```

Lesson-level fields: `id` (kebab-case slug), `moduleId` (`M1`..`M9`), `title`, `order` (1-based, contiguous within the module), `tiers[]`, `estimatedMinutes` (1–240), `lockMode` (`soft` | `hard`, default `soft` — a hard lock on a 37-lesson tree makes the app unusable), and `sections`.

`sections` carries the eight fixed entries, in this order:

| Section | Field | Shape | Notes |
|---|---|---|---|
| 1 | `objective` | string | One sentence, stated as a capability. |
| 2 | `prerequisites` | lesson id list | Dependency edges drive unlock logic. A lesson cannot be its own prerequisite. |
| 3 | `concept` | **markdown body** | 400–900 words. Sourced from the file body, not frontmatter. |
| 3 | `examples` | `{title, latex, followUpLatex?}[]` | **≥ 3**, required. Separable from the concept prose, not inline paragraphs — otherwise they cannot collapse. |
| 4 | `techniques` | `{slug, name, summary, body?}[]` | min 1. `slug` is stable: it becomes `id="tech-<slug>"` and hint deep links. Broken deep links are a content-lint failure. |
| 5 | `pitfalls` | `{title, wrongLatex, why, fix}[]` | **2–3**. `wrongLatex` is the **wrong** answer explicitly, because the UI renders it struck through. Prose description alone is not acceptable. |
| 6 | `practiceIds` | exercise id list | **8–15** exercises. |
| 7 | `solutionIds` | exercise id list | Optional; defaults to `practiceIds`. Still an id list, not embedded copies. |
| 8 | `masteryIds` | exercise id list | **Exactly 3** mixed-tier problems. Pass threshold 2/3. |

Sections 6/7/8 are **three id lists, not embedded exercise copies**, so the same exercise can appear in more than one place without duplication. Cross-file rules enforced by the schema and `pnpm content:lint`: every referenced id resolves to a real exercise in the same module, and `masteryIds` must be **disjoint** from `practiceIds` — a mastery check that reuses a practice problem is not a check.

## 5. Tiers and tags

`TIERS = ["10", "12", "A", "A+"]` — `10` AMC-10, `12` AMC-12, `A` AIME, `A+` AIME II / early Olympiad. Literal strings in URLs, the API, and the UI. `A+` is URL-encoded as `A%2B` by the router and normalized to `A+` by the app.

`TAGS` is a closed vocabulary — free-text tags are not buildable as filters:

```
algebra            number-theory      counting           sequences
geometry           analytic-geometry  probability        trigonometry
precalculus        proof-technique    inequalities       modular-arithmetic
inclusion-exclusion recurrences       polynomial         functional-equations
complex-numbers    vectors            logarithms         series
```

## 6. Rendering rules the contract implies

These come from Alice's [Rendering Conventions](/MAX/issues/MAX-2#document-rendering_conventions) and constrain what content may contain.

- **Raw LaTeX in, raw LaTeX stored.** The server never pre-renders math to HTML and never stores rendered HTML as the source of truth. Rendering is a client concern; grading uses the same strings.
- **Math is never a blank box.** A render failure degrades to a readable, actionable message with the LaTeX source visible and copyable. It never throws away the surrounding lesson.
- **Zero layout shift.** Every reserved area is reserved *before* content arrives, sized from `asymptoteAspectRatio` or an aspect-ratio rule. CLS from math and figures is 0.
- **Never pre-render Asymptote.** The frontend compiles `asymptoteSource`; the server stores the program text.

## 7. Entry points

| Import | Use by | Contents |
|---|---|---|
| `@mta/content` | `apps/web`, `apps/api` | Schemas, constants, pure helpers. **Browser-safe** — no `node:` imports. |
| `@mta/content/node` | `apps/api` only | Adds the filesystem loader (`loadContent`, `resolveContentRoot`). |

`apps/web` must never import `/node`; the browser build breaks on the Node built-ins.

## 8. Verifying a content change

```bash
pnpm content:lint     # frontmatter against ExerciseSchema / LessonSchema + cross-field rules
pnpm --filter @mta/content test
```

Both run in CI. Content is data, so a malformed frontmatter fails the build exactly like broken code does.
