import { useState, useMemo } from 'react';
import type { AppData, Worker, Translations, Lang, TimeRecord } from '../types';
import { saveData } from '../utils/storage';
import { formatTime, minutesToHHMM, getMonthKey, getMonthLabel, calcWorkMinutes, parseTimeToTs } from '../utils/time';
import { recordWorkerLabel } from '../utils/workerDisplay';
import Modal from '../components/Modal';
import SignaturePad from '../components/SignaturePad';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentWorker: Worker;
  t: Translations;
  lang: Lang;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface EditForm {
  startTime: string;
  endTime: string;
  breakMins: string;
  notes: string;
  workerSig: boolean;
  managerSig: boolean;
}

export default function RecordsPage({ data, setData, currentWorker, t, lang, toast }: Props) {
  const [filterWorker, setFilterWorker] = useState(currentWorker.isAdmin ? 'all' : currentWorker.id);
  const [filterMonth, setFilterMonth] = useState(getMonthKey(Date.now()));
  const [editRecord, setEditRecord] = useState<TimeRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ startTime: '', endTime: '', breakMins: '0', notes: '', workerSig: false, managerSig: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const months = useMemo(() => {
    const keys = [...new Set(data.records.map((r) => getMonthKey(r.dateTs)))].sort().reverse();
    const current = getMonthKey(Date.now());
    if (!keys.includes(current)) keys.unshift(current);
    return keys;
  }, [data.records]);

  const filtered = data.records
    .filter((r) => {
      const mOk = !filterMonth || getMonthKey(r.dateTs) === filterMonth;
      const wOk = filterWorker === 'all' || r.workerId === filterWorker;
      return mOk && wOk;
    })
    .sort((a, b) => b.dateTs - a.dateTs);

  const totalMins = filtered.reduce((s, r) => s + r.workMins, 0);
  const totalOT = filtered.reduce((s, r) => s + r.overtimeMins, 0);

  const handleEdit = (r: TimeRecord) => {
    setEditRecord(r);
    const start = new Date(r.startTs);
    const end = new Date(r.endTs);
    setEditForm({
      startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      breakMins: String(r.breakMins), notes: r.notes || '', workerSig: r.workerSig || false, managerSig: r.managerSig || false,
    });
  };

  const handleSaveEdit = () => {
    if (!editRecord) return;
    if (!editForm.startTime || !editForm.endTime) { toast(t.errorFillFields, 'error'); return; }
    const base = new Date(editRecord.dateTs);
    const startTs = parseTimeToTs(editForm.startTime, base);
    const endTs = parseTimeToTs(editForm.endTime, base);
    if (endTs <= startTs) { toast(t.errorEndBeforeStart, 'error'); return; }
    const breakMins = parseInt(editForm.breakMins) || 0;
    const workMins = calcWorkMinutes(startTs, endTs, breakMins);
    const officialMins = (data.settings.officialHoursPerDay || 8) * 60;
    const overtimeMins = Math.max(0, workMins - officialMins);
    const editEntry = { ts: Date.now(), actor: currentWorker.name, oldStart: editRecord.startTs, oldEnd: editRecord.endTs, newStart: startTs, newEnd: endTs };
    setData((prev) => {
      const nd = {
        ...prev,
        records: prev.records.map((r) => r.id === editRecord.id ? { ...r, startTs, endTs, breakMins, workMins, overtimeMins, notes: editForm.notes, workerSig: editForm.workerSig, managerSig: editForm.managerSig, auditEdits: [...(r.auditEdits || []), editEntry] } : r),
        auditLog: [{ ts: Date.now(), actor: currentWorker.name, action: `${t.edit}: ${editRecord.date} (${recordWorkerLabel(data, editRecord.workerId, lang)})` }, ...prev.auditLog].slice(0, 200),
      };
      saveData(nd); return nd;
    });
    toast(t.updatedSuccess, 'success');
    setEditRecord(null);
  };

  const handleDelete = (id: string) => {
    setData((prev) => {
      const rec = prev.records.find((r) => r.id === id);
      const nd = {
        ...prev, records: prev.records.filter((r) => r.id !== id),
        auditLog: [{ ts: Date.now(), actor: currentWorker.name, action: `${t.delete}: ${rec?.date} (${rec ? recordWorkerLabel(data, rec.workerId, lang) : ''})` }, ...prev.auditLog].slice(0, 200),
      };
      saveData(nd); return nd;
    });
    toast(t.deletedSuccess, 'warning');
    setDeleteConfirm(null);
  };

  const workerName = (w: { name: string; nameFr?: string }) => (lang === 'ar' ? w.name : (w.nameFr || w.name));

  return (
    <div className="lux-dash">
      <div className="lux-dash-header">
        <div className="lux-dash-header-text">
          <h1 className="lux-dash-title"><i className="fas fa-clock-rotate-left lux-dash-title-icon" />{t.history}</h1>
          <p className="lux-dash-subtitle">{filtered.length} {t.totalRecords}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="lux-dash-card" style={{ marginBottom: 24 }}>
        <div className="lux-dash-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: currentWorker.isAdmin ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr', gap: 12 }}>
            <div className="lux-form-group" style={{ marginBottom: 0 }}>
              <label className="lux-form-label">{t.filterMonth}</label>
              <select className="lux-form-control" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{getMonthLabel(m, lang)}</option>)}
              </select>
            </div>
            {currentWorker.isAdmin && (
              <div className="lux-form-group" style={{ marginBottom: 0 }}>
                <label className="lux-form-label">{t.worker}</label>
                <select className="lux-form-control" value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}>
                  <option value="all">{t.allWorkers}</option>
                  {data.workers.filter((w) => !w.isAdmin).map((w) => <option key={w.id} value={w.id}>{workerName(w)}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary badges */}
      {filtered.length > 0 && (
        <div className="lux-summary-row">
          <div className="lux-badge lux-badge-gold"><i className="fas fa-clock" style={{ marginInlineEnd: 6 }} />{lang === 'ar' ? 'المجموع' : 'Total'}: <strong>{minutesToHHMM(totalMins, t)}</strong></div>
          <div className="lux-badge lux-badge-warn"><i className="fas fa-fire" style={{ marginInlineEnd: 6 }} />{t.overtime}: <strong>{minutesToHHMM(totalOT, t)}</strong></div>
          <div className="lux-badge lux-badge-muted"><i className="fas fa-calendar" style={{ marginInlineEnd: 6 }} />{filtered.length} {lang === 'ar' ? 'سجل' : 'enregistrements'}</div>
        </div>
      )}

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="lux-dash-card">
          <div className="lux-dash-card-body">
            <div className="lux-empty"><div className="lux-empty-icon"><i className="fas fa-inbox" /></div><div className="lux-empty-title">{t.noRecords}</div><div className="lux-empty-desc">{t.noRecordsDesc}</div></div>
          </div>
        </div>
      ) : (
        <div className="lux-dash-card">
          <div className="lux-dash-card-body" style={{ padding: 0 }}>
            <div className="lux-table-wrap">
              <table className="lux-table">
                <thead><tr>
                  <th>{t.date}</th>
                  {currentWorker.isAdmin && <th>{t.worker}</th>}
                  <th>{t.checkIn}</th><th>{t.checkOut}</th><th>{t.break}</th><th>{t.workHours}</th><th>{t.overtime}</th><th>{t.notes}</th><th>{lang === 'ar' ? 'توقيع' : 'Sig.'}</th>
                </tr></thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="lux-table-row" style={{ animationDelay: `${0.03 * i}s` }}>
                      <td>
                        <div className="lux-table-date">{r.date}</div>
                        {r.specialMode && r.specialMode !== 'normal' && (
                          <span className="lux-badge lux-badge-muted" style={{ fontSize: 9, marginTop: 2 }}>{r.specialMode === 'ramadan' ? '🌙' : '☀️'} {t[r.specialMode]}</span>
                        )}
                      </td>
                      {currentWorker.isAdmin && (
                        <td><div className="lux-table-worker"><div className="lux-worker-dot" style={{ background: data.workers.find((w) => w.id === r.workerId)?.color || '#D4AF37' }} />{recordWorkerLabel(data, r.workerId, lang)}</div></td>
                      )}
                      <td><span className="lux-badge lux-badge-green">{formatTime(r.startTs)}</span></td>
                      <td><span className="lux-badge lux-badge-red">{formatTime(r.endTs)}</span></td>
                      <td><span className="lux-table-muted">{r.breakMins} {t.min}</span></td>
                      <td><span className="lux-table-hours">{minutesToHHMM(r.workMins, t)}</span></td>
                      <td>{r.overtimeMins > 0 ? <span className="lux-badge lux-badge-warn">+{minutesToHHMM(r.overtimeMins, t)}</span> : <span className="lux-table-muted">—</span>}</td>
                      <td><span className="lux-table-muted" style={{ maxWidth: 100, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes || '—'}</span></td>
                      <td><span>{r.workerSig ? '✍️' : '—'} {r.managerSig ? '👔' : ''}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editRecord && (
        <Modal title={`${t.editRecord} — ${editRecord.date}`} onClose={() => setEditRecord(null)} footer={<><button className="lux-btn lux-btn-ghost" onClick={() => setEditRecord(null)}>{t.cancel}</button><button className="lux-btn lux-btn-primary" onClick={handleSaveEdit}>{t.save}</button></>}>
          {(editRecord.auditEdits?.length ?? 0) > 0 && <div className="alert alert-info" style={{ marginBottom: 16 }}>ℹ️ {lang === 'ar' ? `عُدّل ${editRecord.auditEdits.length} مرة` : `Modifié ${editRecord.auditEdits.length} fois`}</div>}
          <div className="grid-2"><div className="lux-form-group"><label className="lux-form-label">{t.workStart}</label><input type="time" className="lux-form-control" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} /></div><div className="lux-form-group"><label className="lux-form-label">{t.workEnd}</label><input type="time" className="lux-form-control" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} /></div></div>
          <div className="lux-form-group"><label className="lux-form-label">{t.breakDuration}</label><input type="number" className="lux-form-control" value={editForm.breakMins} min="0" onChange={(e) => setEditForm({ ...editForm, breakMins: e.target.value })} /></div>
          <div className="lux-form-group"><label className="lux-form-label">{t.notes}</label><textarea className="lux-form-control" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          <div className="grid-2">
            <div><div className="lux-form-label" style={{ marginBottom: 8 }}>{t.workerSignature}</div><SignaturePad signed={editForm.workerSig} label={t.signHere} signedLabel={t.signedWorker} color="var(--success)" onToggle={() => setEditForm({ ...editForm, workerSig: !editForm.workerSig })} /></div>
            <div><div className="lux-form-label" style={{ marginBottom: 8 }}>{t.managerSignature}</div><SignaturePad signed={editForm.managerSig} label={t.signHere} signedLabel={t.signedManager} icon="👔" color="var(--info)" onToggle={() => setEditForm({ ...editForm, managerSig: !editForm.managerSig })} /></div>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)} maxWidth={380} footer={<><button className="lux-btn lux-btn-ghost" onClick={() => setDeleteConfirm(null)}>{t.cancel}</button><button className="lux-btn lux-btn-danger" onClick={() => handleDelete(deleteConfirm)}>{t.delete}</button></>}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}><i className="fas fa-triangle-exclamation" style={{ color: '#F39C12' }} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>{t.deleteConfirm}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{lang === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء' : 'Cette action est irréversible'}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
