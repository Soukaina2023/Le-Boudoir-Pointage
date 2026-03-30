import { useState, useEffect } from 'react';
import type { AppData, Worker, Lang } from './types';
import { initData } from './utils/storage';
import { todayKey } from './utils/time';
import { translations } from './i18n/translations';
import { useToast } from './hooks/useToast';
import { isDemoMode } from './lib/supabase';

import ToastContainer from './components/ToastContainer';
import LoginScreen from './pages/LoginScreen';
import DashboardPage from './pages/DashboardPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import RecordsPage from './pages/RecordsPage';
import ReportsPage from './pages/ReportsPage';
import WorkersPage from './pages/WorkersPage';
import SettingsPage from './pages/SettingsPage';

type PageId = 'dashboard' | 'timeTracking' | 'history' | 'reports' | 'workers' | 'settings';

const NAV_ICONS: Record<PageId, string> = {
  dashboard: 'fa-chart-line',
  timeTracking: 'fa-stopwatch',
  history: 'fa-clock-rotate-left',
  reports: 'fa-chart-pie',
  workers: 'fa-users',
  settings: 'fa-gear',
};

export default function App() {
  const [data, setData] = useState<AppData>(initData);
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [lang, setLangState] = useState<Lang>(data.settings?.language ?? 'fr');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, toast } = useToast();

  const t = translations[lang];

  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    setLang(lang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (!isDemoMode) return;
    document.body.classList.add('has-demo-banner');
    return () => document.body.classList.remove('has-demo-banner');
  }, []);

  const demoBanner = isDemoMode ? (
    <div role="status" className="demo-mode-banner">
      Demo Mode (No backend connected)
    </div>
  ) : null;

  useEffect(() => {
    if (!currentWorker) return;
    const session = data.activeSessions[currentWorker.id] ?? {};
    if (session.status === 'working' && session.date !== todayKey()) {
      toast(t.forgotCheckout, 'warning');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorker]);

  const handleLogout = () => {
    setCurrentWorker(null);
    setActivePage('dashboard');
  };

  const navItems: { id: PageId; icon: string; faIcon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', faIcon: NAV_ICONS.dashboard, label: t.dashboard },
    { id: 'timeTracking', icon: '⏱', faIcon: NAV_ICONS.timeTracking, label: t.timeTracking },
    { id: 'history', icon: '📋', faIcon: NAV_ICONS.history, label: t.history },
    { id: 'reports', icon: '📈', faIcon: NAV_ICONS.reports, label: t.reports },
    ...(currentWorker?.isAdmin ? [{ id: 'workers' as PageId, icon: '👥', faIcon: NAV_ICONS.workers, label: t.workers }] : []),
    { id: 'settings', icon: '⚙️', faIcon: NAV_ICONS.settings, label: t.settings },
  ];

  if (!currentWorker) {
    return (
      <>
        {demoBanner}
        <LoginScreen
          workers={data.workers}
          settings={data.settings}
          onLogin={setCurrentWorker}
          lang={lang}
          setLang={setLang}
          t={t}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  const sharedProps = { data, setData, currentWorker, t, lang, toast };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':    return <DashboardPage {...sharedProps} />;
      case 'timeTracking': return <TimeTrackingPage {...sharedProps} />;
      case 'history':      return <RecordsPage {...sharedProps} />;
      case 'reports':      return <ReportsPage {...sharedProps} />;
      case 'workers':      return currentWorker.isAdmin ? <WorkersPage {...sharedProps} /> : <DashboardPage {...sharedProps} />;
      case 'settings':     return <SettingsPage {...sharedProps} setLang={setLang} />;
      default:             return <DashboardPage {...sharedProps} />;
    }
  };

  const workerDisplayName = () => (lang === 'ar' ? currentWorker.name : (currentWorker.nameFr || currentWorker.name));
  const workerDisplayRole = () => (lang === 'ar' ? currentWorker.role : (currentWorker.roleFr || currentWorker.role));

  return (
    <>
      {demoBanner}
      <div className="app-container">
        {/* Mobile header */}
        <div className="lux-mobile-header">
          <div className="lux-mobile-header-left">
            <div className="lux-mobile-logo-icon"><i className="fas fa-cut" /></div>
            <div className="lux-mobile-logo-info">
              <span className="lux-mobile-logo-text">{t.appName}</span>
              <span className="lux-mobile-logo-sub">{t.appSub}</span>
            </div>
          </div>
          <button className="lux-mobile-header-right" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div className="lux-mobile-user-info">
              <span className="lux-mobile-user-name">{workerDisplayName()}</span>
              <span className="lux-mobile-user-role">{workerDisplayRole()}</span>
            </div>
            <div className="lux-mobile-user-avatar" style={{ background: `linear-gradient(135deg, ${currentWorker.color}, ${currentWorker.color}88)` }}>
              {workerDisplayName().charAt(0)}
            </div>
          </button>
        </div>

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div className="lux-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`lux-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="lux-sidebar-logo">
            <div className="lux-sidebar-logo-mark">
              <i className="fas fa-cut" />
              <div className="lux-sidebar-logo-ring" />
            </div>
            <div className="lux-sidebar-logo-text">{t.appName}</div>
            <div className="lux-sidebar-logo-sub">{t.appSub}</div>
          </div>

          <div className="lux-sidebar-nav">
            <div className="lux-nav-section">
              {navItems.map((item) => (
                <div
                  key={item.id}
                  className={`lux-nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
                >
                  <span className="lux-nav-icon">
                    <i className={`fas ${item.faIcon}`} />
                  </span>
                  <span className="lux-nav-label">{item.label}</span>
                  {activePage === item.id && <span className="lux-nav-active-dot" />}
                </div>
              ))}
            </div>

            <div className="lux-nav-section">
              <div className="lux-nav-section-title">{t.language}</div>
              <div className="lux-lang-row">
                <button
                  className={`lux-lang-btn ${lang === 'fr' ? 'active' : ''}`}
                  onClick={() => setLang('fr')}
                >
                  🇫🇷 FR
                </button>
                <button
                  className={`lux-lang-btn ${lang === 'ar' ? 'active' : ''}`}
                  onClick={() => setLang('ar')}
                >
                  🇲🇦 AR
                </button>
              </div>
            </div>
          </div>

          <div className="lux-sidebar-footer">
            <div className="lux-sidebar-user">
              <div className="lux-sidebar-avatar" style={{ background: `linear-gradient(135deg, ${currentWorker.color}, ${currentWorker.color}88)` }}>
                {workerDisplayName().charAt(0)}
              </div>
              <div className="lux-sidebar-user-info">
                <div className="lux-sidebar-user-name">{workerDisplayName()}</div>
                <div className="lux-sidebar-user-role">{workerDisplayRole()}</div>
              </div>
              <button className="lux-sidebar-logout" onClick={handleLogout} title={t.logout}>
                <i className="fas fa-sign-out-alt" />
              </button>
            </div>
          </div>
        </div>

        <div className="lux-main-content">
          {renderPage()}
        </div>

        {/* Bottom tab bar (mobile only) */}
        <nav className="lux-bottom-tabs">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              className={`lux-bottom-tab ${activePage === item.id ? 'active' : ''}`}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
            >
              <i className={`fas ${item.faIcon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}
