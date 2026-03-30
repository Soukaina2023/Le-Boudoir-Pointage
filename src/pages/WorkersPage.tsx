import { useState } from 'react';
import type { AppData, Worker, Translations, Lang } from '../types';
import { saveData } from '../utils/storage';
import { minutesToHHMM, getMonthKey } from '../utils/time';
import Modal from '../components/Modal';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentWorker: Worker;
  t: Translations;
  lang: Lang;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface WorkerForm { name: string; nameFr: string; role: string; roleFr: string; pin: string; color: string; }

const DEFAULT_FORM: WorkerForm = { name: '', nameFr: '', role: 'حلاق', roleFr: 'Coiffeur', pin: '', color: '#3498DB' };
const COLORS = ['#C9A84C', '#3498DB', '#E74C3C', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C', '#E91E63'];

function WorkerFormFields({ form, setForm, t }: { form: WorkerForm; setForm: React.Dispatch<React.SetStateAction<WorkerForm>>; t: Translations }) {
  return (
    <>
      <div className="grid-2">
        <div className="lux-form-group"><label className="lux-form-label">{t.workerName} (AR)</label><input className="lux-form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: كريم" /></div>
        <div className="lux-form-group"><label className="lux-form-label">{t.workerName} (FR)</label><input className="lux-form-control" value={form.nameFr} onChange={(e) => setForm({ ...form, nameFr: e.target.value })} placeholder="Karim" /></div>
      </div>
      <div className="grid-2">
        <div className="lux-form-group"><label className="lux-form-label">{t.workerRole} (AR)</label><input className="lux-form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
        <div className="lux-form-group"><label className="lux-form-label">{t.workerRole} (FR)</label><input className="lux-form-control" value={form.roleFr} onChange={(e) => setForm({ ...form, roleFr: e.target.value })} /></div>
      </div>
      <div className="lux-form-group"><label className="lux-form-label">{t.workerPin}</label><input type="password" className="lux-form-control" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder="••••" maxLength={6} /></div>
      <div className="lux-form-group">
        <label className="lux-form-label">{t.workerColor}</label>
        <div className="lux-color-picker">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`lux-color-swatch ${form.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function WorkersPage({ data, setData, currentWorker, t, lang, toast }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<WorkerForm>(DEFAULT_FORM);

  if (!currentWorker.isAdmin) return null;

  const openAdd = () => { setEditingWorker(null); setForm(DEFAULT_FORM); setShowAdd(true); };
  const openEdit = (w: Worker) => { setShowAdd(false); setEditingWorker(w); setForm({ name: w.name, nameFr: w.nameFr ?? '', role: w.role, roleFr: w.roleFr ?? '', pin: w.pin, color: w.color }); };

  const handleAdd = () => {
    if (!form.name) { toast(t.errorFillFields, 'error'); return; }
    const newWorker: Worker = { id: 'w' + Date.now(), ...form, isAdmin: false };
    setData((prev) => { const nd = { ...prev, workers: [...prev.workers, newWorker] }; saveData(nd); return nd; });
    toast(t.workerAdded, 'success'); setShowAdd(false); setForm(DEFAULT_FORM);
  };

  const handleSaveEdit = () => {
    if (!editingWorker) return;
    if (!form.name) { toast(t.errorFillFields, 'error'); return; }
    setData((prev) => {
      const nd = { ...prev, workers: prev.workers.map((w) => w.id === editingWorker.id ? { ...w, name: form.name, nameFr: form.nameFr, role: form.role, roleFr: form.roleFr, pin: form.pin, color: form.color } : w), records: prev.records.map((r) => r.workerId === editingWorker.id ? { ...r, workerName: form.name } : r), auditLog: [{ ts: Date.now(), actor: currentWorker.name, action: `${t.editWorker}: ${form.name}` }, ...prev.auditLog].slice(0, 200) };
      saveData(nd); return nd;
    });
    toast(t.updatedSuccess, 'success'); setEditingWorker(null); setForm(DEFAULT_FORM);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    setData((prev) => { const nd = { ...prev, workers: prev.workers.filter((w) => w.id !== id), records: prev.records.filter((r) => r.workerId !== id) }; saveData(nd); return nd; });
    toast(t.workerDeleted, 'warning');
  };

  const workerDisplayName = (w: Worker) => (lang === 'ar' ? w.name : (w.nameFr || w.name));

  return (
    <div className="lux-dash">
      <div className="lux-dash-header">
        <div className="lux-dash-header-text">
          <h1 className="lux-dash-title"><i className="fas fa-users lux-dash-title-icon" />{t.workers}</h1>
          <p className="lux-dash-subtitle">{data.workers.filter((w) => !w.isAdmin).length} {lang === 'ar' ? 'عامل' : 'employés'}</p>
        </div>
        <div className="lux-dash-header-actions">
          <button className="lux-btn lux-btn-primary" onClick={openAdd}><i className="fas fa-plus" /> {t.addWorker}</button>
        </div>
      </div>

      <div className="lux-workers-grid">
        {data.workers.filter((w) => !w.isAdmin).map((w) => {
          const monthRecs = data.records.filter((r) => r.workerId === w.id && getMonthKey(r.dateTs) === getMonthKey(Date.now()));
          const monthMins = monthRecs.reduce((s, r) => s + r.workMins, 0);
          const session = data.activeSessions[w.id] ?? {};
          const isActive = session.status === 'working' || session.status === 'break';

          return (
            <div key={w.id} className="lux-worker-card">
              {isActive && <div className="lux-worker-active-dot" />}
              <div className="lux-worker-card-top">
                <div className="lux-worker-card-avatar" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}88)` }}>
                  {workerDisplayName(w).charAt(0)}
                </div>
                <div>
                  <div className="lux-worker-card-name">{workerDisplayName(w)}</div>
                  <div className="lux-worker-card-role">{lang === 'ar' ? w.role : (w.roleFr || w.role)}</div>
                </div>
              </div>
              <div className="lux-worker-card-metrics">
                <div className="lux-metric-row"><span>{t.thisMonth}</span><span className="lux-stat-gold">{minutesToHHMM(monthMins, t)}</span></div>
                <div className="lux-metric-row"><span>{lang === 'ar' ? 'أيام العمل' : 'Jours'}</span><span>{monthRecs.length}</span></div>
                <div className="lux-metric-row"><span>{t.currentStatus}</span><span className={`lux-badge ${isActive ? 'lux-badge-green' : 'lux-badge-muted'}`} style={{ fontSize: 10 }}>{session.status === 'working' ? t.working : session.status === 'break' ? t.onBreak : t.idle}</span></div>
              </div>
              <div className="lux-worker-card-actions">
                <button className="lux-btn lux-btn-ghost lux-btn-sm" onClick={() => openEdit(w)}><i className="fas fa-pen" /> {t.edit}</button>
                <button className="lux-btn lux-btn-danger lux-btn-sm" onClick={() => handleDelete(w.id)}><i className="fas fa-trash" /> {t.delete}</button>
                <div className="lux-color-indicator" style={{ background: w.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title={`${t.addWorker}`} onClose={() => { setShowAdd(false); setForm(DEFAULT_FORM); }} footer={<><button className="lux-btn lux-btn-ghost" onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM); }}>{t.cancel}</button><button className="lux-btn lux-btn-primary" onClick={handleAdd}><i className="fas fa-plus" /> {t.addWorker}</button></>}>
          <WorkerFormFields form={form} setForm={setForm} t={t} />
        </Modal>
      )}

      {editingWorker && (
        <Modal title={`${t.editWorker}`} onClose={() => { setEditingWorker(null); setForm(DEFAULT_FORM); }} footer={<><button className="lux-btn lux-btn-ghost" onClick={() => { setEditingWorker(null); setForm(DEFAULT_FORM); }}>{t.cancel}</button><button className="lux-btn lux-btn-primary" onClick={handleSaveEdit}>{t.save}</button></>}>
          <WorkerFormFields form={form} setForm={setForm} t={t} />
        </Modal>
      )}
    </div>
  );
}
