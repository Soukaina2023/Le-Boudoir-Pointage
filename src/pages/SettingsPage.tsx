import { useState } from 'react';
import type { AppData, Translations, Lang } from '../types';
import { saveData } from '../utils/storage';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  t: Translations;
  lang: Lang;
  setLang: (l: Lang) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function SettingsPage({ data, setData, t, lang, setLang, toast }: Props) {
  const [officialHours, setOfficialHours] = useState(data.settings.officialHoursPerDay);
  const [adminPin, setAdminPin] = useState(data.settings.adminPin);

  const saveSetting = <K extends keyof typeof data.settings>(key: K, val: (typeof data.settings)[K]) => {
    setData((prev) => {
      const nd = { ...prev, settings: { ...prev.settings, [key]: val } };
      saveData(nd);
      return nd;
    });
    toast(t.updatedSuccess, 'success');
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ {t.settings}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="card">
          <div className="card-title">🕐 {lang === 'ar' ? 'إعدادات العمل' : 'Paramètres de travail'}</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">{t.officialHours}</div>
              <div className="settings-desc">
                {lang === 'ar' ? 'الحد الفاصل بين الساعات العادية والإضافية' : 'Seuil heures normales / supplémentaires'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="form-control"
                style={{ width: 80, textAlign: 'center' }}
                value={officialHours}
                min={1}
                max={24}
                onChange={(e) => setOfficialHours(Number(e.target.value))}
              />
              <span className="text-muted" style={{ fontSize: 13 }}>{t.hoursPerDay}</span>
              <button className="btn btn-primary btn-sm" onClick={() => saveSetting('officialHoursPerDay', officialHours)}>
                {t.save}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🔐 {lang === 'ar' ? 'الأمان' : 'Sécurité'}</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">{t.adminPin}</div>
              <div className="settings-desc">
                {lang === 'ar' ? 'رمز دخول المشرف' : 'Code PIN administrateur'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                className="form-control"
                style={{ width: 120 }}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                maxLength={8}
              />
              <button className="btn btn-primary btn-sm" onClick={() => saveSetting('adminPin', adminPin)}>
                {t.save}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🌍 {t.language}</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">{t.language}</div>
            </div>
            <div className="flex gap-2">
              <button
                className={`btn ${lang === 'fr' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setLang('fr'); saveSetting('language', 'fr'); }}
              >
                🇫🇷 {t.french}
              </button>
              <button
                className={`btn ${lang === 'ar' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setLang('ar'); saveSetting('language', 'ar'); }}
              >
                🇲🇦 {t.arabic}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">📋 {t.auditLog}</div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {data.auditLog.length === 0 ? (
              <div className="text-muted text-sm text-center p-4">
                {lang === 'ar' ? 'لا توجد تعديلات' : 'Aucune modification'}
              </div>
            ) : (
              data.auditLog.map((entry, i) => (
                <div key={i} className="audit-item">
                  <div className="audit-time">
                    {new Date(entry.ts).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}{' '}
                    {new Date(entry.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="audit-action">
                    <span className="audit-actor">{entry.actor}</span> — {entry.action}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
