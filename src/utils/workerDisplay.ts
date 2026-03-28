import type { AppData, Lang, Worker } from '../types';

export function workerLabel(w: Worker, lang: Lang): string {
  return lang === 'ar' ? w.name : (w.nameFr || w.name);
}

/** Use workers list so UI shows nameFr in French even when TimeRecord.workerName is Arabic. */
export function recordWorkerLabel(data: AppData, workerId: string, lang: Lang): string {
  const w = data.workers.find((x) => x.id === workerId);
  if (!w) return '';
  return workerLabel(w, lang);
}
