import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { TIERS, type Exercise, type Tier } from '@mta/content';

import { HttpError } from '../middleware.js';
import type { ContentStore } from '../store.js';
import { gradeResponse } from '../grade/engine.js';

type SessionFilters = {
  moduleIds?: string[];
  lessonIds?: string[];
  tiers?: Tier[];
  difficulties?: number[];
  tags?: string[];
  limit?: number;
};

const CreateSession = z.object({
  filters: z
    .object({
      moduleIds: z.array(z.string().regex(/^M[1-9]$/)).optional(),
      lessonIds: z.array(z.string()).optional(),
      tiers: z.array(z.enum(TIERS)).optional(),
      difficulties: z.array(z.coerce.number().int().min(1).max(5)).optional(),
      tags: z.array(z.string()).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .default({}),
});

const SubmitAnswer = z.object({
  exerciseId: z.string().min(1),
  /** Choice label `A`–`E` for multiple choice, raw LaTeX for free response. */
  response: z.string().min(1),
  mode: z.enum(['inline', 'session']).default('session'),
  attemptIndex: z.coerce.number().int().min(0).default(0),
  hintsUsed: z.coerce.number().int().min(0).max(3).default(0),
  elapsedMs: z.coerce.number().int().min(0).default(0),
  workNote: z.string().max(20_000).optional(),
});

interface Attempt {
  exerciseId: string;
  response: string;
  correct: boolean;
  hintsUsed: number;
  elapsedMs: number;
  workNote?: string;
  attemptIndex: number;
  at: string;
}

export interface Session {
  id: string;
  itemIds: string[];
  createdAt: string;
  attempts: Attempt[];
  completed: boolean;
}

const MAX_ATTEMPTS = 3;

/**
 * In-memory session store. v1 has no auth, so progress lives client-side and a
 * session is only as durable as the process; MAX-4 replaces this with real
 * storage without changing the route shapes.
 */
export function createSessionStore() {
  const sessions = new Map<string, Session>();
  return {
    create(itemIds: string[]): Session {
      const session: Session = {
        id: randomUUID(),
        itemIds,
        createdAt: new Date().toISOString(),
        attempts: [],
        completed: false,
      };
      sessions.set(session.id, session);
      return session;
    },
    get(id: string): Session | undefined {
      return sessions.get(id);
    },
    require(id: string): Session {
      const session = sessions.get(id);
      if (session === undefined) {
        throw new HttpError(404, `no session ${id}`, 'session_not_found');
      }
      return session;
    },
  };
}

function matches(exercise: Exercise, filters: SessionFilters): boolean {
  if (filters.moduleIds !== undefined && !filters.moduleIds.includes(exercise.moduleId)) return false;
  if (filters.lessonIds !== undefined && !filters.lessonIds.includes(exercise.lessonId)) return false;
  if (filters.tiers !== undefined && !filters.tiers.includes(exercise.tier)) return false;
  if (filters.difficulties !== undefined && !filters.difficulties.includes(exercise.difficulty)) {
    return false;
  }
  if (filters.tags !== undefined && !filters.tags.some((t) => (exercise.tags as string[]).includes(t))) {
    return false;
  }
  return true;
}

export function practiceRouter(store: ContentStore): Router {
  const router = Router();
  const sessions = createSessionStore();

  /** Server-ordered for stable resume. */
  router.post('/sessions', (req, res) => {
    const { filters } = CreateSession.parse(req.body ?? {});
    const items = store.index.exercises.filter((e) => matches(e, filters));
    const limited = filters.limit === undefined ? items : items.slice(0, filters.limit);
    const session = sessions.create(limited.map((e) => e.id));
    res.status(201).json({
      sessionId: session.id,
      itemIds: session.itemIds,
      meta: {
        count: session.itemIds.length,
        estimatedMinutes: limited.reduce((sum, e) => sum + (e.estimatedMinutes ?? 3), 0),
        filters,
      },
    });
  });

  router.get('/sessions/:id', (req, res) => {
    const session = sessions.require(req.params.id);
    res.json({
      sessionId: session.id,
      itemIds: session.itemIds,
      createdAt: session.createdAt,
      completed: session.completed,
      attempts: session.attempts,
    });
  });

  /**
   * Returns correctness only. Never `answerLatex` or `solutionLatex` on a
   * wrong attempt — a client that receives the answer has a cheating surface,
   * and the server is the enforcement point (lesson spec §3.3).
   */
  router.post('/sessions/:id/answers', (req, res) => {
    const session = sessions.require(req.params.id);
    const body = SubmitAnswer.parse(req.body);
    if (!session.itemIds.includes(body.exerciseId)) {
      throw new HttpError(400, 'exercise is not in this session', 'exercise_not_in_session');
    }
    const exercise = store.exerciseById(body.exerciseId);
    if (exercise === undefined) {
      throw new HttpError(404, `no exercise ${body.exerciseId}`, 'exercise_not_found');
    }
    const previous = session.attempts.filter((a) => a.exerciseId === body.exerciseId);
    if (previous.length >= MAX_ATTEMPTS) {
      throw new HttpError(
        409,
        `attempt limit of ${MAX_ATTEMPTS} reached; reveal the solution to continue`,
        'attempt_limit_reached',
      );
    }

    const correct = gradeResponse(body.response, exercise);
    session.attempts.push({
      exerciseId: body.exerciseId,
      response: body.response,
      correct: correct.correct,
      hintsUsed: body.hintsUsed,
      elapsedMs: body.elapsedMs,
      attemptIndex: previous.length,
      at: new Date().toISOString(),
      ...(body.workNote === undefined ? {} : { workNote: body.workNote }),
    });

    res.json({
      correct: correct.correct,
      // `expectedForm` is only safe on a correct answer; a wrong answer must not
      // hint at the canonical form.
      ...(correct.correct ? { expectedForm: correct.expectedForm } : {}),
      solutionAvailable: true,
      attemptsUsed: previous.length + 1,
      attemptsRemaining: MAX_ATTEMPTS - (previous.length + 1),
    });
  });

  /** Drives the session summary page. */
  router.post('/sessions/:id/complete', (req, res) => {
    const session = sessions.require(req.params.id);
    const body = z
      .object({ durationMs: z.coerce.number().int().min(0).default(0) })
      .parse(req.body ?? {});

    const lastByExercise = new Map<string, Attempt>();
    for (const attempt of session.attempts) lastByExercise.set(attempt.exerciseId, attempt);

    const byTier: Record<string, { correct: number; total: number }> = {};
    const wrongExerciseIds: string[] = [];
    for (const attempt of lastByExercise.values()) {
      const exercise = store.exerciseById(attempt.exerciseId);
      const tier = exercise?.tier ?? 'unknown';
      byTier[tier] ??= { correct: 0, total: 0 };
      byTier[tier].total += 1;
      if (attempt.correct) byTier[tier].correct += 1;
      else wrongExerciseIds.push(attempt.exerciseId);
    }
    const total = lastByExercise.size;
    const correct = [...lastByExercise.values()].filter((a) => a.correct).length;

    session.completed = true;
    res.json({
      sessionId: session.id,
      accuracy: total === 0 ? 0 : correct / total,
      byTier,
      durationMs: body.durationMs,
      wrongExerciseIds,
    });
  });

  return router;
}
