import { Router } from 'express';
import { z } from 'zod';

const ProgressBody = z.object({
  lessonId: z.string().min(1),
  state: z.enum(['unseen', 'in-progress', 'passed']),
  mastery: z
    .object({ attempt: z.coerce.number().int().min(0), correct: z.coerce.number().int().min(0), total: z.coerce.number().int().min(0) })
    .optional(),
  updatedAt: z.coerce.date().optional(),
});

interface ProgressRecord {
  lessonId: string;
  state: 'unseen' | 'in-progress' | 'passed';
  mastery?: { attempt: number; correct: number; total: number };
  updatedAt: string;
}

/**
 * `PUT /api/progress` — idempotent, last write wins per lesson.
 *
 * v1 has no auth assumption (IA doc §7), so this is an in-memory echo endpoint
 * whose real client is the local `ProgressStore`. It exists so the contract is
 * fixed and testable; persistence is MAX-4's call.
 */
export function progressRouter(): Router {
  const router = Router();
  const records = new Map<string, ProgressRecord>();

  router.put('/', (req, res) => {
    const body = ProgressBody.parse(req.body);
    const record: ProgressRecord = {
      lessonId: body.lessonId,
      state: body.state,
      updatedAt: (body.updatedAt ?? new Date()).toISOString(),
      ...(body.mastery === undefined ? {} : { mastery: body.mastery }),
    };
    const existing = records.get(body.lessonId);
    // Last write wins, but never move a passed lesson backwards.
    if (existing?.state === 'passed' && record.state !== 'passed') {
      res.json(existing);
      return;
    }
    records.set(body.lessonId, record);
    res.json(record);
  });

  router.get('/', (_req, res) => {
    res.json([...records.values()]);
  });

  return router;
}
