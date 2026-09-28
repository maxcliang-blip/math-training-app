import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../middleware.js';
import { normalizeAnswer, gradeResponse } from '../grade/engine.js';
import type { ContentStore } from '../store.js';

const GradeBody = z.object({
  response: z.string().min(1),
  exerciseId: z.string().min(1),
});

/**
 * `POST /api/grade` — the **fallback** grading path for when the client cannot
 * compare confidently (lesson spec §3.3). v1 grades client-side; this exists so
 * disagreement is resolved in favour of correct, with a "graded by server" note.
 */
export function gradeRouter(store: ContentStore): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const body = GradeBody.parse(req.body);
    const exercise = store.exerciseById(body.exerciseId);
    if (exercise === undefined) {
      throw new HttpError(404, `no exercise ${body.exerciseId}`, 'exercise_not_found');
    }
    const outcome = gradeResponse(body.response, exercise);
    res.json({
      correct: outcome.correct,
      normalized: normalizeAnswer(body.response, exercise.angleUnit),
      comparedBy: outcome.stringCompare ? 'string' : 'numeric',
      ...(outcome.correct ? { expectedForm: outcome.expectedForm } : {}),
    });
  });

  return router;
}
