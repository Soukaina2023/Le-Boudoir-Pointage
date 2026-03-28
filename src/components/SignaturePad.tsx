interface Props {
  signed: boolean;
  label: string;
  signedLabel: string;
  icon?: string;
  color?: string;
  onToggle: () => void;
}

export default function SignaturePad({ signed, label, signedLabel, icon = '✍️', color = 'var(--success)', onToggle }: Props) {
  return (
    <div
      className="signature-pad"
      onClick={onToggle}
      style={signed ? { borderColor: color, color } : undefined}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span>{signed ? signedLabel : label}</span>
    </div>
  );
}
