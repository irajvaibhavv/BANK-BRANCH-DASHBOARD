import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PageHeader from './PageHeader';

/** Shell: fixed sidebar + sticky top bar + routed content */
export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage('ff_sidebar_collapsed', false);
  const location = useLocation();
  // every page opens at the top — browsers keep the old scroll offset across client-side navigation
  useEffect(() => { window.scrollTo(0, 0); document.querySelector('.app-main')?.scrollTo?.(0, 0); }, [location.pathname]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="app-main">
        <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main key={location.pathname} className="content page-enter">
          <PageHeader />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
