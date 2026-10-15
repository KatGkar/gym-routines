import { useState } from 'react';

interface Props {
  value: number | undefined;
  onChange: (v: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
}

// Number box that keeps what you type as text ("0", "60.", "60,5") and blocks minus/letters
export default function NumInput({
  value,
  onChange,
  onBlur,
  placeholder = '0',
  decimal = true,
  className,
}: Props) {
  const [text, setText] = useState(value ? String(value) : '');
  const [prev, setPrev] = useState(value);

  // follow outside changes (for example repsMax raised when reps goes above it)
  if (value !== prev) {
    setPrev(value);
    if (Number(text || 0) !== (value ?? 0)) setText(value ? String(value) : '');
  }

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        let raw = e.target.value.replace(',', '.');
        raw = decimal ? raw.replace(/[^0-9.]/g, '') : raw.replace(/[^0-9]/g, '');
        const parts = raw.split('.');
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
        setText(raw);
        onChange(Number(raw) || 0);
      }}
      onBlur={onBlur}
      className={className}
    />
  );
}
