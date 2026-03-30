import { useState, useEffect, useRef } from 'react';
import type { Worker, AppSettings, Translations, Lang } from '../types';
import ParticleCanvas from '../components/ParticleCanvas';
import BackgroundEffects from '../components/BackgroundEffects';
import LoadingOverlay from '../components/LoadingOverlay';
import NotificationContainer, { showNotification } from '../components/Notification';

interface Props {
  workers: Worker[];
  settings: AppSettings;
  onLogin: (worker: Worker) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

export default function LoginScreen({ workers, settings, onLogin, lang, setLang, t }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const touchDeviceRef = useRef(false);

  useEffect(() => {
    touchDeviceRef.current = 'ontouchstart' in window;
  }, []);

  const nonAdminWorkers = workers.filter((w) => !w.isAdmin);

  const workerDisplayName = (w: Worker) => (lang === 'ar' ? w.name : (w.nameFr || w.name));
  const workerDisplayRole = (w: Worker) => (lang === 'ar' ? w.role : (w.roleFr || w.role));

  const avatarClassMap: Record<string, string> = {};
  nonAdminWorkers.forEach((w, i) => {
    avatarClassMap[w.id] = i === 0 ? 'login-avatar-primary' : 'login-avatar-secondary';
  });

  const handleLogin = () => {
    if (!selected) return;
    const worker = workers.find((w) => w.id === selected);
    if (!worker) return;

    if (worker.pin === pin || (adminMode && pin === settings.adminPin)) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        showNotification(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Connexion réussie');
        setTimeout(() => onLogin(worker), 400);
      }, 1200);
    } else {
      setError(t.loginError);
      setPin('');
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleWorkerSelect = (id: string) => {
    setActiveCard(id);
    setSelected(id);
    setPin('');
    setError('');
    setAdminMode(false);

    const worker = workers.find((w) => w.id === id);
    if (worker && !worker.pin) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        showNotification(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Connexion réussie');
        setTimeout(() => onLogin(worker), 400);
      }, 1200);
    }
  };

  const handleAdminAccess = () => {
    setAdminMode(true);
    setSelected('w3');
    setActiveCard(null);
    setPin('');
    setError('');
  };

  return (
    <div className="login-luxury-root">
      <BackgroundEffects />
      <ParticleCanvas />
      <LoadingOverlay active={loading} text={lang === 'ar' ? 'جاري التحميل' : 'Chargement'} />
      <NotificationContainer />

      {/* Language chips */}
      <div className="login-lang-chips">
        <button className={`login-lang-chip ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>
          🇫🇷 FR
        </button>
        <button className={`login-lang-chip ${lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>
          🇲🇦 AR
        </button>
      </div>

      <div className="login-luxury-container">
        <div className="login-luxury-card">
          {/* Corner decorations */}
          <div className="login-corner login-corner-tl" />
          <div className="login-corner login-corner-tr" />
          <div className="login-corner login-corner-bl" />
          <div className="login-corner login-corner-br" />

          {/* Logo section */}
          <div className="login-logo-section">
            <div className="login-logo-wrapper">
              <div className="login-logo-ring" />
              <div className="login-logo-ring" />
              <div className="login-logo-box">
                <i className="fas fa-cut login-logo-icon" />
              </div>
            </div>
            <h1 className="login-salon-name">Le Boudoir Majorelle</h1>
            <p className="login-salon-tagline">{t.appSub}</p>
          </div>

          {/* Section title */}
          <div className="login-section-title">
            <h3>
              <span className="login-title-line" />
              {t.selectWorker}
              <span className="login-title-line" />
            </h3>
          </div>

          {/* Accounts grid */}
          <div className="login-accounts-grid">
            {nonAdminWorkers.map((w, i) => (
              <div
                key={w.id}
                className={`login-account-card${activeCard === w.id ? ' active' : ''}`}
                onClick={() => handleWorkerSelect(w.id)}
                style={{ animationDelay: `${0.7 + i * 0.2}s` }}
              >
                <div className="login-account-avatar-wrapper">
                  <div className="login-avatar-ring" />
                  <div
                    className={`login-account-avatar ${avatarClassMap[w.id] ?? ''}`}
                    style={{ background: `linear-gradient(135deg, ${w.color} 0%, ${w.color}99 100%)` }}
                  >
                    {workerDisplayName(w).charAt(0)}
                    <div className="login-status-dot" />
                  </div>
                </div>
                <div className="login-account-name">{workerDisplayName(w)}</div>
                <div className="login-account-role">{workerDisplayRole(w)}</div>
              </div>
            ))}
          </div>

          {/* PIN input for worker login (only if worker has a PIN) */}
          {selected && !adminMode && workers.find((w) => w.id === selected)?.pin && (
            <div className="login-pin-section">
              <div className="login-form-group">
                <label className="login-form-label">{t.enterPin}</label>
                <input
                  type="password"
                  className="login-form-input"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••"
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button className="login-submit-btn" onClick={handleLogin}>
                <i className="fas fa-sign-in-alt" />
                <span>{t.loginBtn}</span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="login-divider" />

          {/* Admin button */}
          <button className="login-admin-btn" onClick={handleAdminAccess}>
            <i className="fas fa-crown" />
            <span>{t.adminAccess}</span>
          </button>

          {/* Admin PIN input */}
          {adminMode && selected === 'w3' && (
            <div className="login-pin-section" style={{ marginTop: 16 }}>
              <input
                type="password"
                className="login-form-input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder={`${t.adminPin}: ••••`}
                autoFocus
              />
              {error && <div className="login-error">{error}</div>}
              <button className="login-submit-btn" onClick={handleLogin}>
                <i className="fas fa-shield-alt" />
                <span>{t.adminLoginTitle}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>
            Created by <span>Mohamed</span> 2026
          </p>
        </div>
      </div>
    </div>
  );
}
