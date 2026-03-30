import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
}

const ICONS: Record<string, string> = {
  success: 'fa-check-circle',
  error: 'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info: 'fa-circle-info',
};

export default function ToastContainer({ toasts }: Props) {
  return (
    <div className="lux-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`lux-toast lux-toast-${t.type}`}>
          <i className={`fas ${ICONS[t.type] ?? 'fa-circle-info'}`} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
