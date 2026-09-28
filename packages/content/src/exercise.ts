import { z } from 'zod';

import { TAGS, TIERS, type Tag, type Tier } from './constants.js';

/**
 * Choice labels are AMC convention: `A`–`E`, never renumbered `1`–`5`.
 * The UI supplies the label; `choices[]` entries are bare inline LaTeX
 * fragments with no `(A)` prefix and no `$…$` wrapper.
 */
export const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Multiple-choice exercises carry exactly 5 choices; free response carries `null`. */
export const MC_CHOICE_COUNT = 5;

const bareLatex = z
  .string()
  .min(1, 'must not be empty')
  .refine((s) => !s.includes('$'), 'must be a bare LaTeX fragment, not $-wrapped');

/**
 * Exercise metadata contract.
 *
 * Core fields (Content Architecture §"Exercise metadata schema"):
 *   id, moduleId, lessonId, tier, difficulty, promptLatex, choices[],
 *   answerLatex, solutionLatex, hintLatex[], asymptoteSource, tags[]
 *
 * Gap fields added per IA doc §7 "Contract gaps" and lesson spec §8 — they are
 * small additions, not a redesign:
 *   asymptoteAspectRatio, asymptoteAlt, answerAlternatives, angleUnit,
 *   explanation, estimatedMinutes
 */
export const ExerciseSchema = z
  .object({
    /** Stable slug, unique across all content. e.g. `m1-linear-inequalities-03`. */
    id: z
      .string()
      .min(3)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug'),

    /** Module code, `M1`..`M9`. */
    moduleId: z.string().regex(/^M[1-9]$/),

    /** Owning lesson id. Must match a real lesson in the same module. */
    lessonId: z.string().min(3),

    tier: z.enum(TIERS),

    /** 1 (warm-up) .. 5 (AIME II / olympiad). */
    difficulty: z.number().int().min(1).max(5),

    /**
     * Raw LaTeX. Never pre-rendered to HTML by the server.
     * Must read correctly as plain text when math fails to render.
     */
    promptLatex: z.string().min(1),

    /** Exactly 5 bare inline LaTeX fragments, or `null` for free response. */
    choices: z
      .array(bareLatex)
      .length(MC_CHOICE_COUNT, 'multiple choice requires exactly 5 choices')
      .nullable(),

    /**
     * One canonical inline fragment. No `$`, no `\!`, no leading `+`, no
     * trailing period, no `\boxed`.
     */
    answerLatex: z
      .string()
      .min(1)
      .refine((s) => !s.includes('$'), 'must be a bare LaTeX fragment')
      .refine((s) => !s.startsWith('+'), 'must not carry a leading +')
      .refine((s) => !s.trimEnd().endsWith('.'), 'must not carry a trailing period')
      .refine((s) => !s.includes('\\boxed'), 'must not wrap the answer in \\boxed'),

    /**
     * Accepted equivalent free-response forms. Grading with one canonical
     * string produces false negatives on AIME answers.
     */
    answerAlternatives: z.array(z.string().min(1)).default([]),

    /**
     * Full derivation as a sequence of `$$…$$` display blocks. Never just an
     * answer. Multi-line derivations use `aligned` inside one block.
     */
    solutionLatex: z.string().min(1),

    /** 2–3 progressive rungs (nudge → method → setup). Empty array hides the control. */
    hintLatex: z.array(z.string().min(1)).min(2).max(3),

    /** Raw Asymptote program for geometry figures. Client compiles; never pre-rendered. */
    asymptoteSource: z.string().min(1).nullable(),

    /** One-sentence description of the figure. Required when `asymptoteSource` is present. */
    asymptoteAlt: z.string().min(1).optional(),

    /**
     * Width / height used to reserve figure space *before* compiling.
     * Defaults to 1.333 — reserving the box is what makes CLS 0 for figures.
     */
    asymptoteAspectRatio: z.number().positive().default(1.333),

    /** Degrees by default; radians only when the exercise declares `rad`. */
    angleUnit: z.enum(['deg', 'rad']).default('deg'),

    /** One-line explanation shown inline on a correct multiple-choice answer. */
    explanation: z.string().min(1).optional(),

    /** Estimated minutes, for session sizing. */
    estimatedMinutes: z.number().int().min(1).max(120).optional(),

    tags: z.array(z.enum(TAGS)).min(1),
  })
  .superRefine((ex, ctx) => {
    if (ex.asymptoteSource !== null && ex.asymptoteAlt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['asymptoteAlt'],
        message: 'required whenever asymptoteSource is present',
      });
    }
    if (ex.choices !== null && ex.tier === 'A') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'AIME exercises are free-response; choices must be null',
      });
    }
  });

export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseInput = z.input<typeof ExerciseSchema>;

/** True when the exercise is multiple choice. */
export function isMultipleChoice(exercise: Pick<Exercise, 'choices'>): boolean {
  return exercise.choices !== null;
}

/** `A`–`E` label for a multiple-choice index. */
export function choiceLabel(index: number): (typeof CHOICE_LABELS)[number] {
  const label = CHOICE_LABELS[index];
  if (label === undefined) {
    throw new RangeError(`choice index ${index} out of range 0..${MC_CHOICE_COUNT - 1}`);
  }
  return label;
}

/** Every accepted free-response form, canonical answer first. */
export function acceptedForms(exercise: Pick<Exercise, 'answerLatex' | 'answerAlternatives'>): string[] {
  return [exercise.answerLatex, ...exercise.answerAlternatives];
}

/**
 * Narrowing helper so callers do not re-implement the tier literal check.
 * Accepts the nullable values a query string or route param can actually hold.
 */
export function isTier(value: string | null | undefined): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

/** Narrowing helper for the controlled tag vocabulary. */
export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}
