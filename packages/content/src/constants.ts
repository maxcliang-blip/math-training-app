/**
 * FROZEN CONTENT CONTRACT — v1
 *
 * Source of truth: Alice (PM), "Content Architecture — AMC-10/12/AIME Training App"
 * and "Lesson Layout & Exercise Interaction Spec" (MAX-2 documents
 * `content_architecture` and `lesson_exercise_spec`).
 *
 * This file is the contract that apps/api (MAX-4) and apps/web (MAX-5) build
 * against. Field names, enums, and nullability are copied from the spec, not
 * redesigned. Additive changes require a contract version bump in
 * docs/CONTENT_CONTRACT.md; removing or renaming a field is breaking.
 */

/**
 * Difficulty tier. Literal strings everywhere (URLs, API, UI) — no enum
 * remapping, no `AIME1` / `AIME2` variants. `A+` is URL-encoded as `A%2B` by
 * the router and normalized to `A+` by the app.
 *
 * 10 = AMC-10, 12 = AMC-12, A = AIME, A+ = AIME II / early Olympiad.
 */
export const TIERS = ['10', '12', 'A', 'A+'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  '10': 'AMC-10',
  '12': 'AMC-12',
  A: 'AIME',
  'A+': 'AIME II / Olympiad',
};

/** Controlled tag vocabulary. Free-text tags are not buildable as filters. */
export const TAGS = [
  'algebra',
  'number-theory',
  'counting',
  'sequences',
  'geometry',
  'analytic-geometry',
  'probability',
  'trigonometry',
  'precalculus',
  'proof-technique',
  'inequalities',
  'modular-arithmetic',
  'inclusion-exclusion',
  'recurrences',
  'polynomial',
  'functional-equations',
  'complex-numbers',
  'vectors',
  'logarithms',
  'series',
] as const;
export type Tag = (typeof TAGS)[number];

/** Lock behaviour for a lesson. Soft locks are the default (IA doc §7 gap 6). */
export const LOCK_MODES = ['soft', 'hard'] as const;
export type LockMode = (typeof LOCK_MODES)[number];

/**
 * The 8 fixed lesson section ids, in their fixed, non-negotiable order.
 * Rendered with these exact anchor ids.
 */
export const LESSON_SECTION_IDS = [
  'objective',
  'prerequisites',
  'concept',
  'techniques',
  'pitfalls',
  'practice',
  'solutions',
  'mastery',
] as const;
export type LessonSectionId = (typeof LESSON_SECTION_IDS)[number];

/** Default figure aspect ratio used to reserve box space before compiling. */
export const DEFAULT_ASPECTOTE_ASPECT_RATIO = 1.333;
