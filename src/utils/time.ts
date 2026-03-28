import type { Lang, Translations } from '../types';

export function formatTime(ts: number | null | undefined): string {
  if (!ts) return '--:--';
  return new Date(ts).toTimeString().slice(0, 5);
}

export function formatDate(ts: number, lang: Lang = 'fr'): string {
  if (!ts) return '';
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(ts).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', opts);
}

/** Formats duration. Pass `t` so zero values use the correct locale (h/m, س/د, etc.). */
export function minutesToHHMM(mins: number, t: Translations): string {
  if (mins <= 0) return `0${t.hr} 0${t.min}`;
  const totalMins = Math.round(Math.abs(mins));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats elapsed time from fractional minutes (e.g. live timers) as HH:MM:SS.
 */
export function formatDurationHMS(totalMinutes: number): string {
  const totalSeconds = Math.max(0, Math.floor(Math.abs(totalMinutes) * 60 + 1e-9));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function minutesToDisplay(mins: number, t: Translations): string {
  const totalMins = Math.round(Math.abs(mins));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}${t.hr} ${m}${t.min}`;
}

export function calcWorkMinutes(startTs: number, endTs: number, breakMins: number): number {
  if (!startTs || !endTs) return 0;
  const total = (endTs - startTs) / 60000;
  return Math.max(0, Math.round(total - (breakMins || 0)));
}

/** 20:00 on the same calendar day as `ts` (local time). */
export function getEightPMTs(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 20, 0, 0, 0).getTime();
}

/** True if check-out is strictly after 20:00 on that work day. */
export function isCheckoutAfter8PM(endTs: number): boolean {
  return endTs > getEightPMTs(endTs);
}

/**
 * Splits overtime minutes into before 20:00 and after 20:00 on the start day.
 * Official period ends at startTs + (officialMins + breakMins) wall-clock; overtime is the remainder until endTs.
 */
export function splitOvertimeBy8PM(
  startTs: number,
  endTs: number,
  breakMins: number,
  overtimeMins: number,
  officialMins: number,
): { before8PM: number; after8PM: number } {
  if (overtimeMins <= 0) return { before8PM: 0, after8PM: 0 };

  const officialEndTs = startTs + (officialMins + (breakMins || 0)) * 60000;
  const otStart = officialEndTs;
  const otEnd = endTs;

  if (otEnd <= otStart) {
    return { before8PM: overtimeMins, after8PM: 0 };
  }

  const eightPMTs = getEightPMTs(startTs);

  const beforeMs = Math.max(0, Math.min(eightPMTs, otEnd) - otStart);
  const afterMs = Math.max(0, otEnd - Math.max(otStart, eightPMTs));

  let before = Math.round(beforeMs / 60000);
  let after = Math.round(afterMs / 60000);

  const sum = before + after;
  if (sum !== overtimeMins) {
    const diff = overtimeMins - sum;
    if (after >= before) after += diff;
    else before += diff;
  }

  return { before8PM: Math.max(0, before), after8PM: Math.max(0, after) };
}

export function getMonthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(key: string, lang: Lang): string {
  const [year, month] = key.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { month: 'long', year: 'numeric' });
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseTimeToTs(timeStr: string, baseDate: Date): number {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
