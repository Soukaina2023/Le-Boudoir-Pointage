import { useState, useMemo } from 'react';
import type { AppData, Translations, Lang, TimeRecord } from '../types';
import {
  formatTime,
  minutesToHHMM,
  getMonthKey,
  getMonthLabel,
  splitOvertimeBy8PM,
  isCheckoutAfter8PM,
} from '../utils/time';
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

  const workerStats = data.workers
    .filter((w) => !w.isAdmin)
    .map((w) => {
      const recs = monthRecords.filter((r) => r.workerId === w.id);
      const totalMins = recs.reduce((s, r) => s + r.workMins, 0);
      const overtimeMins = recs.reduce((s, r) => s + r.overtimeMins, 0);
      const avgMins = recs.length ? Math.round(totalMins / recs.length) : 0;
      const otSplit = recs.reduce(
        (acc, r) => {
          const sp = recordOvertimeSplit(r, officialMins);
          return { before8: acc.before8 + sp.before8PM, after8: acc.after8 + sp.after8PM };
        },
        { before8: 0, after8: 0 }
      );
      return {
        worker: w,
        recs,
        totalMins,
        overtimeMins,
        overtimeBefore8: otSplit.before8,
        overtimeAfter8: otSplit.after8,
        avgMins,
        days: recs.length,
      };
    })
    .filter((ws) => filterWorker === 'all' || ws.worker.id === filterWorker);

  const handleExportPDF = () =>
    exportPDF(workerStats, filterMonth, t, officialMins, (msg) => toast(msg, 'success'));
  const handleExportExcel = () =>
    exportExcel(workerStats, filterMonth, lang, t, officialMins, (msg) => toast(msg, 'success'));

  const workerDisplayName = (w: { name: string; nameFr?: string }) => (lang === 'ar' ? w.name : (w.nameFr || w.name));
  const workerRole = (w: { role: string; roleFr?: string }) => (lang === 'ar' ? w.role : (w.roleFr || w.role));

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">📊 {t.reports}</div>
          <div className="page-subtitle">{getMonthLabel(filterMonth, lang)}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={handleExportExcel}>
            📊 {t.exportExcel}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
            📄 {t.exportPDF}
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.month}</label>
            <select className="form-control" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {getMonthLabel(m, lang)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t.worker}</label>
            <select className="form-control" value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}>
              <option value="all">{t.allWorkers}</option>
              {data.workers.filter((w) => !w.isAdmin).map((w) => (
                <option key={w.id} value={w.id}>
                  {workerDisplayName(w)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {workerStats.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">{t.noRecords}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {workerStats.map((ws) => (
            <div key={ws.worker.id} className="worker-report-card">
              <div className="worker-report-header">
                <div
                  className="worker-card-avatar"
                  style={{
                    width: 42,
                    height: 42,
                    fontSize: 16,
                    background: `linear-gradient(135deg, ${ws.worker.color}, ${ws.worker.color}88)`,
                  }}
                >
                  {workerDisplayName(ws.worker).charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{workerDisplayName(ws.worker)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{workerRole(ws.worker)}</div>
                </div>
                <div style={{ marginRight: 'auto' }} />
                <div className="flex gap-2 flex-wrap">
                  <span className="badge badge-gold">
                    {ws.days} {lang === 'ar' ? 'يوم' : 'j'}
                  </span>
                  <span className="badge badge-success">{minutesToHHMM(ws.totalMins, t)}</span>
                  {ws.overtimeBefore8 > 0 && (
                    <span className="badge badge-warning" title={t.overtimeBefore8}>
                      +{minutesToHHMM(ws.overtimeBefore8, t)} · {lang === 'ar' ? 'قبل 20:00' : 'av. 20h'}
                    </span>
                  )}
                  {ws.overtimeAfter8 > 0 && (
                    <span className="badge badge-warning" style={{ borderColor: 'rgba(231,76,60,0.4)' }} title={t.overtimeAfter8}>
                      +{minutesToHHMM(ws.overtimeAfter8, t)} · {lang === 'ar' ? 'بعد 20:00' : 'apr. 20h'}
                    </span>
                  )}
                </div>
              </div>

              <div className="worker-report-body">
                <div className="grid-4" style={{ marginBottom: 20, gap: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                  <div className="stat-card" style={{ padding: 14 }}>
                    <div className="stat-value text-gold" style={{ fontSize: 22 }}>
                      {minutesToHHMM(ws.totalMins, t)}
                    </div>
                    <div className="stat-label">{t.totalHours}</div>
                  </div>
                  <div className="stat-card" style={{ padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 22, color: 'var(--warning)' }}>
                      {minutesToHHMM(ws.overtimeBefore8, t)}
                    </div>
                    <div className="stat-label">{t.overtimeBefore8}</div>
                  </div>
                  <div className="stat-card" style={{ padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 22, color: '#E67E22' }}>
                      {minutesToHHMM(ws.overtimeAfter8, t)}
                    </div>
                    <div className="stat-label">{t.overtimeAfter8}</div>
                  </div>
                  <div className="stat-card" style={{ padding: 14 }}>
                    <div className="stat-value" style={{ fontSize: 22, color: 'var(--info)' }}>
                      {minutesToHHMM(ws.avgMins, t)}
                    </div>
                    <div className="stat-label">{t.avgDailyHours}</div>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.date}</th>
                        <th>{t.checkIn}</th>
                        <th>{t.checkOut}</th>
                        <th>{t.break}</th>
                        <th>{t.workHours}</th>
                        <th>{t.overtimeBefore8}</th>
                        <th>{t.overtimeAfter8}</th>
                        <th>{t.checkoutAfter8PM}</th>
                        <th>{lang === 'ar' ? 'توقيع' : 'Sig.'}</th>
                        <th>{t.notes}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ws.recs
                        .sort((a, b) => a.dateTs - b.dateTs)
                        .map((r) => {
                          const sp = recordOvertimeSplit(r, officialMins);
                          const after8 = isCheckoutAfter8PM(r.endTs);
                          return (
                            <tr key={r.id}>
                              <td>
                                <span style={{ fontSize: 12 }}>{r.date}</span>
                              </td>
                              <td>
                                <span className="badge badge-success">{formatTime(r.startTs)}</span>
                              </td>
                              <td>
                                <span className="badge badge-danger">{formatTime(r.endTs)}</span>
                              </td>
                              <td>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  {r.breakMins}
                                  {t.min}
                                </span>
                              </td>
                              <td>
                                <strong className="text-gold">{minutesToHHMM(r.workMins, t)}</strong>
                              </td>
                              <td>
                                {sp.before8PM > 0 ? (
                                  <span className="badge badge-warning">+{minutesToHHMM(sp.before8PM, t)}</span>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                                )}
                              </td>
                              <td>
                                {sp.after8PM > 0 ? (
                                  <span className="badge badge-warning" style={{ borderColor: 'rgba(231,76,60,0.35)' }}>
                                    +{minutesToHHMM(sp.after8PM, t)}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {after8 ? (
                                  <span className="badge badge-info" title={t.checkoutAfter8PM}>
                                    ✓ 20:00+
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>
                                )}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                {r.workerSig ? '✍️' : '—'} {r.managerSig ? '👔' : ''}
                              </td>
                              <td>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.notes || '—'}</span>
                              </td>
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
