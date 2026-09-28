import type { Lesson, ModuleSummary } from '@mta/content';
import { resolveContentRoot } from '@mta/content/node';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

import { createApp } from '../app.js';
import { createStore, loadIndex } from '../store.js';

let app: Express;

beforeAll(() => {
  const index = loadIndex(resolveContentRoot());
  app = createApp({ store: createStore(index) });
});

describe('GET /health', () => {
  it('reports the loaded content counts', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.content.modules).toBe(9);
    expect(res.body.content.exercises).toBeGreaterThan(0);
  });
});

describe('GET /api/modules', () => {
  it('returns the 9 modules ordered 1..9', async () => {
    const res = await request(app).get('/api/modules').expect(200);
    const body = res.body as ModuleSummary[];
    expect(body).toHaveLength(9);
    expect(body.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(body[0]?.code).toBe('M1');
  });

  it('filters by tier', async () => {
    const res = await request(app).get('/api/modules?tier=A').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const m of res.body) expect(m.tiers).toContain('A');
  });

  it('returns the lesson list with resolved prerequisite titles in one call', async () => {
    const res = await request(app).get('/api/modules/M1').expect(200);
    expect(res.body.module.id).toBe('M1');
    expect(res.body.lessons.length).toBeGreaterThan(0);
    expect(res.body.prerequisitesFlat).toEqual(
      expect.arrayContaining([{ id: 'm1-linear-equations', title: 'Linear Equations and Inequalities' }]),
    );
  });

  it('404s an unknown module', async () => {
    const res = await request(app).get('/api/modules/M99').expect(404);
    expect(res.body.error).toBe('module_not_found');
  });
});

describe('GET /api/lessons', () => {
  it('returns id lists for practice, solutions and mastery — never embedded copies', async () => {
    const res = await request(app).get('/api/lessons/m1-quadratics').expect(200);
    const { sections } = res.body as Lesson;
    expect(sections.practiceIds).toHaveLength(8);
    expect(sections.masteryIds).toHaveLength(3);
    expect(sections.solutionIds).toEqual(sections.practiceIds);
    expect(sections.practiceIds.every((id) => typeof id === 'string')).toBe(true);
    expect(sections.concept).toContain('#');
    expect(sections.techniques[0]?.slug).toBe('split-the-middle');
  });

  it('404s an unknown lesson', async () => {
    await request(app).get('/api/lessons/nope').expect(404);
  });
});

describe('GET /api/exercises', () => {
  it('batches by ids and returns raw LaTeX, never rendered HTML', async () => {
    const res = await request(app)
      .get('/api/exercises?ids=m1-quadratics-01,m1-quadratics-02')
      .expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].promptLatex).toContain('$');
    expect(JSON.stringify(res.body)).not.toContain('katex');
  });

  it('serves the asymptote source, alt text and reserved aspect ratio', async () => {
    const res = await request(app).get('/api/exercises/m1-quadratics-07').expect(200);
    expect(res.body.asymptoteSource).toContain('unitsize');
    expect(res.body.asymptoteAlt).toContain('right triangle');
    expect(res.body.asymptoteAspectRatio).toBe(0.75);
  });

  it('rejects a batch over 60 ids', async () => {
    const ids = Array.from({ length: 61 }, (_, i) => `x${i}`).join(',');
    const res = await request(app).get(`/api/exercises?ids=${ids}`).expect(400);
    expect(res.body.error).toBe('too_many_ids');
  });

  it('404s an unknown exercise', async () => {
    await request(app).get('/api/exercises/nope').expect(404);
  });
});

