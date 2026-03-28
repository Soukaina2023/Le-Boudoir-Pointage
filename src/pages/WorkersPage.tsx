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

interface WorkerForm {
  name: string;
  nameFr: string;
  role: string;
  roleFr: string;
  pin: string;
  color: string;
}

const DEFAULT_FORM: WorkerForm = {
  name: '',
  nameFr: '',
  role: 'حلاق',
  roleFr: 'Coiffeur',
  pin: '',
  color: '#3498DB',
};

const COLORS = ['#C9A84C', '#3498DB', '#E74C3C', '#2ECC71', '#9B59B6', '#E67E22', '#1ABC9C', '#E91E63'];

function WorkerFormFields({
  form,
  setForm,
  t,
}: {
  form: WorkerForm;
  setForm: React.Dispatch<React.SetStateAction<WorkerForm>>;
  t: Translations;
}) {
  return (
    <>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">{t.workerName} (AR)</label>
          <input
            className="form-control"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: كريم"
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t.workerName} (FR)</label>
          <input
            className="form-control"
            value={form.nameFr}
            onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
            placeholder="Karim"
          />
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">{t.workerRole} (AR)</label>
          <input className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t.workerRole} (FR)</label>
          <input className="form-control" value={form.roleFr} onChange={(e) => setForm({ ...form, roleFr: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t.workerPin}</label>
        <input
          type="password"
          className="form-control"
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value })}
          placeholder="••••"
          maxLength={6}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t.workerColor}</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, color: c })}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: c,
                cursor: 'pointer',
                border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
                transition: 'var(--transition)',
                padding: 0,
              }}
            />
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

  if (!currentWorker.isAdmin) {
    return null;
  }

  const openAdd = () => {
    setEditingWorker(null);
    setForm(DEFAULT_FORM);
    setShowAdd(true);
  };

  const openEdit = (w: Worker) => {
    setShowAdd(false);
    setEditingWorker(w);
    setForm({
      name: w.name,
      nameFr: w.nameFr ?? '',
      role: w.role,
      roleFr: w.roleFr ?? '',
      pin: w.pin,
      color: w.color,
    });
  };

  const handleAdd = () => {
    if (!form.name || !form.pin) {
      toast(t.errorFillFields, 'error');
      return;
    }
    const newWorker: Worker = { id: 'w' + Date.now(), ...form, isAdmin: false };
    setData((prev) => {
      const nd = { ...prev, workers: [...prev.workers, newWorker] };
      saveData(nd);
      return nd;
    });
    toast(t.workerAdded, 'success');
    setShowAdd(false);
    setForm(DEFAULT_FORM);
  };

  const handleSaveEdit = () => {
    if (!editingWorker) return;
    if (!form.name || !form.pin) {
      toast(t.errorFillFields, 'error');
      return;
    }

    setData((prev) => {
      const nd = {
        ...prev,
        workers: prev.workers.map((w) =>
          w.id === editingWorker.id
            ? {
                ...w,
                name: form.name,
                nameFr: form.nameFr,
                role: form.role,
                roleFr: form.roleFr,
                pin: form.pin,
                color: form.color,
              }
            : w
        ),
        records: prev.records.map((r) =>
          r.workerId === editingWorker.id ? { ...r, workerName: form.name } : r
        ),
        auditLog: [
          {
            ts: Date.now(),
            actor: currentWorker.name,
            action: `${t.editWorker}: ${form.name}`,
          },
          ...prev.auditLog,
        ].slice(0, 200),
      };
      saveData(nd);
      return nd;
    });
    toast(t.updatedSuccess, 'success');
    setEditingWorker(null);
    setForm(DEFAULT_FORM);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    setData((prev) => {
      const nd = {
        ...prev,
        workers: prev.workers.filter((w) => w.id !== id),
        records: prev.records.filter((r) => r.workerId !== id),
      };
      saveData(nd);
      return nd;
    });
    toast(t.workerDeleted, 'warning');
  };

  const workerDisplayName = (w: Worker) => (lang === 'ar' ? w.name : (w.nameFr || w.name));

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">👥 {t.workers}</div>
          <div className="page-subtitle">
            {data.workers.filter((w) => !w.isAdmin).length} {lang === 'ar' ? 'عامل' : 'employés'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + {t.addWorker}
        </button>
      </div>

      <div className="workers-grid">
        {data.workers
          .filter((w) => !w.isAdmin)
          .map((w) => {
            const monthRecs = data.records.filter(
              (r) => r.workerId === w.id && getMonthKey(r.dateTs) === getMonthKey(Date.now())
            );
            const monthMins = monthRecs.reduce((s, r) => s + r.workMins, 0);
            const session = data.activeSessions[w.id] ?? {};
            const isActive = session.status === 'working' || session.status === 'break';

            return (
              <div key={w.id} className="worker-card">
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--success)',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className="worker-card-avatar" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}88)` }}>
                    {workerDisplayName(w).charAt(0)}
                  </div>
                  <div>
                    <div className="worker-card-name">{workerDisplayName(w)}</div>
                    <div className="worker-card-role">{lang === 'ar' ? w.role : (w.roleFr || w.role)}</div>
                  </div>
                </div>

                <div>
                  <div className="metric-row">
                    <span className="metric-label">{t.thisMonth}</span>
                    <span className="metric-value text-gold">{minutesToHHMM(monthMins, t)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">{lang === 'ar' ? 'أيام العمل' : 'Jours'}</span>
                    <span className="metric-value">{monthRecs.length}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">{t.currentStatus}</span>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: 10 }}>
                      {session.status === 'working' ? t.working : session.status === 'break' ? t.onBreak : t.idle}
                    </span>
                  </div>
                </div>

                <div className="worker-card-actions" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(w)} title={t.editWorker}>
                    ✏️ {t.edit}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(w.id)}>
                    🗑 {t.delete}
                  </button>
                  <div style={{ background: w.color, width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)' }} />
                </div>
              </div>
            );
          })}
      </div>

      {showAdd && (
        <Modal
          title={`+ ${t.addWorker}`}
          onClose={() => {
            setShowAdd(false);
            setForm(DEFAULT_FORM);
          }}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM); }}>
                {t.cancel}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAdd}>
                + {t.addWorker}
              </button>
            </>
          }
        >
          <WorkerFormFields form={form} setForm={setForm} t={t} />
        </Modal>
      )}

      {editingWorker && (
        <Modal
          title={`✏️ ${t.editWorker}`}
          onClose={() => {
            setEditingWorker(null);
            setForm(DEFAULT_FORM);
          }}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => { setEditingWorker(null); setForm(DEFAULT_FORM); }}>
                {t.cancel}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveEdit}>
                {t.save}
              </button>
            </>
          }
        >
          <WorkerFormFields form={form} setForm={setForm} t={t} />
        </Modal>
      )}
    </div>
  );
}
