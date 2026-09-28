import { z } from 'zod';

import { LOCK_MODES, TIERS } from './constants.js';

/** A named technique pattern, deep-linkable as `id="tech-<slug>"`. */
export const TechniqueSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug'),
  name: z.string().min(1),
  summary: z.string().min(1),
  /** Optional longer body, raw markdown. */
  body: z.string().min(1).optional(),
});
export type Technique = z.infer<typeof TechniqueSchema>;

/**
 * A worked example, separable from the concept prose so the UI can collapse it.
 * Raw LaTeX blocks, never embedded as raw paragraphs in the concept body.
 */
export const WorkedExampleSchema = z.object({
  title: z.string().min(1),
  /** `$$…$$` separated display blocks forming the full derivation. */
  latex: z.string().min(1),
  /** Optional follow-on question, raw LaTeX. */
  followUpLatex: z.string().min(1).optional(),
});
export type WorkedExample = z.infer<typeof WorkedExampleSchema>;

/**
 * A specific failure mode. The **wrong** answer is carried explicitly and
 * rendered struck through; content must not merely describe it in prose.
 */
export const PitfallSchema = z.object({
  title: z.string().min(1),
  /** The wrong answer, rendered struck through in red. Required. */
  wrongLatex: z.string().min(1),
  /** Why the wrong answer fails. */
  why: z.string().min(1),
  /** The fix. */
  fix: z.string().min(1),
});
export type Pitfall = z.infer<typeof PitfallSchema>;

/**
 * The 8 fixed lesson sections, always present, always in this order.
 * Practice / solutions / mastery are **id lists**, never embedded exercise
 * copies, so the same exercise can appear in more than one place.
 */
export const LessonSectionsSchema = z
  .object({
    /** 1. One sentence, stated as a capability. */
    objective: z.string().min(1),
    /** 2. Explicit links to prior lessons. */
    prerequisites: z.array(z.string().min(3)),
    /** 3. 400–900 words, plus ≥ 3 separable worked examples. */
    concept: z.string().min(1),
    examples: z.array(WorkedExampleSchema).min(3, 'at least 3 worked KaTeX examples'),
    /** 4. Named patterns with stable slugs. */
    techniques: z.array(TechniqueSchema).min(1),
    /** 5. 2–3 specific failure modes. */
    pitfalls: z.array(PitfallSchema).min(2).max(3),
    /** 6. Practice set, 8–15 exercises. */
    practiceIds: z.array(z.string().min(3)).min(8).max(15),
    /** 7. Mirrored solution list; defaults to the practice id list. */
    solutionIds: z.array(z.string().min(3)).optional(),
    /** 8. 3 mixed-tier problems; passing marks the lesson complete. */
    masteryIds: z.array(z.string().min(3)).length(3, 'mastery check is exactly 3 problems'),
  })
  .transform((sections) => ({
    // Listed field by field rather than spread: a spread over an optional property
    // widens `solutionIds` back to `string[] | undefined` in the inferred output, and
    // every consumer would then have to re-derive the default this step already applied.
    objective: sections.objective,
    prerequisites: sections.prerequisites,
    concept: sections.concept,
    examples: sections.examples,
    techniques: sections.techniques,
    pitfalls: sections.pitfalls,
    practiceIds: sections.practiceIds,
    solutionIds: sections.solutionIds ?? sections.practiceIds,
    masteryIds: sections.masteryIds,
  }));

export type LessonSections = z.infer<typeof LessonSectionsSchema>;

export const LessonSchema = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug'),
    moduleId: z.string().regex(/^M[1-9]$/),
    title: z.string().min(1),
    /** Ordering within the module. 1-based, contiguous. */
    order: z.number().int().min(1),
    tiers: z.array(z.enum(TIERS)).min(1),
    estimatedMinutes: z.number().int().min(1).max(240),
    /** Soft by default; a hard lock on a 37-lesson tree makes the app unusable. */
    lockMode: z.enum(LOCK_MODES).default('soft'),
    sections: LessonSectionsSchema,
  })
  .superRefine((lesson, ctx) => {
    const prereqs = new Set(lesson.sections.prerequisites);
    if (prereqs.has(lesson.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sections', 'prerequisites'],
        message: 'a lesson cannot be its own prerequisite',
      });
    }
    const all = new Set([
      ...lesson.sections.practiceIds,
      ...lesson.sections.masteryIds,
    ]);
    for (const list of [lesson.sections.practiceIds, lesson.sections.masteryIds]) {
      for (const id of list) {
        if (!all.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['sections'],
            message: `unresolved exercise id ${id}`,
          });
        }
      }
    }
    const overlap = lesson.sections.masteryIds.filter((id) =>
      lesson.sections.practiceIds.includes(id),
    );
    if (overlap.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sections', 'masteryIds'],
        message: `mastery check must be distinct from the practice set: ${overlap.join(', ')}`,
      });
    }
  });

export type Lesson = z.infer<typeof LessonSchema>;
export type LessonInput = z.input<typeof LessonSchema>;

/** Section 7 mirrors the practice set unless content overrides it. */
export function solutionIds(lesson: Pick<Lesson, 'sections'>): string[] {
  return lesson.sections.solutionIds ?? lesson.sections.practiceIds;
}

/** Total exercises a learner meets in the lesson body (practice + mastery). */
export function lessonExerciseIds(lesson: Pick<Lesson, 'sections'>): string[] {
  return [...new Set([...lesson.sections.practiceIds, ...lesson.sections.masteryIds])];
}
