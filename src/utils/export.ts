import type { Lang, TimeRecord, Translations } from '../types';
import { formatTime, minutesToHHMM, getMonthLabel, splitOvertimeBy8PM, isCheckoutAfter8PM } from './time';

export interface WorkerStatExport {
  worker: { name: string; nameFr?: string; role: string; roleFr?: string; color: string };
  recs: TimeRecord[];
  totalMins: number;
  overtimeMins: number;
  overtimeBefore8: number;
  overtimeAfter8: number;
  avgMins: number;
  days: number;
}

export async function exportPDF(
  workerStats: WorkerStatExport[],
  filterMonth: string,
  t: Translations,
  officialMins: number,
  onSuccess: (msg: string) => void
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFont('Helvetica');
  doc.setFontSize(18);
  doc.text('Le Boudoir Majorelle - ' + getMonthLabel(filterMonth, 'fr'), 14, 18);
  doc.setFontSize(10);
  doc.text('Rapport généré le: ' + new Date().toLocaleDateString('fr-FR'), 14, 26);

  let y = 38;

  for (const ws of workerStats) {
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text((ws.worker.nameFr || ws.worker.name) + ' - ' + (ws.worker.roleFr || ws.worker.role), 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Jours: ${ws.days} | Total: ${minutesToHHMM(ws.totalMins, t)} | Sup.av.20h: ${minutesToHHMM(ws.overtimeBefore8, t)} | Sup.ap.20h: ${minutesToHHMM(ws.overtimeAfter8, t)} | Moy./j: ${minutesToHHMM(ws.avgMins, t)}`,
      14,
      y
    );
    y += 5;

    const cols = ['Date', 'Arr.', 'Dép.', 'Pause', 'H.', 'Sup.av', 'Sup.ap', '>20h', 'Notes'];
    const colW = [26, 18, 18, 16, 20, 22, 22, 14, 52];

    doc.setTextColor(200, 168, 76);
    doc.setFontSize(7);

    let x = 14;
    cols.forEach((c, i) => {
      doc.text(c, x + 2, y + 5);
      x += colW[i];
    });
    y += 8;
    doc.setTextColor(40);

    for (const r of ws.recs) {
      const sp = splitOvertimeBy8PM(r.startTs, r.endTs, r.breakMins, r.overtimeMins, officialMins);
      const after8 = isCheckoutAfter8PM(r.endTs);
      x = 14;
      const row = [
        r.date,
        formatTime(r.startTs),
        formatTime(r.endTs),
        r.breakMins + 'm',
        minutesToHHMM(r.workMins, t),
        sp.before8PM > 0 ? '+' + minutesToHHMM(sp.before8PM, t) : '-',
        sp.after8PM > 0 ? '+' + minutesToHHMM(sp.after8PM, t) : '-',
        after8 ? 'Oui' : '-',
        (r.notes || '').slice(0, 28),
      ];
      row.forEach((c, i) => {
        doc.text(String(c), x + 2, y + 4);
        x += colW[i];
      });
      y += 7;
      if (y > 185) {
        doc.addPage();
        y = 18;
      }
    }
    y += 6;
  }

  doc.save(`LeBoudoirMajorelle_${filterMonth}.pdf`);
  onSuccess('PDF exported ✓');
}

export async function exportExcel(
  workerStats: WorkerStatExport[],
  filterMonth: string,
  lang: Lang,
  _t: Translations,
  officialMins: number,
  onSuccess: (msg: string) => void
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const hBefore = lang === 'ar' ? 'إضافي قبل 20:00' : 'Sup. avant 20h';
  const hAfter = lang === 'ar' ? 'إضافي بعد 20:00' : 'Sup. après 20h';
  const hOut = lang === 'ar' ? 'خروج بعد 20:00' : 'Sortie après 20h';

  for (const ws of workerStats) {
    const rows = [
      [
        lang === 'ar' ? 'التاريخ' : 'Date',
        lang === 'ar' ? 'دخول' : 'Arrivée',
        lang === 'ar' ? 'خروج' : 'Départ',
        lang === 'ar' ? 'استراحة' : 'Pause(min)',
        lang === 'ar' ? 'ساعات' : 'Heures(min)',
        hBefore + '(min)',
        hAfter + '(min)',
        hOut,
        lang === 'ar' ? 'ملاحظات' : 'Notes',
      ],
      ...ws.recs.map((r) => {
        const sp = splitOvertimeBy8PM(r.startTs, r.endTs, r.breakMins, r.overtimeMins, officialMins);
        return [
          r.date,
          formatTime(r.startTs),
          formatTime(r.endTs),
          r.breakMins,
          r.workMins,
          sp.before8PM,
          sp.after8PM,
          isCheckoutAfter8PM(r.endTs) ? 1 : 0,
          r.notes || '',
        ];
      }),
      [],
      [
        lang === 'ar' ? 'المجموع' : 'Total',
        '',
        '',
        '',
        ws.totalMins,
        ws.overtimeBefore8,
        ws.overtimeAfter8,
        '',
        '',
      ],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, (ws.worker.nameFr || ws.worker.name).slice(0, 31));
  }

  XLSX.writeFile(wb, `LeBoudoirMajorelle_${filterMonth}.xlsx`);
  onSuccess('Excel exported ✓');
}