describe('practice sessions', () => {
  it('creates a server-ordered session and grades an answer without leaking it', async () => {
    const created = await request(app)
      .post('/api/practice/sessions')
      .send({ filters: { moduleIds: ['M1'], tiers: ['10'] } })
      .expect(201);
    expect(created.body.itemIds.length).toBeGreaterThan(0);

    const exerciseId = created.body.itemIds[0] as string;
    const wrong = await request(app)
      .post(`/api/practice/sessions/${created.body.sessionId}/answers`)
      .send({ exerciseId, response: '-99999', attemptIndex: 0, hintsUsed: 0, elapsedMs: 1000 })
      .expect(200);
    expect(wrong.body.correct).toBe(false);
    const payload = JSON.stringify(wrong.body);
    expect(payload).not.toContain('answerLatex');
    expect(payload).not.toContain('solutionLatex');
    expect(payload).not.toContain('expectedForm');
  });

  it('enforces the 3-attempt limit with a 409', async () => {
    const created = await request(app)
      .post('/api/practice/sessions')
      .send({ filters: { moduleIds: ['M1'] } })
      .expect(201);
    const sessionId = created.body.sessionId as string;
    const exerciseId = created.body.itemIds[0] as string;
    const attempt = (i: number) =>
      request(app)
        .post(`/api/practice/sessions/${sessionId}/answers`)
        .send({ exerciseId, response: 'definitely-wrong', attemptIndex: i });
    await attempt(0).expect(200);
    await attempt(1).expect(200);
    const third = await attempt(2).expect(200);
    expect(third.body.attemptsRemaining).toBe(0);
    const fourth = await attempt(3).expect(409);
    expect(fourth.body.error).toBe('attempt_limit_reached');
  });

  it('rejects an exercise that is not in the session', async () => {
    const created = await request(app)
      .post('/api/practice/sessions')
      .send({ filters: { moduleIds: ['M1'] } })
      .expect(201);
    const res = await request(app)
      .post(`/api/practice/sessions/${created.body.sessionId}/answers`)
      .send({ exerciseId: 'not-in-session', response: '1' })
      .expect(400);
    expect(res.body.error).toBe('exercise_not_in_session');
  });

  it('summarizes accuracy by tier and lists the wrong ids', async () => {
    const created = await request(app)
      .post('/api/practice/sessions')
      .send({ filters: { moduleIds: ['M1'] } })
      .expect(201);
    const sessionId = created.body.sessionId as string;
    const items = created.body.itemIds as string[];

    const store = createStore(loadIndex(resolveContentRoot()));
    await request(app)
      .post(`/api/practice/sessions/${sessionId}/answers`)
      .send({ exerciseId: items[0], response: store.exerciseById(items[0] as string)?.answerLatex })
      .expect(200);
    await request(app)
      .post(`/api/practice/sessions/${sessionId}/answers`)
      .send({ exerciseId: items[1], response: 'wrong-on-purpose' })
      .expect(200);

    const done = await request(app)
      .post(`/api/practice/sessions/${sessionId}/complete`)
      .send({ durationMs: 60_000 })
      .expect(200);
    expect(done.body.accuracy).toBe(0.5);
    expect(done.body.wrongExerciseIds).toEqual([items[1]]);
    expect(Object.values(done.body.byTier as Record<string, { total: number }>).reduce(
      (sum, t) => sum + t.total,
      0,
    )).toBe(2);
  });

  it('404s an unknown session', async () => {
    await request(app).get('/api/practice/sessions/does-not-exist').expect(404);
  });
});

describe('POST /api/grade', () => {
  it('normalizes and reports which comparison was used', async () => {
    const res = await request(app)
      .post('/api/grade')
      .send({ response: '$2.0$', exerciseId: 'm1-linear-equations-03' })
      .expect(200);
    expect(res.body.correct).toBe(true);
    expect(res.body.comparedBy).toBe('numeric');
    expect(res.body.normalized).toBe('2.0');
  });

  it('does not leak the expected form on a wrong answer', async () => {
    const res = await request(app)
      .post('/api/grade')
      .send({ response: '17', exerciseId: 'm1-linear-equations-03' })
      .expect(200);
    expect(res.body.correct).toBe(false);
    expect(res.body.expectedForm).toBeUndefined();
  });

  it('400s a malformed body', async () => {
    await request(app).post('/api/grade').send({ response: '1' }).expect(400);
  });
});

describe('PUT /api/progress', () => {
  it('is idempotent and last-write-wins, never un-passing a lesson', async () => {
    await request(app)
      .put('/api/progress')
      .send({ lessonId: 'm1-linear-equations', state: 'in-progress' })
      .expect(200);
    const passed = await request(app)
      .put('/api/progress')
      .send({ lessonId: 'm1-linear-equations', state: 'passed', mastery: { attempt: 1, correct: 3, total: 3 } })
      .expect(200);
    expect(passed.body.state).toBe('passed');

    const regress = await request(app)
      .put('/api/progress')
      .send({ lessonId: 'm1-linear-equations', state: 'in-progress' })
      .expect(200);
    expect(regress.body.state).toBe('passed');
  });
});

describe('unknown routes', () => {
  it('404s with a machine-readable code', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toBe('not_found');
  });
});
