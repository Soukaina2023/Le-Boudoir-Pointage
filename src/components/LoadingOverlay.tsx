interface Props {
  active: boolean;
  text?: string;
}

export default function LoadingOverlay({ active, text = 'جاري التحميل' }: Props) {
  if (!active) return null;

  return (
    <div className={`login-loading-overlay${active ? ' active' : ''}`}>
      <div className="login-loading-content">
        <div className="login-loading-spinner">
          <div className="login-spinner-ring" />
          <div className="login-spinner-ring" />
          <div className="login-spinner-ring" />
        </div>
        <div className="login-loading-text">{text}</div>
      </div>
    </div>
  );
}
