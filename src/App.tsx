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

  const navItems: { id: PageId; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', label: t.dashboard },
    { id: 'timeTracking', icon: '⏱', label: t.timeTracking },
    { id: 'history', icon: '📋', label: t.history },
    { id: 'reports', icon: '📈', label: t.reports },
    ...(currentWorker?.isAdmin ? [{ id: 'workers' as PageId, icon: '👥', label: t.workers }] : []),
    { id: 'settings', icon: '⚙️', label: t.settings },
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
      case 'timeTracking':
        return <TimeTrackingPage {...sharedProps} />;
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
      <div className="mobile-header">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>✂️</span>
          <span style={{ fontWeight: 800, color: 'var(--gold)', fontSize: 16 }}>{t.appName}</span>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
      </div>

      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">✂️</div>
          <div className="logo-text">{t.appName}</div>
          <div className="logo-sub">{t.appSub}</div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section">
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">{t.language}</div>
            <div className="flex gap-2" style={{ paddingRight: 8 }}>
              <button
                className={`mode-chip ${lang === 'fr' ? 'active' : ''}`}
                onClick={() => setLang('fr')}
                style={{ flex: 1, textAlign: 'center' }}
              >
                🇫🇷 FR
              </button>
              <button
                className={`mode-chip ${lang === 'ar' ? 'active' : ''}`}
                onClick={() => setLang('ar')}
                style={{ flex: 1, textAlign: 'center' }}
              >
                🇲🇦 AR
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="worker-chip">
            <div className="worker-avatar" style={{ background: `linear-gradient(135deg, ${currentWorker.color}, ${currentWorker.color}88)` }}>
              {workerDisplayName().charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="worker-name">{workerDisplayName()}</div>
              <div className="worker-role">{workerDisplayRole()}</div>
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={handleLogout} title={t.logout} style={{ padding: 6 }}>↩</button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {renderPage()}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
    </>
  );
}
