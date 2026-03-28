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
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        {title !== undefined && (
          <div className="modal-header">
            <div className="modal-title">{title}</div>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
