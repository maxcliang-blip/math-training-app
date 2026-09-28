import { AppShell, EmptyState } from '../components/AppShell.js';
import { useParams } from 'react-router-dom';

/**
 * `/practice`, `/practice/:sessionId`, `/practice/:sessionId/summary`.
 *
 * The session runner, the exercise state machine and the grading path are
 * MAX-4/MAX-5 work; this route reserves the mount point and the copy so the
 * route map is fixed and the app never 404s on a bookmarked session URL.
 */
export function Practice() {
  const { sessionId } = useParams();

  return (
    <AppShell breadcrumb="Practice">
      <h1>Practice</h1>
      {sessionId === undefined ? (
        <EmptyState message="Pick a tier and a size to start a session." />
      ) : (
        <EmptyState message={`Session ${sessionId} — the runner lands in MAX-4/MAX-5.`} />
      )}
    </AppShell>
  );
}
