import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  TEST_PHASES, TEST_PHASE_LABELS,
  TEST_TYPES, TEST_TYPE_LABELS,
  TESTABILITIES, TESTABILITY_LABELS,
  RESULT_STATUSES, RESULT_STATUS_LABELS,
} from './constants';

interface BulkEditBarProps {
  selectedCount: number;
  onClear: () => void;
  onApply: (values: Record<string, unknown>) => void;
  onCreateRounds?: (phases: string[]) => void;
}

export function BulkEditBar({ selectedCount, onClear, onApply, onCreateRounds }: BulkEditBarProps) {
  const [field, setField] = useState<string>('test_phase');
  const [value, setValue] = useState<string>('');
  const [chainPhases, setChainPhases] = useState<string[]>([]);

  const toggleChainPhase = (phase: string) =>
    setChainPhases(prev => prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]);

  const reset = () => setValue('');

  const apply = () => {
    if (!value) return;
    let parsed: unknown = value;
    if (field === 'is_applicable') parsed = value === 'yes' ? true : value === 'no' ? false : null;
    onApply({ [field]: parsed });
    reset();
  };

  const renderValueInput = () => {
    switch (field) {
      case 'test_phase':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Välj testtillfälle" /></SelectTrigger>
            <SelectContent>{TEST_PHASES.map(p => <SelectItem key={p} value={p}>{TEST_PHASE_LABELS[p]}</SelectItem>)}</SelectContent>
          </Select>
        );
      case 'test_type':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Välj testtyp" /></SelectTrigger>
            <SelectContent>{TEST_TYPES.map(t => <SelectItem key={t} value={t}>{TEST_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
        );
      case 'testability':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Välj testbarhet" /></SelectTrigger>
            <SelectContent>{TESTABILITIES.map(t => <SelectItem key={t} value={t}>{TESTABILITY_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
        );
      case 'result_status':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Välj status" /></SelectTrigger>
            <SelectContent>{RESULT_STATUSES.map(s => <SelectItem key={s} value={s}>{RESULT_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
        );
      case 'is_applicable':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Välj värde" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Ej bedömt</SelectItem>
              <SelectItem value="yes">Ja</SelectItem>
              <SelectItem value="no">Nej</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'tested_at':
        return <Input type="date" className="w-44" value={value} onChange={e => setValue(e.target.value)} />;
      default:
        return <Input className="w-52" placeholder="Namn" value={value} onChange={e => setValue(e.target.value)} />;
    }
  };

  return (
    <Card className="border-primary/40">
      <CardContent className="p-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">{selectedCount} rader markerade</span>
        <Select value={field} onValueChange={(v) => { setField(v); reset(); }}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="is_applicable">Tillämpligt</SelectItem>
            <SelectItem value="testability">Testbart</SelectItem>
            <SelectItem value="test_phase">Testtillfälle</SelectItem>
            <SelectItem value="test_type">Testtyp</SelectItem>
            <SelectItem value="responsible_party">Ansvarig</SelectItem>
            <SelectItem value="result_status">Status</SelectItem>
            <SelectItem value="tested_at">Testdatum</SelectItem>
            <SelectItem value="tested_by">Utförd av</SelectItem>
          </SelectContent>
        </Select>
        {renderValueInput()}
        <Button size="sm" onClick={apply} disabled={!value}>Tillämpa på markerade</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>Avmarkera</Button>

        {onCreateRounds && (
          <div className="w-full flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-sm text-muted-foreground">Skapa testkedja i:</span>
            {TEST_PHASES.map(p => (
              <Button
                key={p}
                size="sm"
                variant={chainPhases.includes(p) ? 'default' : 'outline'}
                onClick={() => toggleChainPhase(p)}
              >
                {TEST_PHASE_LABELS[p]}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              disabled={chainPhases.length === 0}
              onClick={() => { onCreateRounds(chainPhases); setChainPhases([]); }}
            >
              Skapa testomgångar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
