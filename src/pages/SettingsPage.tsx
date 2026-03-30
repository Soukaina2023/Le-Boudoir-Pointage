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
    <div className="lux-dash">
      <div className="lux-dash-header">
        <div className="lux-dash-header-text">
          <h1 className="lux-dash-title"><i className="fas fa-gear lux-dash-title-icon" />{t.settings}</h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Work settings */}
        <div className="lux-dash-card">
          <div className="lux-dash-card-header">
            <div className="lux-dash-card-title"><i className="fas fa-briefcase" /> <span>{lang === 'ar' ? 'إعدادات العمل' : 'Paramètres de travail'}</span></div>
          </div>
          <div className="lux-dash-card-body">
            <div className="lux-settings-row">
              <div>
                <div className="lux-settings-label">{t.officialHours}</div>
                <div className="lux-settings-desc">{lang === 'ar' ? 'الحد الفاصل بين الساعات العادية والإضافية' : 'Seuil heures normales / supplémentaires'}</div>
              </div>
              <div className="lux-settings-control">
                <input type="number" className="lux-form-control" style={{ width: 80, textAlign: 'center' }} value={officialHours} min={1} max={24} onChange={(e) => setOfficialHours(Number(e.target.value))} />
                <span className="lux-settings-unit">{t.hoursPerDay}</span>
                <button className="lux-btn lux-btn-primary lux-btn-sm" onClick={() => saveSetting('officialHoursPerDay', officialHours)}>{t.save}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="lux-dash-card">
          <div className="lux-dash-card-header">
            <div className="lux-dash-card-title"><i className="fas fa-shield-halved" /> <span>{lang === 'ar' ? 'الأمان' : 'Sécurité'}</span></div>
          </div>
          <div className="lux-dash-card-body">
            <div className="lux-settings-row">
              <div>
                <div className="lux-settings-label">{t.adminPin}</div>
                <div className="lux-settings-desc">{lang === 'ar' ? 'رمز دخول المشرف' : 'Code PIN administrateur'}</div>
              </div>
              <div className="lux-settings-control">
                <input type="password" className="lux-form-control" style={{ width: 120 }} value={adminPin} onChange={(e) => setAdminPin(e.target.value)} maxLength={8} />
                <button className="lux-btn lux-btn-primary lux-btn-sm" onClick={() => saveSetting('adminPin', adminPin)}>{t.save}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="lux-dash-card">
          <div className="lux-dash-card-header">
            <div className="lux-dash-card-title"><i className="fas fa-globe" /> <span>{t.language}</span></div>
          </div>
          <div className="lux-dash-card-body">
            <div className="lux-settings-row">
              <div><div className="lux-settings-label">{t.language}</div></div>
              <div className="lux-settings-control">
                <button className={`lux-btn ${lang === 'fr' ? 'lux-btn-primary' : 'lux-btn-ghost'}`} onClick={() => { setLang('fr'); saveSetting('language', 'fr'); }}>🇫🇷 {t.french}</button>
                <button className={`lux-btn ${lang === 'ar' ? 'lux-btn-primary' : 'lux-btn-ghost'}`} onClick={() => { setLang('ar'); saveSetting('language', 'ar'); }}>🇲🇦 {t.arabic}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Audit log */}
        <div className="lux-dash-card">
          <div className="lux-dash-card-header">
            <div className="lux-dash-card-title"><i className="fas fa-list-check" /> <span>{t.auditLog}</span></div>
          </div>
          <div className="lux-dash-card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {data.auditLog.length === 0 ? (
              <div className="lux-empty" style={{ padding: '30px 20px' }}>
                <div className="lux-empty-icon"><i className="fas fa-clipboard-check" /></div>
                <div className="lux-empty-desc">{lang === 'ar' ? 'لا توجد تعديلات' : 'Aucune modification'}</div>
              </div>
            ) : (
              data.auditLog.map((entry, i) => (
                <div key={i} className="lux-audit-item">
                  <div className="lux-audit-time">
                    {new Date(entry.ts).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}{' '}
                    {new Date(entry.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="lux-audit-action">
                    <span className="lux-audit-actor">{entry.actor}</span> — {entry.action}
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
