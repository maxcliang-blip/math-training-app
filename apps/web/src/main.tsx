import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

// KaTeX CSS is bundled and imported once in the app entry. No CDN stylesheet.
import 'katex/dist/katex.min.css';
import './index.css';

import { ErrorState, NotFound } from './pages/ErrorState.js';
import { Dashboard } from './pages/Dashboard.js';
import { LessonViewer } from './pages/LessonViewer.js';
import { ModuleDetail } from './pages/ModuleDetail.js';
import { Practice } from './pages/Practice.js';
import { Progress } from './pages/Progress.js';

/**
 * Route map from the UI/UX architecture §2.1 (React Router v6, data router).
 *
 * Section deep-links (`#practice`, `#solutions`, `#mastery`) are anchors on the
 * lesson document, not routes: one lesson is one document is one scroll position.
 */
const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/learn', element: <ModuleDetail /> },
  { path: '/learn/:moduleId', element: <ModuleDetail /> },
  { path: '/learn/:moduleId/:lessonId', element: <LessonViewer /> },
  { path: '/practice', element: <Practice /> },
  { path: '/practice/:sessionId', element: <Practice /> },
  { path: '/practice/:sessionId/summary', element: <Practice /> },
  { path: '/progress', element: <Progress /> },
  { path: '*', element: <NotFound />, errorElement: <ErrorState /> },
]);

const container = document.getElementById('root');
if (container === null) {
  throw new Error('missing #root container');
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} fallbackElement={<NotFound />} />
  </StrictMode>,
);
