import { useState, useEffect, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AppData, Worker, Translations, Lang, SpecialMode, ActiveSession, TimeRecord } from '../types';
import { formatTime, formatDate, minutesToHHMM, minutesToDisplay, formatDurationHMS, parseTimeToTs, calcWorkMinutes } from '../utils/time';
import LiveClock from '../components/LiveClock';
import Modal from '../components/Modal';
import SignaturePad from '../components/SignaturePad';
import {
  fetchActiveSession,
  fetchTodayTimeRecord,
  fetchOfficialHoursPerDay,
  resolveOrganizationId,
  startWork,
  breakStart,
  breakEnd,
  endWorkSession,
  insertManualTimeRecord,
} from '../lib/timeTrackingApi';
import { isDemoMode } from '../lib/supabase';
import { loadData } from '../utils/storage';

interface Props {
  data: AppData;
  setData?: Dispatch<SetStateAction<AppData>>;
  currentWorker: Worker;
  t: Translations;
  lang: Lang;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ManualForm {
  startTime: string;
  endTime: string;
  breakMins: string;
  notes: string;
  specialMode: SpecialMode;
  workerSig: boolean;
  managerSig: boolean;
}

const DEFAULT_FORM: ManualForm = {
  startTime: '00:00',
  endTime: '',
  breakMins: '0',
  notes: '',
  specialMode: 'normal',
  workerSig: false,
  managerSig: false,
};

export default function TimeTrackingPage({ data, setData, currentWorker, t, lang, toast }: Props) {
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState<ManualForm>(DEFAULT_FORM);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [pointageWorkerId, setPointageWorkerId] = useState('');
  const [session, setSession] = useState<Partial<ActiveSession>>({});
  const [todayRecord, setTodayRecord] = useState<TimeRecord | null>(null);
  const [officialHoursPerDay, setOfficialHoursPerDay] = useState(data.settings.officialHoursPerDay);

  const staffWorkers = useMemo(() => data.workers.filter((w) => !w.isAdmin), [data.workers]);

  useEffect(() => {
    if (!currentWorker.isAdmin) return;
    setPointageWorkerId((prev) => {
      if (!staffWorkers.length) return '';
      if (prev && staffWorkers.some((w) => w.id === prev)) return prev;
      return staffWorkers[0].id;
    });
  }, [currentWorker.isAdmin, staffWorkers]);

  const targetId = currentWorker.isAdmin ? pointageWorkerId : currentWorker.id;
  const targetWorker = data.workers.find((w) => w.id === targetId);
  const status = session.status ?? 'idle';

  const workerDisplay = (w: Worker) => (lang === 'ar' ? w.name : (w.nameFr || w.name));
  const punchReady = Boolean(targetId && targetWorker);

  const syncAppFromStorage = useCallback(() => {
    if (!isDemoMode || !setData) return;
    const d = loadData();
    if (d) setData(d);
  }, [setData]);

  const refreshTracking = useCallback(async () => {
    if (!targetId) return;
    try {
      const [s, tr, oh] = await Promise.all([
        fetchActiveSession(targetId),
        fetchTodayTimeRecord(targetId),
        fetchOfficialHoursPerDay(),
      ]);
      setSession(s);
      setTodayRecord(tr);
      if (oh != null) setOfficialHoursPerDay(oh);
    } catch (e) {
      console.error(e);
      toast(t.errorFillFields, 'error');
    }
  }, [targetId, t.errorFillFields, toast]);

  useEffect(() => {
    void refreshTracking();
  }, [refreshTracking]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (session.startTs && status === 'working') {
        const breakSoFar = session.totalBreakMins ?? 0;
        setLiveElapsed(Math.max(0, (Date.now() - session.startTs) / 60000 - breakSoFar));
      }
      if (session.breakStartTs && status === 'break') {
        setBreakElapsed(Math.max(0, (Date.now() - session.breakStartTs) / 60000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, status]);

  const handleStart = async () => {
    if (!punchReady || !targetWorker) { toast(t.errorFillFields, 'error'); return; }
    if (status === 'working') { toast(t.alreadyStarted, 'warning'); return; }
    if (status === 'done') { toast(t.alreadyEnded, 'warning'); return; }
    try {
      const orgId = await resolveOrganizationId(targetWorker.id);
      await startWork(targetWorker.id, orgId, session.specialMode ?? 'normal');
      await refreshTracking();
      syncAppFromStorage();
      toast(t.startWork + ' ✓', 'success');
    } catch (e) { console.error(e); toast(t.errorFillFields, 'error'); }
  };

  const handleEnd = async () => {
    if (!punchReady || !targetWorker) { toast(t.errorFillFields, 'error'); return; }
    if (status === 'idle') { toast(t.notStarted, 'warning'); return; }
    if (status === 'break') { toast(t.notOnBreak + ' - ' + t.endBreak + ' أولاً', 'warning'); return; }
    if (status === 'done') { toast(t.alreadyEnded, 'warning'); return; }
    try {
      const endTs = Date.now();
      const totalBreak = session.totalBreakMins ?? 0;
      const workMins = calcWorkMinutes(session.startTs!, endTs, totalBreak);
      const orgId = await resolveOrganizationId(targetWorker.id);
      await endWorkSession({ workerId: targetWorker.id, workerName: targetWorker.name, organizationId: orgId, session, officialHoursPerDay });
      await refreshTracking();
      syncAppFromStorage();
      toast(t.endWork + ' - ' + minutesToDisplay(workMins, t), 'success');
    } catch (e) { console.error(e); toast(t.errorFillFields, 'error'); }
  };

  const handleBreakStart = async () => {
    if (!punchReady || !targetWorker) { toast(t.errorFillFields, 'error'); return; }
    if (status !== 'working') { toast(t.notStarted, 'warning'); return; }
    try {
      await breakStart(targetWorker.id);
      await refreshTracking();
      syncAppFromStorage();
      toast(t.startBreak + ' ✓', 'warning');
    } catch (e) { console.error(e); toast(t.errorFillFields, 'error'); }
  };

  const handleBreakEnd = async () => {
    if (!punchReady || !targetWorker) { toast(t.errorFillFields, 'error'); return; }
    if (status !== 'break' || session.breakStartTs == null) { toast(t.notOnBreak, 'warning'); return; }
    try {
      const breakMins = Math.round((Date.now() - session.breakStartTs) / 60000);
      await breakEnd(targetWorker.id, session.breakStartTs, session.totalBreakMins ?? 0);
      await refreshTracking();
      syncAppFromStorage();
      toast(t.endBreak + ` (${breakMins} ${t.mins})`, 'info');
    } catch (e) { console.error(e); toast(t.errorFillFields, 'error'); }
  };

  const handleManualSave = async () => {
    if (!form.startTime || !form.endTime) { toast(t.errorFillFields, 'error'); return; }
    const today = new Date();
    const startTs = parseTimeToTs(form.startTime, today);
    const endTs = parseTimeToTs(form.endTime, today);
    if (endTs <= startTs) { toast(t.errorEndBeforeStart, 'error'); return; }
    const breakMins = parseInt(form.breakMins, 10) || 0;
    try {
      const orgId = await resolveOrganizationId(currentWorker.id);
      await insertManualTimeRecord({ workerId: currentWorker.id, workerName: currentWorker.name, organizationId: orgId, startTs, endTs, breakMins, notes: form.notes, specialMode: form.specialMode, workerSig: form.workerSig, managerSig: form.managerSig, officialHoursPerDay });
      await refreshTracking();
      syncAppFromStorage();
      toast(t.savedSuccess, 'success');
      setManualOpen(false);
      setForm(DEFAULT_FORM);
    } catch (e) { console.error(e); toast(t.errorFillFields, 'error'); }
  };

  const officialMins = officialHoursPerDay * 60;
  let progressPct = 0;
  if (status === 'working') {
    progressPct = Math.min(100, (liveElapsed / officialMins) * 100);
  } else if (todayRecord) {
    progressPct = Math.min(100, (todayRecord.workMins / officialMins) * 100);
  }

  const specialModes: SpecialMode[] = ['normal', 'ramadan', 'halfDay'];
  const specialModeLabel = (m: SpecialMode) =>
    m === 'normal' ? `🕐 ${t.normal}` : m === 'ramadan' ? `🌙 ${t.ramadan}` : `☀️ ${t.halfDay}`;

  return (
    <div className="lux-dash">
      {/* Header */}
      <div className="lux-dash-header">
        <div className="lux-dash-header-text">
          <h1 className="lux-dash-title">
            <i className="fas fa-stopwatch lux-dash-title-icon" />
            {t.timeTracking}
          </h1>
          <p className="lux-dash-subtitle">
            {formatDate(Date.now(), lang)} —{' '}
            {currentWorker.isAdmin && targetWorker
              ? workerDisplay(targetWorker)
              : lang === 'ar' ? currentWorker.name : (currentWorker.nameFr || currentWorker.name)}
          </p>
          {currentWorker.isAdmin && (
            <p className="lux-dash-subtitle" style={{ marginTop: 4, opacity: 0.6, fontSize: 12 }}>
              {t.managerPointageHint}
            </p>
          )}
        </div>
        <div className="lux-dash-header-actions">
          {!currentWorker.isAdmin && (
            <button className="lux-btn lux-btn-outline" onClick={() => { setForm(DEFAULT_FORM); setManualOpen(true); }}>
              <i className="fas fa-pen" /> {t.manualEntry}
            </button>
          )}
        </div>
      </div>

      {/* Worker selector (admin) */}
      {currentWorker.isAdmin && (
        <div className="lux-dash-card" style={{ marginBottom: 24 }}>
          <div className="lux-dash-card-body">
            <div className="lux-form-group">
              <label className="lux-form-label">{t.worker}</label>
              <select className="lux-form-control" value={pointageWorkerId} onChange={(e) => setPointageWorkerId(e.target.value)} disabled={!staffWorkers.length}>
                {staffWorkers.map((w) => (
                  <option key={w.id} value={w.id}>{workerDisplay(w)} — {lang === 'ar' ? w.role : (w.roleFr || w.role)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Timer card */}
      <div className="lux-dash-card" style={{ marginBottom: 24 }}>
        <div className="lux-timer-display">
          <LiveClock />
          <div className="lux-timer-date">
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="lux-timer-status-wrap">
            <span className={`lux-timer-status lux-status-${status}`}>
              <span className="lux-status-dot" />
              {status === 'working' ? t.working : status === 'break' ? t.onBreak : status === 'done' ? t.done : t.idle}
            </span>
          </div>

          {status === 'working' && (
            <div className="lux-timer-elapsed">
              <i className="fas fa-hourglass-half" /> {formatDurationHMS(liveElapsed)} {lang === 'ar' ? 'منذ البداية' : 'depuis le début'}
            </div>
          )}
          {status === 'break' && (
            <div className="lux-timer-elapsed lux-timer-break-elapsed">
              <i className="fas fa-mug-hot" /> {formatDurationHMS(breakElapsed)} {lang === 'ar' ? 'في الاستراحة' : 'en pause'}
            </div>
          )}
        </div>

        <div className="lux-progress-section">
          <div className="lux-progress-header">
            <span>{t.performance}</span>
            <span className={progressPct >= 100 ? 'lux-stat-warn' : 'lux-stat-gold'}>
              {Math.round(progressPct)}% {t.of} {officialHoursPerDay}{t.hr}
            </span>
          </div>
          <div className="lux-progress">
            <div
              className="lux-progress-fill"
              style={{
                width: progressPct + '%',
                background: progressPct >= 100
                  ? 'linear-gradient(90deg, #F39C12, #E67E22)'
                  : 'linear-gradient(90deg, var(--login-gold-dark), var(--login-gold-primary))',
                boxShadow: progressPct >= 100 ? '0 0 12px rgba(243,156,18,0.4)' : '0 0 12px rgba(212,175,55,0.3)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="lux-dash-card" style={{ marginBottom: 24 }}>
        <div className="lux-dash-card-body">
          <div className="lux-action-grid">
            <button className="lux-action-btn lux-action-start" onClick={() => void handleStart()} disabled={!punchReady || status === 'working' || status === 'break' || status === 'done'}>
              <i className="fas fa-play" />
              <span>{t.startWork}</span>
            </button>
            <button className="lux-action-btn lux-action-stop" onClick={() => void handleEnd()} disabled={!punchReady || status === 'idle' || status === 'done'}>
              <i className="fas fa-stop" />
              <span>{t.endWork}</span>
            </button>
            <button className="lux-action-btn lux-action-break" onClick={() => void handleBreakStart()} disabled={!punchReady || status !== 'working'}>
              <i className="fas fa-mug-hot" />
              <span>{t.startBreak}</span>
            </button>
            <button className="lux-action-btn lux-action-resume" onClick={() => void handleBreakEnd()} disabled={!punchReady || status !== 'break'}>
              <i className="fas fa-forward" />
              <span>{t.endBreak}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today record recap */}
      {todayRecord && (
        <div className="lux-dash-card">
          <div className="lux-dash-card-header">
            <div className="lux-dash-card-title"><i className="fas fa-receipt" /> <span>{lang === 'ar' ? 'سجل اليوم' : 'Récap du jour'}</span></div>
          </div>
          <div className="lux-dash-card-body">
            <div className="lux-dash-stats" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <div className="lux-stat-card" style={{ '--lux-stat-accent': '#D4AF37' } as React.CSSProperties}>
                <div className="lux-stat-glow" />
                <div className="lux-stat-icon-wrap"><i className="fas fa-right-to-bracket" /></div>
                <div className="lux-stat-value lux-stat-gold">{formatTime(todayRecord.startTs)}</div>
                <div className="lux-stat-label">{t.checkIn}</div>
              </div>
              <div className="lux-stat-card" style={{ '--lux-stat-accent': '#E74C3C' } as React.CSSProperties}>
                <div className="lux-stat-glow" />
                <div className="lux-stat-icon-wrap lux-stat-icon-pink"><i className="fas fa-right-from-bracket" /></div>
                <div className="lux-stat-value lux-stat-pink">{formatTime(todayRecord.endTs)}</div>
                <div className="lux-stat-label">{t.checkOut}</div>
              </div>
              <div className="lux-stat-card" style={{ '--lux-stat-accent': '#2ECC71' } as React.CSSProperties}>
                <div className="lux-stat-glow" />
                <div className="lux-stat-icon-wrap lux-stat-icon-green"><i className="fas fa-business-time" /></div>
                <div className="lux-stat-value lux-stat-green">{minutesToHHMM(todayRecord.workMins, t)}</div>
                <div className="lux-stat-label">{t.workHours}</div>
              </div>
              <div className="lux-stat-card" style={{ '--lux-stat-accent': '#F39C12' } as React.CSSProperties}>
                <div className="lux-stat-glow" />
                <div className="lux-stat-icon-wrap lux-stat-icon-warn"><i className="fas fa-fire" /></div>
                <div className="lux-stat-value lux-stat-warn">{todayRecord.overtimeMins > 0 ? minutesToHHMM(todayRecord.overtimeMins, t) : minutesToHHMM(0, t)}</div>
                <div className="lux-stat-label">{t.overtime}</div>
              </div>
            </div>
            {todayRecord.breakMins > 0 && (
              <div className="lux-stat-sub" style={{ marginTop: 12 }}>
                <i className="fas fa-mug-hot" style={{ marginInlineEnd: 6 }} /> {todayRecord.breakMins} {t.mins_break}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual entry modal */}
      {!currentWorker.isAdmin && manualOpen && (
        <Modal
          title={`${t.manualEntry}`}
          onClose={() => setManualOpen(false)}
          footer={
            <>
              <button className="lux-btn lux-btn-ghost" onClick={() => setManualOpen(false)}>{t.cancel}</button>
              <button className="lux-btn lux-btn-primary" onClick={() => void handleManualSave()}>{t.save}</button>
            </>
          }
        >
          <div className="grid-2">
            <div className="lux-form-group"><label className="lux-form-label">{t.workStart}</label><input type="time" className="lux-form-control" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
            <div className="lux-form-group"><label className="lux-form-label">{t.workEnd}</label><input type="time" className="lux-form-control" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
          </div>
          <div className="lux-form-group"><label className="lux-form-label">{t.breakDuration}</label><input type="number" className="lux-form-control" value={form.breakMins} min="0" max="480" onChange={(e) => setForm({ ...form, breakMins: e.target.value })} /></div>
          <div className="lux-form-group">
            <label className="lux-form-label">{t.specialMode}</label>
            <div className="special-mode-selector">
              {specialModes.map((m) => (
                <div key={m} className={`mode-chip ${form.specialMode === m ? 'active' : ''}`} onClick={() => setForm({ ...form, specialMode: m })}>{specialModeLabel(m)}</div>
              ))}
            </div>
          </div>
          <div className="lux-form-group"><label className="lux-form-label">{t.notes}</label><textarea className="lux-form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="..." /></div>
          <div className="grid-2">
            <div><div className="lux-form-label" style={{ marginBottom: 8 }}>{t.workerSignature}</div><SignaturePad signed={form.workerSig} label={t.signHere} signedLabel={t.signedWorker} color="var(--success)" onToggle={() => setForm({ ...form, workerSig: !form.workerSig })} /></div>
            <div><div className="lux-form-label" style={{ marginBottom: 8 }}>{t.managerSignature}</div><SignaturePad signed={form.managerSig} label={t.signHere} signedLabel={t.signedManager} icon="👔" color="var(--info)" onToggle={() => setForm({ ...form, managerSig: !form.managerSig })} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
