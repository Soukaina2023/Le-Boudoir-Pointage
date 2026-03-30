import type { AppData, AppSettings } from '../types';

const STORAGE_KEY = 'barbershop_timetracker_v2';

const DEFAULT_SETTINGS: AppSettings = {
  officialHoursPerDay: 8,
  adminPin: '9999',
  language: 'fr',
};

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to persist data:', e);
  }
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function initData(): AppData {
  const saved = loadData();
  if (saved) return saved;

  return {
    workers: [
      { id: 'w1', name: 'سكينة', nameFr: 'Soukaina', role: 'حلاقة', roleFr: 'Coiffeuse', pin: '', color: '#C9A84C', isAdmin: false },
      { id: 'w2', name: 'فدوى', nameFr: 'Fadwa', role: 'حلاقة', roleFr: 'Coiffeuse', pin: '', color: '#3498DB', isAdmin: false },
      { id: 'w4', name: 'سكينة 2', nameFr: 'Soukaina-2', role: 'حلاقة', roleFr: 'Coiffeuse', pin: '', color: '#E91E63', isAdmin: false },
      { id: 'w5', name: 'رشيدة', nameFr: 'Rachida', role: 'حلاقة', roleFr: 'Coiffeuse', pin: '', color: '#2ECC71', isAdmin: false },
      { id: 'w3', name: 'المشرف', nameFr: 'Responsable', role: 'مشرف', roleFr: 'Responsable', pin: '0000', color: '#E74C3C', isAdmin: true },
    ],
    records: [],
    auditLog: [],
    settings: DEFAULT_SETTINGS,
    activeSessions: {},
  };
}
