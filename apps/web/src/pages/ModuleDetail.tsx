import { Link, useParams, useSearchParams } from 'react-router-dom';

import { TIERS, isTier } from '@mta/content';

import { AppShell, EmptyState, Loading } from '../components/AppShell.js';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { ErrorState } from './ErrorState.js';

/**
 * `/learn/:moduleId` — ordered lesson list with per-lesson state and locks.
 * The tier filter persists in the URL (`?tier=A%2B`), never in component state.
 */
export function ModuleDetail() {
  const { moduleId } = useParams();
  const [params] = useSearchParams();
  // A second params.get() call is a fresh value; the guard only narrows the one reference.
  const requested = params.get('tier');
  const tier = isTier(requested) ? requested : null;

  const state = useAsync(
    () => (moduleId === undefined ? Promise.resolve(null) : api.module(moduleId)),
    [moduleId],
  );
  // Bound to a local: narrowing a `state.data` property does not survive into a
  // `.map()` callback, where the object could in principle be replaced.
  const detail = state.status === 'ready' ? state.data : null;

  return (
    <AppShell breadcrumb={moduleId === undefined ? 'Modules' : `Module ${moduleId}`}>
      <h1>{detail === null ? 'Modules' : detail.module.title}</h1>

      <nav className="filter-bar" aria-label="Tier filter">
        <Link to={moduleId === undefined ? '/learn' : `/learn/${moduleId}`}>All tiers</Link>
        {TIERS.map((t) => (
          <Link
            key={t}
            className={tier === t ? 'is-active' : undefined}
            to={`${moduleId === undefined ? '/learn' : `/learn/${moduleId}`}?tier=${encodeURIComponent(t)}`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {state.status === 'loading' && <Loading label="Loading lessons…" />}
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'ready' &&
        (detail === null ? (
          <EmptyState message="Pick a module to see its lessons." />
        ) : (
          <ol className="lesson-list">
            {detail.lessons
              .filter((lesson) => tier === null || lesson.tiers.includes(tier))
              .map((lesson) => (
                <li key={lesson.id} className="card">
                  <h3>
                    <Link to={`/learn/${detail.module.id}/${lesson.id}`}>
                      {lesson.order}. {lesson.title}
                    </Link>
                  </h3>
                  <p className="muted">
                    {lesson.exerciseCount} exercises · {lesson.estimatedMinutes} min ·{' '}
                    {lesson.lockMode === 'hard' ? 'locked' : 'soft lock'}
                  </p>
                </li>
              ))}
          </ol>
        ))}
    </AppShell>
  );
}
