import { useState, useMemo } from 'react';
import type { AppData, Translations, Lang, TimeRecord } from '../types';
import { formatTime, minutesToHHMM, getMonthKey, getMonthLabel, splitOvertimeBy8PM, isCheckoutAfter8PM } from '../utils/time';
import { exportPDF, exportExcel } from '../utils/export';

interface Props {
  data: AppData;
  t: Translations;
  lang: Lang;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

function recordOvertimeSplit(r: TimeRecord, officialMins: number) {
  return splitOvertimeBy8PM(r.startTs, r.endTs, r.breakMins, r.overtimeMins, officialMins);
}

export default function ReportsPage({ data, t, lang, toast }: Props) {
  const [filterMonth, setFilterMonth] = useState(getMonthKey(Date.now()));
  const [filterWorker, setFilterWorker] = useState('all');
  const officialMins = (data.settings.officialHoursPerDay ?? 8) * 60;

  const months = useMemo(() => {
    const keys = [...new Set(data.records.map((r) => getMonthKey(r.dateTs)))].sort().reverse();
    const current = getMonthKey(Date.now());
    if (!keys.includes(current)) keys.unshift(current);
    return keys;
  }, [data.records]);

  const monthRecords = data.records.filter((r) => getMonthKey(r.dateTs) === filterMonth);

  const workerStats = data.workers.filter((w) => !w.isAdmin).map((w) => {
    const recs = monthRecords.filter((r) => r.workerId === w.id);
    const totalMins = recs.reduce((s, r) => s + r.workMins, 0);
    const overtimeMins = recs.reduce((s, r) => s + r.overtimeMins, 0);
    const avgMins = recs.length ? Math.round(totalMins / recs.length) : 0;
    const otSplit = recs.reduce((acc, r) => { const sp = recordOvertimeSplit(r, officialMins); return { before8: acc.before8 + sp.before8PM, after8: acc.after8 + sp.after8PM }; }, { before8: 0, after8: 0 });
    return { worker: w, recs, totalMins, overtimeMins, overtimeBefore8: otSplit.before8, overtimeAfter8: otSplit.after8, avgMins, days: recs.length };
  }).filter((ws) => filterWorker === 'all' || ws.worker.id === filterWorker);

  const handleExportPDF = () => exportPDF(workerStats, filterMonth, t, officialMins, (msg) => toast(msg, 'success'));
  const handleExportExcel = () => exportExcel(workerStats, filterMonth, lang, t, officialMins, (msg) => toast(msg, 'success'));

  const workerDisplayName = (w: { name: string; nameFr?: string }) => (lang === 'ar' ? w.name : (w.nameFr || w.name));
  const workerRole = (w: { role: string; roleFr?: string }) => (lang === 'ar' ? w.role : (w.roleFr || w.role));

  return (
    <div className="lux-dash">
      <div className="lux-dash-header">
        <div className="lux-dash-header-text">
          <h1 className="lux-dash-title"><i className="fas fa-chart-pie lux-dash-title-icon" />{t.reports}</h1>
          <p className="lux-dash-subtitle">{getMonthLabel(filterMonth, lang)}</p>
        </div>
        <div className="lux-dash-header-actions">
          <button className="lux-btn lux-btn-outline" onClick={handleExportExcel}><i className="fas fa-file-excel" /> {t.exportExcel}</button>
          <button className="lux-btn lux-btn-primary" onClick={handleExportPDF}><i className="fas fa-file-pdf" /> {t.exportPDF}</button>
        </div>
      </div>

      <div className="lux-dash-card" style={{ marginBottom: 24 }}>
        <div className="lux-dash-card-body">
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="lux-form-group" style={{ marginBottom: 0 }}>
              <label className="lux-form-label">{t.month}</label>
              <select className="lux-form-control" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{getMonthLabel(m, lang)}</option>)}
              </select>
            </div>
            <div className="lux-form-group" style={{ marginBottom: 0 }}>
              <label className="lux-form-label">{t.worker}</label>
              <select className="lux-form-control" value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}>
                <option value="all">{t.allWorkers}</option>
                {data.workers.filter((w) => !w.isAdmin).map((w) => <option key={w.id} value={w.id}>{workerDisplayName(w)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {workerStats.length === 0 ? (
        <div className="lux-dash-card"><div className="lux-dash-card-body"><div className="lux-empty"><div className="lux-empty-icon"><i className="fas fa-chart-bar" /></div><div className="lux-empty-title">{t.noRecords}</div></div></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {workerStats.map((ws) => (
            <div key={ws.worker.id} className="lux-dash-card">
              {/* Worker header */}
              <div className="lux-report-worker-header">
                <div className="lux-report-avatar" style={{ background: `linear-gradient(135deg, ${ws.worker.color}, ${ws.worker.color}88)` }}>
                  {workerDisplayName(ws.worker).charAt(0)}
                </div>
                <div className="lux-report-worker-info">
                  <div className="lux-report-worker-name">{workerDisplayName(ws.worker)}</div>
                  <div className="lux-report-worker-role">{workerRole(ws.worker)}</div>
                </div>
                <div className="lux-report-badges">
                  <span className="lux-badge lux-badge-gold">{ws.days} {lang === 'ar' ? 'يوم' : 'j'}</span>
                  <span className="lux-badge lux-badge-green">{minutesToHHMM(ws.totalMins, t)}</span>
                  {ws.overtimeBefore8 > 0 && <span className="lux-badge lux-badge-warn">+{minutesToHHMM(ws.overtimeBefore8, t)} · {lang === 'ar' ? 'قبل 20:00' : 'av. 20h'}</span>}
                  {ws.overtimeAfter8 > 0 && <span className="lux-badge lux-badge-red">+{minutesToHHMM(ws.overtimeAfter8, t)} · {lang === 'ar' ? 'بعد 20:00' : 'apr. 20h'}</span>}
                </div>
              </div>

              {/* Stats */}
              <div className="lux-dash-card-body">
                <div className="lux-dash-stats" style={{ marginBottom: 20 }}>
                  <div className="lux-stat-card" style={{ '--lux-stat-accent': '#D4AF37' } as React.CSSProperties}><div className="lux-stat-glow" /><div className="lux-stat-value lux-stat-gold" style={{ fontSize: 22 }}>{minutesToHHMM(ws.totalMins, t)}</div><div className="lux-stat-label">{t.totalHours}</div></div>
                  <div className="lux-stat-card" style={{ '--lux-stat-accent': '#F39C12' } as React.CSSProperties}><div className="lux-stat-glow" /><div className="lux-stat-value lux-stat-warn" style={{ fontSize: 22 }}>{minutesToHHMM(ws.overtimeBefore8, t)}</div><div className="lux-stat-label">{t.overtimeBefore8}</div></div>
                  <div className="lux-stat-card" style={{ '--lux-stat-accent': '#E67E22' } as React.CSSProperties}><div className="lux-stat-glow" /><div className="lux-stat-value" style={{ fontSize: 22, color: '#E67E22' }}>{minutesToHHMM(ws.overtimeAfter8, t)}</div><div className="lux-stat-label">{t.overtimeAfter8}</div></div>
                  <div className="lux-stat-card" style={{ '--lux-stat-accent': '#3498DB' } as React.CSSProperties}><div className="lux-stat-glow" /><div className="lux-stat-value" style={{ fontSize: 22, color: '#3498DB' }}>{minutesToHHMM(ws.avgMins, t)}</div><div className="lux-stat-label">{t.avgDailyHours}</div></div>
                </div>

                <div className="lux-table-wrap">
                  <table className="lux-table">
                    <thead><tr><th>{t.date}</th><th>{t.checkIn}</th><th>{t.checkOut}</th><th>{t.break}</th><th>{t.workHours}</th><th>{t.overtimeBefore8}</th><th>{t.overtimeAfter8}</th><th>{t.checkoutAfter8PM}</th><th>{lang === 'ar' ? 'توقيع' : 'Sig.'}</th><th>{t.notes}</th></tr></thead>
                    <tbody>
                      {ws.recs.sort((a, b) => a.dateTs - b.dateTs).map((r) => {
                        const sp = recordOvertimeSplit(r, officialMins);
                        const after8 = isCheckoutAfter8PM(r.endTs);
                        return (
                          <tr key={r.id} className="lux-table-row">
                            <td><span className="lux-table-date">{r.date}</span></td>
                            <td><span className="lux-badge lux-badge-green">{formatTime(r.startTs)}</span></td>
                            <td><span className="lux-badge lux-badge-red">{formatTime(r.endTs)}</span></td>
                            <td><span className="lux-table-muted">{r.breakMins}{t.min}</span></td>
                            <td><span className="lux-table-hours">{minutesToHHMM(r.workMins, t)}</span></td>
                            <td>{sp.before8PM > 0 ? <span className="lux-badge lux-badge-warn">+{minutesToHHMM(sp.before8PM, t)}</span> : <span className="lux-table-muted">—</span>}</td>
                            <td>{sp.after8PM > 0 ? <span className="lux-badge lux-badge-red">+{minutesToHHMM(sp.after8PM, t)}</span> : <span className="lux-table-muted">—</span>}</td>
                            <td style={{ textAlign: 'center' }}>{after8 ? <span className="lux-badge lux-badge-gold">✓ 20:00+</span> : <span className="lux-table-muted">—</span>}</td>
                            <td><span className="lux-table-muted">{r.workerSig ? '✍️' : '—'} {r.managerSig ? '👔' : ''}</span></td>
                            <td><span className="lux-table-muted">{r.notes || '—'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
