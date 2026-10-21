import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const DEFAULT_RESPONSIBLE_PARTIES = [
  'Leverantör',
  'Trafikverket',
  'Tredje part',
  'Systemägare',
  'Entreprenör',
];

const OTHER = '__other__';
const NONE = '__none__';

interface ResponsibleSelectProps {
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  className?: string;
}

export function ResponsibleSelect({ value, options, onChange, className }: ResponsibleSelectProps) {
  const [freeText, setFreeText] = useState(false);
  const all = Array.from(new Set([...DEFAULT_RESPONSIBLE_PARTIES, ...options.filter(Boolean)]));

  if (freeText) {
    return (
      <Input
        autoFocus
        className={className ?? 'h-8 w-36'}
        defaultValue={value ?? ''}
        placeholder="Ansvarig"
        onBlur={(e) => {
          setFreeText(false);
          const next = e.target.value.trim() || null;
          if (next !== (value ?? null)) onChange(next);
        }}
      />
    );
  }

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        if (v === OTHER) { setFreeText(true); return; }
        onChange(v === NONE ? null : v);
      }}
    >
      <SelectTrigger className={className ?? 'h-8 w-36'}><SelectValue placeholder="–" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>–</SelectItem>
        {all.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        <SelectItem value={OTHER}>Annat…</SelectItem>
      </SelectContent>
    </Select>
  );
}
