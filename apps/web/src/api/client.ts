import { z } from 'zod';

import {
  ExerciseSchema,
  LessonSchema,
  ModuleDetailSchema,
  ModuleSummarySchema,
  type Exercise,
  type Lesson,
  type ModuleDetail,
  type ModuleSummary,
  type Tier,
} from '@mta/content';

/**
 * Typed client for the API surface the UI requires (IA doc §7).
 *
 * Every payload is validated with the **same** zod schema the server validates
 * with, so contract drift fails at the network boundary rather than rendering
 * `undefined` into a learner's face.
 *
 * `VITE_API_BASE` is empty in dev so requests go through the Vite proxy; in a
 * deployed build it is set to the API origin.
 */
const BASE = (import.meta.env['VITE_API_BASE'] as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * The input type is pinned to `unknown` so `T` binds to the schema's **output**
 * type. Plain `z.ZodType<T>` binds the input to the same `T` as well; for a schema
 * with defaults that is the wider input shape, and TypeScript then widens `T` to
 * it and the caller is handed optional fields `.parse()` has already filled in.
 */
async function get<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const failed: unknown = await res.json().catch(() => ({}));
    const body = (failed ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? 'request_failed', body.message ?? res.statusText);
  }
  const payload: unknown = await res.json();
  return schema.parse(payload);
}

export const api = {
  health: () => get('/health', z.object({ status: z.string() })),

  /** Cheap; the caller caches it in memory for the session. */
  modules: (tiers?: Tier[]) => {
    const query = tiers === undefined || tiers.length === 0 ? '' : `?tier=${tiers.join(',')}`;
    return get(`/api/modules${query}`, z.array(ModuleSummarySchema));
  },

  module: (moduleId: string) => get(`/api/modules/${moduleId}`, ModuleDetailSchema),

  lesson: (lessonId: string) => get(`/api/lessons/${lessonId}`, LessonSchema),

  /** One batched call; ≤ 60 ids practical. */
  exercises: async (ids: string[]): Promise<Exercise[]> => {
    if (ids.length === 0) return [];
    return get(`/api/exercises?ids=${ids.join(',')}`, z.array(ExerciseSchema));
  },
};

export type { Exercise, Lesson, ModuleDetail, ModuleSummary, Tier };
