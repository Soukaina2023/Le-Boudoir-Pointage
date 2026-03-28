import type { ActiveSession, AppData, SpecialMode, TimeRecord } from '../types';
import { calcWorkMinutes, todayKey } from '../utils/time';
import { initData, loadData, saveData } from '../utils/storage';
import { isDemoMode, supabase } from './supabase';

function assertSupabase() {
  if (!supabase) throw new Error('Supabase client not available');
  return supabase;
}

function cloneApp(): AppData {
  return JSON.parse(JSON.stringify(loadData() ?? initData())) as AppData;
}

function persistApp(d: AppData) {
  saveData(d);
}

/** DB may use half_day; app uses halfDay */
function toDbSpecialMode(m: SpecialMode): string {
  return m === 'halfDay' ? 'half_day' : m;
}

function fromDbSpecialMode(s: string | null | undefined): SpecialMode {
  if (!s) return 'normal';
  if (s === 'half_day') return 'halfDay';
  if (s === 'ramadan' || s === 'normal') return s;
  return 'normal';
}

function parseTs(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = new Date(v).getTime();
  return Number.isNaN(n) ? undefined : n;
}

function rowToSession(row: Record<string, unknown>): Partial<ActiveSession> {
  return {
    status: (row.status as ActiveSession['status']) ?? 'idle',
    startTs: parseTs(row.start_ts as string | undefined),
    breakStartTs: row.break_start_ts != null ? parseTs(row.break_start_ts as string) : null,
    totalBreakMins: (row.total_break_mins as number) ?? 0,
    date: (row.session_date as string) ?? undefined,
    specialMode: fromDbSpecialMode(row.special_mode as string | undefined),
  };
}

function rowToTimeRecord(row: Record<string, unknown>): TimeRecord {
  return {
    id: String(row.id),
    workerId: String(row.worker_id),
    workerName: String(row.worker_name ?? ''),
    date: String(row.work_date ?? todayKey()),
    dateTs: parseTs(row.date_ts as string) ?? 0,
    startTs: parseTs(row.start_ts as string) ?? 0,
    endTs: parseTs(row.end_ts as string) ?? 0,
    breakMins: Number(row.break_mins ?? 0),
    workMins: Number(row.work_mins ?? 0),
    overtimeMins: Number(row.overtime_mins ?? 0),
    notes: String(row.notes ?? ''),
    specialMode: fromDbSpecialMode(row.special_mode as string | undefined),
    workerSig: Boolean(row.worker_sig),
    managerSig: Boolean(row.manager_sig),
    auditEdits: [],
  };
}

// --- Demo: localStorage (same shape as AppData) ---

function demoFetchActiveSession(workerId: string): Partial<ActiveSession> {
  const d = loadData() ?? initData();
  const s = d.activeSessions[workerId];
  if (!s?.status) return { status: 'idle' };
  return { ...s };
}

function demoFetchTodayTimeRecord(workerId: string): TimeRecord | null {
  const d = loadData() ?? initData();
  const day = todayKey();
  const list = d.records.filter((r) => r.workerId === workerId && r.date === day);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.endTs - a.endTs)[0];
}

function demoStartWork(workerId: string, specialMode: SpecialMode): void {
  const d = cloneApp();
  d.activeSessions[workerId] = {
    status: 'working',
    startTs: Date.now(),
    totalBreakMins: 0,
    date: todayKey(),
    specialMode,
    breakStartTs: null,
  };
  persistApp(d);
}

function demoBreakStart(workerId: string): void {
  const d = cloneApp();
  const cur = d.activeSessions[workerId] ?? {};
  d.activeSessions[workerId] = { ...cur, status: 'break', breakStartTs: Date.now() };
  persistApp(d);
}

function demoBreakEnd(workerId: string, breakStartTs: number, prevTotalBreakMins: number): void {
  const d = cloneApp();
  const cur = d.activeSessions[workerId] ?? {};
  const breakMins = Math.round((Date.now() - breakStartTs) / 60000);
  const totalBreak = prevTotalBreakMins + breakMins;
  d.activeSessions[workerId] = {
    ...cur,
    status: 'working',
    totalBreakMins: totalBreak,
    breakStartTs: null,
  };
  persistApp(d);
}

