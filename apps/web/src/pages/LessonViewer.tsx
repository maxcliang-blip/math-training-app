import { Link, useParams } from 'react-router-dom';

import { LESSON_SECTION_IDS, type Exercise } from '@mta/content';

import { AppShell, EmptyState, Loading } from '../components/AppShell.js';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { MathBlock } from '../math/MathBlock.js';
import { AsymptoteFigure } from '../math/AsymptoteFigure.js';
import { ErrorState } from './ErrorState.js';

function useLesson(lessonId: string | undefined) {
  const lesson = useAsync(
    () => (lessonId === undefined ? Promise.resolve(null) : api.lesson(lessonId)),
    [lessonId],
  );
  const ids =
    lesson.status === 'ready' && lesson.data !== null
      ? [...lesson.data.sections.practiceIds, ...lesson.data.sections.masteryIds]
      : [];
  const exercises = useAsync(() => api.exercises(ids), [ids.join(',')]);
  return { lesson, exercises };
}

/**
 * `/learn/:moduleId/:lessonId` — the 8 template sections, always, in order.
 *
 * Ordering is fixed and non-negotiable (lesson spec §1.2). The anchor ids are
 * the section ids, so `#practice`, `#solutions` and `#mastery` deep-link without
 * becoming routes.
 */
export function LessonViewer() {
  const { moduleId, lessonId } = useParams();
  const { lesson, exercises } = useLesson(lessonId);
  const byId = new Map<string, Exercise>(
    exercises.status === 'ready' ? exercises.data.map((e) => [e.id, e]) : [],
  );

  if (lesson.status === 'loading') {
    return (
      <AppShell>
        <Loading label="Loading lesson…" />
      </AppShell>
    );
  }
  if (lesson.status === 'error') {
    return <ErrorState error={lesson.error} />;
  }
  if (lesson.data === null) {
    return <NotALesson />;
  }

  const { sections } = lesson.data;

  return (
    <AppShell breadcrumb={`${moduleId ?? ''} ${lesson.data.title}`}>
      <article className="lesson">
        <h1>{lesson.data.title}</h1>

        <nav className="toc" aria-label="Lesson sections">
          <ol>
            {LESSON_SECTION_IDS.map((id) => (
              <li key={id}>
                <a href={`#${id}`}>{id}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="objective" className="lesson__section callout">
          <h2>Objective</h2>
          <p>{sections.objective}</p>
        </section>

        <section id="prerequisites" className="lesson__section">
          <h2>Prerequisites</h2>
          {sections.prerequisites.length === 0 ? (
            <p className="muted">None — this is where you start.</p>
          ) : (
            <ul className="chip-row">
              {sections.prerequisites.map((id) => (
                <li key={id} className="chip">
                  <Link to={`/lesson/${id}`}>{id}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="concept" className="lesson__section">
          <h2>Concept</h2>
          <p className="prose">{sections.concept}</p>
          {sections.examples.map((example) => (
            <details key={example.title} className="worked-example">
              <summary>{example.title}</summary>
              <MathBlock latex={example.latex} displayMode />
            </details>
          ))}
        </section>

        <section id="techniques" className="lesson__section">
          <h2>Key techniques</h2>
          <dl className="techniques">
            {sections.techniques.map((technique) => (
              <div key={technique.slug} id={`tech-${technique.slug}`}>
                <dt>{technique.name}</dt>
                <dd>{technique.summary}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="pitfalls" className="lesson__section">
          <h2>Common pitfalls</h2>
          {sections.pitfalls.map((pitfall) => (
            <article key={pitfall.title} className="pitfall">
              <h3>{pitfall.title}</h3>
              <p className="pitfall__wrong">
                <span className="pitfall__label">Wrong answer</span>{' '}
                <MathBlock latex={pitfall.wrongLatex} />
              </p>
              <p>{pitfall.why}</p>
              <p>{pitfall.fix}</p>
            </article>
          ))}
        </section>

        <section id="practice" className="lesson__section">
          <h2>Practice</h2>
          {exercises.status === 'loading' && <Loading label="Loading exercises…" />}
          <ol className="exercise-list">
            {sections.practiceIds.map((id) => (
              <ExerciseRow key={id} exercise={byId.get(id)} />
            ))}
          </ol>
        </section>

        <section id="solutions" className="lesson__section">
          <h2>Solutions</h2>
          <ol className="exercise-list">
            {sections.solutionIds.map((id) => {
              const exercise = byId.get(id);
              return (
                <li key={id} className="card">
                  <details>
                    <summary>
                      Solution {sections.solutionIds.indexOf(id) + 1} · {exercise?.tier ?? '—'}
                    </summary>
                    <MathBlock latex={exercise?.solutionLatex ?? ''} displayMode />
                  </details>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="mastery" className="lesson__section">
          <h2>Mastery check</h2>
          <ol className="exercise-list">
            {sections.masteryIds.map((id) => (
              <ExerciseRow key={id} exercise={byId.get(id)} />
            ))}
          </ol>
        </section>
      </article>
    </AppShell>
  );
}

function ExerciseRow({ exercise }: { exercise: Exercise | undefined }) {
  if (exercise === undefined) return <li className="card muted">Loading…</li>;
  return (
    <li className="card exercise-row">
      <p className="exercise-row__meta">
        <span className={`tier tier--${exercise.tier.replace('+', 'plus')}`}>{exercise.tier}</span>
        <span aria-label={`difficulty ${exercise.difficulty} of 5`}>
          {'●'.repeat(exercise.difficulty)}
          {'○'.repeat(5 - exercise.difficulty)}
        </span>
      </p>
      <MathBlock latex={exercise.promptLatex} />
      {exercise.asymptoteSource !== null && (
        <AsymptoteFigure
          source={exercise.asymptoteSource}
          alt={exercise.asymptoteAlt ?? ''}
          aspectRatio={exercise.asymptoteAspectRatio}
        />
      )}
    </li>
  );
}

function NotALesson() {
  return (
    <AppShell>
      <EmptyState message="Pick a module to see its lessons." />
    </AppShell>
  );
}
