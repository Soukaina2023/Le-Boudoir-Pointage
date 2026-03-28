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

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">📊 {t.dashboard}</div>
          <div className="page-subtitle">{getMonthLabel(thisMonth, lang)}</div>
        </div>
      </div>

      <div className="stats-grid mb-6">
        <div className="stat-card">
          <span className="stat-icon">⏱</span>
          <div className="stat-value text-gold">{minutesToHHMM(myTodayRecord?.workMins ?? 0, t)}</div>
          <div className="stat-label">{t.todayHours}</div>
          <div className="stat-sub">
            {myTodayRecord ? `${formatTime(myTodayRecord.startTs)} - ${formatTime(myTodayRecord.endTs)}` : '--'}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {minutesToHHMM(myTodayRecord?.overtimeMins ?? 0, t)}
          </div>
          <div className="stat-label">{t.overtimeToday}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-value text-success">{minutesToHHMM(totalMonthMins, t)}</div>
          <div className="stat-label">{t.totalHours} ({t.thisMonth})</div>
          <div className="stat-sub">{myMonthRecords.length} {t.totalWorkingDays}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{minutesToHHMM(totalOvertimeMins, t)}</div>
          <div className="stat-label">{t.totalOvertime}</div>
        </div>
      </div>

      {currentWorker.isAdmin && (
        <div className="card mb-6">
          <div className="card-title">👥 {t.workers} — {t.thisMonth}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            {workerStats.map((ws) => {
              const pct = Math.min(100, (ws.totalMins / ((data.settings.officialHoursPerDay || 8) * 60 * 22)) * 100);
              return (
                <div key={ws.worker.id}>
                  <div className="flex-between" style={{ marginBottom: 6 }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: ws.worker.color }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{workerName(ws.worker)}</span>
                      <span className="badge badge-muted">{ws.days} {lang === 'ar' ? 'يوم' : 'jours'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gold font-bold">{minutesToHHMM(ws.totalMins, t)}</span>
                      {ws.overtimeMins > 0 && (
                        <span className="badge badge-warning">+{minutesToHHMM(ws.overtimeMins, t)}</span>
                      )}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: pct + '%', background: `linear-gradient(90deg, ${ws.worker.color}88, ${ws.worker.color})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">🕐 {lang === 'ar' ? 'آخر السجلات' : 'Derniers enregistrements'}</div>
        {data.records
          .filter((r) => (!currentWorker.isAdmin ? r.workerId === currentWorker.id : true))
          .slice(0, 8).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">{t.noRecords}</div>
            <div className="empty-desc">{t.noRecordsDesc}</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ marginTop: 12 }}>
            <table>
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
                {data.records
                  .filter((r) => (!currentWorker.isAdmin ? r.workerId === currentWorker.id : true))
                  .slice(0, 8)
                  .map((r) => (
                    <tr key={r.id}>
                      <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</span></td>
                      {currentWorker.isAdmin && (
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="color-dot" style={{ background: data.workers.find((w) => w.id === r.workerId)?.color || 'var(--gold)' }} />
                            {recordWorkerLabel(data, r.workerId, lang)}
                          </div>
                        </td>
                      )}
                      <td><span className="badge badge-success">{formatTime(r.startTs)}</span></td>
                      <td><span className="badge badge-danger">{formatTime(r.endTs)}</span></td>
                      <td><span className="font-bold text-gold">{minutesToHHMM(r.workMins, t)}</span></td>
                      <td>
                        {r.overtimeMins > 0
                          ? <span className="badge badge-warning">+{minutesToHHMM(r.overtimeMins, t)}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