function demoEndWorkSession(params: {
  workerId: string;
  workerName: string;
  session: Partial<ActiveSession>;
  officialHoursPerDay: number;
}): void {
  const endTs = Date.now();
  const startTs = params.session.startTs!;
  const totalBreak = params.session.totalBreakMins ?? 0;
  const workMins = calcWorkMinutes(startTs, endTs, totalBreak);
  const officialMins = params.officialHoursPerDay * 60;
  const overtimeMins = Math.max(0, workMins - officialMins);

  const record: TimeRecord = {
    id: `r${Date.now()}`,
    workerId: params.workerId,
    workerName: params.workerName,
    date: params.session.date ?? todayKey(),
    dateTs: startTs,
    startTs,
    endTs,
    breakMins: totalBreak,
    workMins,
    overtimeMins,
    notes: '',
    specialMode: params.session.specialMode ?? 'normal',
    workerSig: false,
    managerSig: false,
    auditEdits: [],
  };

  const d = cloneApp();
  d.records = [record, ...d.records];
  d.activeSessions[params.workerId] = { status: 'done', lastRecord: record };
  persistApp(d);
}

function demoInsertManualTimeRecord(params: {
  workerId: string;
  workerName: string;
  startTs: number;
  endTs: number;
  breakMins: number;
  notes: string;
  specialMode: SpecialMode;
  workerSig: boolean;
  managerSig: boolean;
  officialHoursPerDay: number;
}): void {
  const workMins = calcWorkMinutes(params.startTs, params.endTs, params.breakMins);
  const officialMins = params.officialHoursPerDay * 60;
  const overtimeMins = Math.max(0, workMins - officialMins);

  const record: TimeRecord = {
    id: `r${Date.now()}`,
    workerId: params.workerId,
    workerName: params.workerName,
    date: todayKey(),
    dateTs: params.startTs,
    startTs: params.startTs,
    endTs: params.endTs,
    breakMins: params.breakMins,
    workMins,
    overtimeMins,
    notes: params.notes,
    specialMode: params.specialMode,
    workerSig: params.workerSig,
    managerSig: params.managerSig,
    auditEdits: [],
  };

  const d = cloneApp();
  d.records = [record, ...d.records];
  persistApp(d);
}

// --- Public API ---

export async function resolveOrganizationId(workerId: string): Promise<string | undefined> {
  if (isDemoMode) return import.meta.env.VITE_ORGANIZATION_ID;
  const envOrg = import.meta.env.VITE_ORGANIZATION_ID;
  const sb = assertSupabase();
  const { data, error } = await sb.from('workers').select('organization_id').eq('id', workerId).maybeSingle();
  if (error) return envOrg;
  const oid =
    data && typeof data === 'object' && 'organization_id' in data
      ? (data as { organization_id?: string }).organization_id
      : undefined;
  return oid ?? envOrg;
}

export async function fetchOfficialHoursPerDay(): Promise<number | null> {
  if (isDemoMode) return null;
  const sb = assertSupabase();
  const { data, error } = await sb.from('app_settings').select('official_hours_per_day').limit(1).maybeSingle();
  if (error || !data) return null;
  const v = (data as { official_hours_per_day?: number }).official_hours_per_day;
  return typeof v === 'number' ? v : null;
}

export async function fetchActiveSession(workerId: string): Promise<Partial<ActiveSession>> {
  if (isDemoMode) return demoFetchActiveSession(workerId);
  const sb = assertSupabase();
  const { data, error } = await sb.from('active_sessions').select('*').eq('worker_id', workerId).maybeSingle();
  if (error) throw error;
  if (!data) return { status: 'idle' };
  return rowToSession(data as Record<string, unknown>);
}

