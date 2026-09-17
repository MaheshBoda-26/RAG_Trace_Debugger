import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

// The dashboard carries the whole trace/data surface — it should not be part of
// the landing page's payload. Same for the secondary pages.
const DashboardApp = lazy(() =>
  import('./DashboardApp').then((m) => ({ default: m.DashboardApp })),
);
const Features = lazy(() => import('./pages/Features').then((m) => ({ default: m.Features })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));

function SurfaceFallback() {
  return (
    <div className="container py-32" role="status" aria-live="polite">
      <span className="exhibit-label">opening surface…</span>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'features',
        element: (
          <Suspense fallback={<SurfaceFallback />}>
            <Features />
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<SurfaceFallback />}>
            <About />
          </Suspense>
        ),
      },
      {
        path: 'debugger',
        element: (
          <Suspense fallback={<SurfaceFallback />}>
            <DashboardApp />
          </Suspense>
        ),
      },
      {
        path: 'eval',
        element: (
          <Suspense fallback={<SurfaceFallback />}>
            <DashboardApp initialTab="eval" />
          </Suspense>
        ),
      },
      {
        path: 'corpus',
        element: (
          <Suspense fallback={<SurfaceFallback />}>
            <DashboardApp initialTab="corpus" />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
