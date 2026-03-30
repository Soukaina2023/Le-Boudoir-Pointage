import type { ReactNode, MouseEvent } from 'react';

interface Props {
  title?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}

export default function Modal({ title, onClose, footer, children, maxWidth }: Props) {
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="lux-modal-backdrop" onClick={handleBackdropClick}>
      <div className="lux-modal" style={maxWidth ? { maxWidth } : undefined}>
        {title !== undefined && (
          <div className="lux-modal-header">
            <div className="lux-modal-title">{title}</div>
            <button className="lux-modal-close" onClick={onClose}>
              <i className="fas fa-times" />
            </button>
          </div>
        )}
        <div className="lux-modal-body">{children}</div>
        {footer && <div className="lux-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
