import { useState } from 'react';
import type { Worker, AppSettings, Translations, Lang } from '../types';

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

  const handleLogin = () => {
    if (!selected) return;
    const worker = workers.find((w) => w.id === selected);
    if (!worker) return;

    if (worker.pin === pin || (adminMode && pin === settings.adminPin)) {
      onLogin(worker);
    } else {
      setError(t.loginError);
      setPin('');
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleWorkerSelect = (id: string) => {
    setSelected(id);
    setPin('');
    setError('');
  };

  const handleAdminAccess = () => {
    setAdminMode(true);
    setSelected('w3');
    setPin('');
  };

  const workerDisplayName = (w: Worker) => (lang === 'ar' ? w.name : (w.nameFr || w.name));

  return (
    <div className="login-screen">
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
        <button className={`mode-chip ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>
          🇫🇷 Français
        </button>
        <button className={`mode-chip ${lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>
          🇲🇦 العربية
        </button>
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">✂️</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{t.appName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{t.appSub}</div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          {t.selectWorker}
        </div>

        <div className="worker-selector">
          {workers.filter((w) => !w.isAdmin).map((w) => (
            <div
              key={w.id}
              className={`worker-option ${selected === w.id ? 'selected' : ''}`}
              onClick={() => handleWorkerSelect(w.id)}
            >
              <div className="worker-option-avatar" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}88)` }}>
                {workerDisplayName(w).charAt(0)}
              </div>
              <div className="worker-option-name">{workerDisplayName(w)}</div>
              <div className="worker-option-role">{lang === 'ar' ? w.role : (w.roleFr || w.role)}</div>
            </div>
          ))}
        </div>

        {selected && !adminMode && (
          <div style={{ marginTop: 20, animation: 'fadeIn 0.3s ease' }}>
            <div className="form-group">
              <label className="form-label">{t.enterPin}</label>
              <input
                type="password"
                className="form-control"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                <span>✗</span>{error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
              {t.loginBtn} →
            </button>
          </div>
        )}

        <hr className="divider" />

        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleAdminAccess}>
            🔐 {t.adminAccess}
          </button>
        </div>

        {adminMode && selected === 'w3' && (
          <div style={{ marginTop: 12, animation: 'fadeIn 0.3s ease' }}>
            <input
              type="password"
              className="form-control"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder={t.adminPin + ': ••••'}
              autoFocus
            />
            {error && (
              <div className="alert alert-danger" style={{ marginTop: 8 }}>
                <span>✗</span>{error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleLogin}>
              {t.adminLoginTitle}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
