import type { AppData, Worker, Translations, Lang } from '../types';
import { formatTime, minutesToHHMM, getMonthKey, getMonthLabel, todayKey } from '../utils/time';
import { recordWorkerLabel } from '../utils/workerDisplay';

interface Props {
  data: AppData;
  currentWorker: Worker;
  t: Translations;
  lang: Lang;
}

export default function DashboardPage({ data, currentWorker, t, lang }: Props) {
  const today = todayKey();
  const thisMonth = getMonthKey(Date.now());

  const todayRecords = data.records.filter((r) => r.date === today);
  const monthRecords = data.records.filter((r) => getMonthKey(r.dateTs) === thisMonth);

  const myMonthRecords = monthRecords.filter((r) => r.workerId === currentWorker.id);
  const myTodayRecord = todayRecords.find((r) => r.workerId === currentWorker.id);

  const totalMonthMins = myMonthRecords.reduce((s, r) => s + r.workMins, 0);
  const totalOvertimeMins = myMonthRecords.reduce((s, r) => s + r.overtimeMins, 0);

  const workerStats = data.workers.filter((w) => !w.isAdmin).map((w) => {
    const recs = monthRecords.filter((r) => r.workerId === w.id);
    return {
      worker: w,
      days: recs.length,
      totalMins: recs.reduce((s, r) => s + r.workMins, 0),
      overtimeMins: recs.reduce((s, r) => s + r.overtimeMins, 0),
    };
  });

  const workerName = (w: Worker) => (lang === 'ar' ? w.name : (w.nameFr || w.name));

  const recentRecords = data.records
    .filter((r) => (!currentWorker.isAdmin ? r.workerId === currentWorker.id : true))
    .slice(0, 8);

  return (
    <div className="lux-dash">
      {/* Header */}
      <div className="lux-dash-header">
        <div className="lux-dash-header-text">
          <h1 className="lux-dash-title">
            <i className="fas fa-chart-line lux-dash-title-icon" />
            {t.dashboard}
          </h1>
          <p className="lux-dash-subtitle">{getMonthLabel(thisMonth, lang)}</p>
        </div>
        <div className="lux-dash-header-decoration">
          <span className="lux-dash-deco-line" />
          <i className="fas fa-gem lux-dash-deco-gem" />
          <span className="lux-dash-deco-line" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="lux-dash-stats">
        <div className="lux-stat-card" style={{ '--lux-stat-accent': '#D4AF37' } as React.CSSProperties}>
          <div className="lux-stat-glow" />
          <div className="lux-stat-icon-wrap">
            <i className="fas fa-clock" />
          </div>
          <div className="lux-stat-value lux-stat-gold">{minutesToHHMM(myTodayRecord?.workMins ?? 0, t)}</div>
          <div className="lux-stat-label">{t.todayHours}</div>
          <div className="lux-stat-sub">
            {myTodayRecord ? `${formatTime(myTodayRecord.startTs)} → ${formatTime(myTodayRecord.endTs)}` : '—'}
          </div>
        </div>

        <div className="lux-stat-card" style={{ '--lux-stat-accent': '#FF69B4' } as React.CSSProperties}>
          <div className="lux-stat-glow" />
          <div className="lux-stat-icon-wrap lux-stat-icon-pink">
            <i className="fas fa-fire" />
          </div>
          <div className="lux-stat-value lux-stat-pink">{minutesToHHMM(myTodayRecord?.overtimeMins ?? 0, t)}</div>
          <div className="lux-stat-label">{t.overtimeToday}</div>
        </div>

        <div className="lux-stat-card" style={{ '--lux-stat-accent': '#2ECC71' } as React.CSSProperties}>
          <div className="lux-stat-glow" />
          <div className="lux-stat-icon-wrap lux-stat-icon-green">
            <i className="fas fa-calendar-check" />
          </div>
          <div className="lux-stat-value lux-stat-green">{minutesToHHMM(totalMonthMins, t)}</div>
          <div className="lux-stat-label">{t.totalHours} ({t.thisMonth})</div>
          <div className="lux-stat-sub">{myMonthRecords.length} {t.totalWorkingDays}</div>
        </div>

        <div className="lux-stat-card" style={{ '--lux-stat-accent': '#F39C12' } as React.CSSProperties}>
          <div className="lux-stat-glow" />
          <div className="lux-stat-icon-wrap lux-stat-icon-warn">
            <i className="fas fa-trophy" />
          </div>
          <div className="lux-stat-value lux-stat-warn">{minutesToHHMM(totalOvertimeMins, t)}</div>
          <div className="lux-stat-label">{t.totalOvertime}</div>
        </div>
      </div>

      {/* Workers section (admin only) */}
      {currentWorker.isAdmin && (
        <div className="lux-dash-card lux-dash-card-delay-1">
          <div className="lux-dash-card-header">
            <div className="lux-dash-card-title">
              <i className="fas fa-users" />
              <span>{t.workers} — {t.thisMonth}</span>
            </div>
          </div>
          <div className="lux-dash-card-body">
            {workerStats.map((ws) => {
              const pct = Math.min(100, (ws.totalMins / ((data.settings.officialHoursPerDay || 8) * 60 * 22)) * 100);
              return (
                <div key={ws.worker.id} className="lux-worker-row">
                  <div className="lux-worker-row-top">
                    <div className="lux-worker-info">
                      <div className="lux-worker-dot" style={{ background: ws.worker.color, boxShadow: `0 0 8px ${ws.worker.color}60` }} />
                      <span className="lux-worker-name">{workerName(ws.worker)}</span>
                      <span className="lux-badge lux-badge-muted">{ws.days} {lang === 'ar' ? 'يوم' : 'jours'}</span>
                    </div>
                    <div className="lux-worker-hours">
                      <span className="lux-worker-total">{minutesToHHMM(ws.totalMins, t)}</span>
                      {ws.overtimeMins > 0 && (
                        <span className="lux-badge lux-badge-warn">+{minutesToHHMM(ws.overtimeMins, t)}</span>
                      )}
                    </div>
                  </div>
                  <div className="lux-progress">
                    <div
                      className="lux-progress-fill"
                      style={{
                        width: pct + '%',
                        background: `linear-gradient(90deg, ${ws.worker.color}66, ${ws.worker.color})`,
                        boxShadow: `0 0 12px ${ws.worker.color}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent records */}
      <div className="lux-dash-card lux-dash-card-delay-2">
        <div className="lux-dash-card-header">
          <div className="lux-dash-card-title">
            <i className="fas fa-history" />
            <span>{lang === 'ar' ? 'آخر السجلات' : 'Derniers enregistrements'}</span>
          </div>
        </div>
        <div className="lux-dash-card-body">
          {recentRecords.length === 0 ? (
            <div className="lux-empty">
              <div className="lux-empty-icon"><i className="fas fa-inbox" /></div>
              <div className="lux-empty-title">{t.noRecords}</div>
              <div className="lux-empty-desc">{t.noRecordsDesc}</div>
            </div>
          ) : (
            <div className="lux-table-wrap">
              <table className="lux-table">
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    {currentWorker.isAdmin && <th>{t.worker}</th>}
                    <th>{t.checkIn}</th>
                    <th>{t.checkOut}</th>
                    <th>{t.workHours}</th>
                    <th>{t.overtime}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((r, i) => (
                    <tr key={r.id} className="lux-table-row" style={{ animationDelay: `${0.05 * i}s` }}>
                      <td><span className="lux-table-date">{r.date}</span></td>
                      {currentWorker.isAdmin && (
                        <td>
                          <div className="lux-table-worker">
                            <div className="lux-worker-dot" style={{ background: data.workers.find((w) => w.id === r.workerId)?.color || '#D4AF37' }} />
                            {recordWorkerLabel(data, r.workerId, lang)}
                          </div>
                        </td>
                      )}
                      <td><span className="lux-badge lux-badge-green">{formatTime(r.startTs)}</span></td>
                      <td><span className="lux-badge lux-badge-red">{formatTime(r.endTs)}</span></td>
                      <td><span className="lux-table-hours">{minutesToHHMM(r.workMins, t)}</span></td>
                      <td>
                        {r.overtimeMins > 0
                          ? <span className="lux-badge lux-badge-warn">+{minutesToHHMM(r.overtimeMins, t)}</span>
                          : <span className="lux-table-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
