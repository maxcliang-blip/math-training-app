import { Link } from 'react-router-dom';

/** Canonical error copy (IA doc §6.7). Never a dead end. */
export function ErrorState({ error }: { error?: Error }) {
  return (
    <div className="error-state" role="alert">
      <h1>This page didn't load.</h1>
      <p>{error?.message ?? 'Something went wrong on our side.'}</p>
      <button type="button" onClick={() => window.location.reload()}>
        Retry
      </button>
      <p>
        <Link to="/">Back to the dashboard</Link>
      </p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="error-state">
      <h1>That page doesn't exist.</h1>
      <p>Valid paths are the dashboard, a module, a lesson, a practice session, and progress.</p>
      <p>
        <Link to="/">Go home</Link>
      </p>
    </div>
  );
}
