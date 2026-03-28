import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
}

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

export default function ToastContainer({ toasts }: Props) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{ICONS[t.type] ?? 'ℹ'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
