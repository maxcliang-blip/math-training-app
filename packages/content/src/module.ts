import { z } from 'zod';

import { LOCK_MODES, TAGS, TIERS } from './constants.js';

/**
 * One of the 9 content modules. `code` is `M1`..`M9` and is the value that
 * appears in `Exercise.moduleId` / `Lesson.moduleId`.
 */
export const ModuleSchema = z.object({
  /** `M1`..`M9`. */
  code: z.string().regex(/^M[1-9]$/),
  title: z.string().min(1),
  /** Stable slug; filters are only buildable if this is closed-set. */
  topicSlug: z.enum(TAGS),
  /** 1-based ordering. */
  order: z.number().int().min(1).max(9),
  /** One-line description used on the module card. */
  summary: z.string().min(1),
  /** Tiers the module covers. */
  tiers: z.array(z.enum(TIERS)).min(1),
  /** Target exercise count per the content architecture (calibration, not enforcement). */
  targetExerciseCount: z.number().int().positive(),
});

export type Module = z.infer<typeof ModuleSchema>;
export type ModuleInput = z.input<typeof ModuleSchema>;

/**
 * Module list entry as served by `GET /api/modules`:
 * `{id, code, title, topicCount, exerciseCount, tiers[], order}`.
 *
 * The API derives the counts; the client validates against this same schema, so
 * a contract drift fails at the boundary instead of rendering `undefined`.
 */
export const ModuleSummarySchema = ModuleSchema.extend({
  id: z.string().min(1),
  topicCount: z.number().int().min(0),
  lessonCount: z.number().int().min(0),
  exerciseCount: z.number().int().min(0),
});

export type ModuleSummary = z.infer<typeof ModuleSummarySchema>;

/** Lesson list entry as served inside `GET /api/modules/:moduleId`. */
export const LessonSummarySchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  title: z.string().min(1),
  exerciseCount: z.number().int().min(0),
  tiers: z.array(z.enum(TIERS)),
  estimatedMinutes: z.number().int().min(1),
  lockMode: z.enum(LOCK_MODES),
  prerequisites: z.array(z.string()),
});

export type LessonSummary = z.infer<typeof LessonSummarySchema>;

/** The full `GET /api/modules/:moduleId` payload — one call, no N+1. */
export const ModuleDetailSchema = z.object({
  module: ModuleSummarySchema,
  lessons: z.array(LessonSummarySchema),
  prerequisitesFlat: z.array(z.object({ id: z.string(), title: z.string() })),
});

export type ModuleDetail = z.infer<typeof ModuleDetailSchema>;