export async function fetchTodayTimeRecord(workerId: string): Promise<TimeRecord | null> {
  if (isDemoMode) return demoFetchTodayTimeRecord(workerId);
  const sb = assertSupabase();
  const day = todayKey();
  const { data, error } = await sb
    .from('time_records')
    .select('*')
    .eq('worker_id', workerId)
    .eq('work_date', day)
    .order('end_ts', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToTimeRecord(data as Record<string, unknown>);
}

export async function startWork(
  workerId: string,
  organizationId: string | undefined,
  specialMode: SpecialMode = 'normal',
): Promise<void> {
  if (isDemoMode) {
    void organizationId;
    demoStartWork(workerId, specialMode);
    return;
  }
  const sb = assertSupabase();
  const payload: Record<string, unknown> = {
    worker_id: workerId,
    status: 'working',
    start_ts: new Date().toISOString(),
    total_break_mins: 0,
    break_start_ts: null,
    session_date: todayKey(),
    special_mode: toDbSpecialMode(specialMode),
  };
  if (organizationId) payload.organization_id = organizationId;

  const { error } = await sb.from('active_sessions').upsert(payload, { onConflict: 'worker_id' });
  if (error) throw error;
}

export async function breakStart(workerId: string): Promise<void> {
  if (isDemoMode) {
    demoBreakStart(workerId);
    return;
  }
  const sb = assertSupabase();
  const { error } = await sb
    .from('active_sessions')
    .update({
      status: 'break',
      break_start_ts: new Date().toISOString(),
    })
    .eq('worker_id', workerId);
  if (error) throw error;
}

export async function breakEnd(workerId: string, breakStartTs: number, prevTotalBreakMins: number): Promise<void> {
  if (isDemoMode) {
    demoBreakEnd(workerId, breakStartTs, prevTotalBreakMins);
    return;
  }
  const sb = assertSupabase();
  const breakMins = Math.round((Date.now() - breakStartTs) / 60000);
  const totalBreak = prevTotalBreakMins + breakMins;
  const { error } = await sb
    .from('active_sessions')
    .update({
      status: 'working',
      total_break_mins: totalBreak,
      break_start_ts: null,
    })
    .eq('worker_id', workerId);
  if (error) throw error;
}

export async function endWorkSession(params: {
  workerId: string;
  workerName: string;
  organizationId: string | undefined;
  session: Partial<ActiveSession>;
  officialHoursPerDay: number;
}): Promise<void> {
  if (isDemoMode) {
    void params.organizationId;
    demoEndWorkSession(params);
    return;
  }
  const sb = assertSupabase();
  const endTs = Date.now();
  const startTs = params.session.startTs!;
  const totalBreak = params.session.totalBreakMins ?? 0;
  const workMins = calcWorkMinutes(startTs, endTs, totalBreak);
  const officialMins = params.officialHoursPerDay * 60;
  const overtimeMins = Math.max(0, workMins - officialMins);

  const insertRow: Record<string, unknown> = {
    worker_id: params.workerId,
    worker_name: params.workerName,
    work_date: params.session.date ?? todayKey(),
    date_ts: new Date(startTs).toISOString(),
    start_ts: new Date(startTs).toISOString(),
    end_ts: new Date(endTs).toISOString(),
    break_mins: totalBreak,
    work_mins: workMins,
    overtime_mins: overtimeMins,
    notes: '',
    special_mode: toDbSpecialMode(params.session.specialMode ?? 'normal'),
    worker_sig: false,
    manager_sig: false,
  };
  if (params.organizationId) insertRow.organization_id = params.organizationId;

  const { error: insertError } = await sb.from('time_records').insert(insertRow);
  if (insertError) throw insertError;

  const donePayload: Record<string, unknown> = {
    worker_id: params.workerId,
    status: 'done',
    start_ts: null,
    break_start_ts: null,
    total_break_mins: 0,
    session_date: null,
    special_mode: 'normal',
  };
  if (params.organizationId) donePayload.organization_id = params.organizationId;

  const { error: upsertError } = await sb.from('active_sessions').upsert(donePayload, { onConflict: 'worker_id' });
  if (upsertError) throw upsertError;
}

export async function insertManualTimeRecord(params: {
  workerId: string;
  workerName: string;
  organizationId: string | undefined;
  startTs: number;
  endTs: number;
  breakMins: number;
  notes: string;
  specialMode: SpecialMode;
  workerSig: boolean;
  managerSig: boolean;
  officialHoursPerDay: number;
}): Promise<void> {
  if (isDemoMode) {
    void params.organizationId;
    demoInsertManualTimeRecord(params);
    return;
  }
  const sb = assertSupabase();
  const workMins = calcWorkMinutes(params.startTs, params.endTs, params.breakMins);
  const officialMins = params.officialHoursPerDay * 60;
  const overtimeMins = Math.max(0, workMins - officialMins);

  const insertRow: Record<string, unknown> = {
    worker_id: params.workerId,
    worker_name: params.workerName,
    work_date: todayKey(),
    date_ts: new Date(params.startTs).toISOString(),
    start_ts: new Date(params.startTs).toISOString(),
    end_ts: new Date(params.endTs).toISOString(),
    break_mins: params.breakMins,
    work_mins: workMins,
    overtime_mins: overtimeMins,
    notes: params.notes,
    special_mode: toDbSpecialMode(params.specialMode),
    worker_sig: params.workerSig,
    manager_sig: params.managerSig,
  };
  if (params.organizationId) insertRow.organization_id = params.organizationId;

  const { error } = await sb.from('time_records').insert(insertRow);
  if (error) throw error;
}
