import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../middleware.js';
import type { ContentStore } from '../store.js';

/** Practical batch size for one call (IA doc §7). */
export const MAX_BATCH_IDS = 60;

const ListQuery = z.object({
  ids: z
    .string()
    .optional()
    .transform((v) =>
      v === undefined ? undefined : v.split(',').map((s) => s.trim()).filter(Boolean),
    ),
  lessonId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_BATCH_IDS).default(MAX_BATCH_IDS),
});

/**
 * `GET /api/exercises?ids=a,b,c` or `&lessonId=`.
 *
 * Raw LaTeX fields, never pre-rendered HTML. One batched call; the 60-id cap is
 * a real client constraint, not a theoretical one.
 */
export function exerciseRouter(store: ContentStore): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { ids, lessonId, limit } = ListQuery.parse(req.query);
    if (ids !== undefined) {
      if (ids.length > MAX_BATCH_IDS) {
        throw new HttpError(
          400,
          `at most ${MAX_BATCH_IDS} ids per request, got ${ids.length}`,
          'too_many_ids',
        );
      }
      res.json(store.exercisesByIds(ids));
      return;
    }
    if (lessonId !== undefined) {
      res.json(store.exercisesByLessonId(lessonId).slice(0, limit));
      return;
    }
    res.json(store.index.exercises.slice(0, limit));
  });

  /** Used by permalinks (`/practice/:sessionId/e/:exerciseId`). */
  router.get('/:exerciseId', (req, res) => {
    const exercise = store.exerciseById(req.params.exerciseId);
    if (exercise === undefined) {
      throw new HttpError(404, `no exercise ${req.params.exerciseId}`, 'exercise_not_found');
    }
    res.json(exercise);
  });

  return router;
}
