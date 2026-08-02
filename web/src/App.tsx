import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Features } from './pages/Features';
import { About } from './pages/About';
import { DashboardApp } from './DashboardApp';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'features', element: <Features /> },
      { path: 'about', element: <About /> },
      { path: 'debugger', element: <DashboardApp /> },
      { path: 'eval', element: <DashboardApp initialTab="eval" /> },
      { path: 'corpus', element: <DashboardApp initialTab="corpus" /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}