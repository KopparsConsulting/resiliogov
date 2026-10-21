import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useLogTriggerChange } from '@/hooks/useRequirementReviews';
import { fetchTriggerLogicProblems } from '@/lib/requirementEngine';

interface TriggerLogicEditorProps {
  requirementId: string;
  triggerLogic: unknown;
  targetType: string | null;
}

// Known keys and their types
const FACILITY_KEYS = [
  { key: 'type', label: 'Anläggningstyp', type: 'string_or_array' },
  { key: 'length_gt', label: 'Längd >', type: 'number' },
  { key: 'traffic_flow_gt', label: 'ÅDT >', type: 'number' },
  { key: 'construction_type', label: 'Konstruktionstyp', type: 'string_array' },
  { key: 'is_critical_entity', label: 'Samhällsviktig', type: 'boolean' },
  { key: 'has_dangerous_goods', label: 'Farligt gods', type: 'boolean' },
  { key: 'owner_type', label: 'Ägartyp', type: 'string' },
] as const;

const SYSTEM_KEYS = [
  { key: 'is_critical_entity', label: 'Samhällsviktig', type: 'boolean' },
  { key: 'is_central_system', label: 'Centralt system', type: 'boolean' },
  { key: 'is_externally_accessible', label: 'Externt åtkomligt', type: 'boolean' },
  { key: 'owner_type', label: 'Ägartyp', type: 'string' },
  { key: 'system_category', label: 'Systemkategori', type: 'string_or_array' },
  { key: 'system_type', label: 'Systemtyp', type: 'string_or_array' },
  { key: 'linked_to_facility_type', label: 'Kopplad anläggningstyp', type: 'string_or_array' },
  { key: 'linked_to_critical_facility', label: 'Kopplad till samhällsviktig', type: 'boolean' },
  { key: 'linked_to_dangerous_goods_facility', label: 'Kopplad till farligt gods', type: 'boolean' },
] as const;

const FACILITY_TYPES = [
  'Vägtunnel', 'Bro', 'IT-System', 'Ledningscentral', 'Järnvägstunnel',
  'Trafikledningscentral', 'Datacenter', 'Spåranläggning', 'Signalanläggning',
  'Elkraftsanläggning', 'Terminal', 'Trafikplats',
];

const CONSTRUCTION_TYPES = ['Berg', 'Betong', 'Sänktunnel', 'Överdäckning'];

const SYSTEM_CATEGORIES = [
  'tunnel_traffic_ot', 'it_infrastructure', 'physical_security', 'communication_crisis',
];

export function TriggerLogicEditor({ requirementId, triggerLogic, targetType }: TriggerLogicEditorProps) {
  const [editing, setEditing] = useState(false);
  const [logic, setLogic] = useState<Record<string, unknown>>(() =>
    (triggerLogic && typeof triggerLogic === 'object' && !Array.isArray(triggerLogic))
      ? { ...(triggerLogic as Record<string, unknown>) }
      : {}
  );
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const logChange = useLogTriggerChange();

  // 'both' utvärderas av systemmotorn, så den använder systemnycklarna
  const availableKeys = targetType === 'system' || targetType === 'both' ? SYSTEM_KEYS : FACILITY_KEYS;
  const unusedKeys = availableKeys.filter((k) => !(k.key in logic));

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = Object.keys(logic).length > 0 ? logic : null;

      // Samma valideringsregler som databasen tillämpar: okända nycklar,
      // tomma värden och felstavade typer stoppas innan de sparas.
      const problems = payload ? await fetchTriggerLogicProblems(payload, targetType) : [];
      if (problems.length > 0) {
        toast({ title: 'Villkoren kan inte sparas', description: problems.join(' • '), variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('requirements')
        .update({ trigger_logic: payload as any })
        .eq('id', requirementId);

      if (error) throw error;

      toast({ title: 'Sparat', description: 'Trigger logic uppdaterad' });
      queryClient.invalidateQueries({ queryKey: ['requirements-explorer'] });
      queryClient.invalidateQueries({ queryKey: ['requirement-matches', requirementId] });
      logChange.mutate({ requirementId, oldValue: triggerLogic, newValue: payload });
      setEditing(false);
    } catch (err: any) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [logic, requirementId, queryClient, targetType, triggerLogic, logChange]);

  const handleCancel = () => {
    setLogic(
      (triggerLogic && typeof triggerLogic === 'object' && !Array.isArray(triggerLogic))
        ? { ...(triggerLogic as Record<string, unknown>) }
        : {}
    );
    setEditing(false);
  };

  const updateField = (key: string, value: unknown) => {
    setLogic((prev) => ({ ...prev, [key]: value }));
  };

  const removeField = (key: string) => {
    setLogic((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addField = (key: string) => {
    const def = availableKeys.find((k) => k.key === key);
    if (!def) return;
    let defaultVal: unknown;
    switch (def.type) {
      case 'boolean': defaultVal = true; break;
      case 'number': defaultVal = 0; break;
      case 'string': defaultVal = ''; break;
      case 'string_array': defaultVal = []; break;
      case 'string_or_array': defaultVal = ''; break;
    }
    setLogic((prev) => ({ ...prev, [key]: defaultVal }));
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Trigger Logic (rå JSON)</span>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-7 text-xs gap-1">
            <Pencil className="h-3 w-3" /> Redigera
          </Button>
        </div>
        <pre className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded whitespace-pre-wrap">
          {JSON.stringify(triggerLogic, null, 2) || 'null (matchar alla)'}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-background">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Redigera Trigger Logic</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 text-xs gap-1">
            <X className="h-3 w-3" /> Avbryt
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
            <Save className="h-3 w-3" /> {saving ? 'Sparar...' : 'Spara'}
          </Button>
        </div>
      </div>

      {Object.entries(logic).map(([key, value]) => {
        const def = availableKeys.find((k) => k.key === key);
        const label = def?.label || key;
        const type = def?.type || 'string';

        return (
          <div key={key} className="flex items-center gap-2">
            <Label className="text-xs w-40 shrink-0">{label}</Label>
            <div className="flex-1">
              {type === 'boolean' && (
                <Switch
                  checked={value === true}
                  onCheckedChange={(checked) => updateField(key, checked)}
                />
              )}
              {type === 'number' && (
                <Input
                  type="number"
                  value={typeof value === 'number' ? value : 0}
                  onChange={(e) => updateField(key, Number(e.target.value))}
                  className="h-8 text-sm"
                />
              )}
              {type === 'string' && (
                <Input
                  value={typeof value === 'string' ? value : ''}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="h-8 text-sm"
                />
              )}
              {type === 'string_or_array' && (
                <div className="space-y-1">
                  {(() => {
                    const items = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : []);
                    const options = key === 'type' || key === 'linked_to_facility_type'
                      ? FACILITY_TYPES
                      : key === 'system_category'
                        ? SYSTEM_CATEGORIES
                        : [];

                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {items.map((item: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs gap-1">
                              {item}
                              <button onClick={() => {
                                const next = items.filter((_: string, idx: number) => idx !== i);
                                updateField(key, next.length === 1 ? next[0] : next.length === 0 ? '' : next);
                              }}>
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        {options.length > 0 ? (
                          <Select onValueChange={(v) => {
                            const next = [...items, v];
                            updateField(key, next.length === 1 ? next[0] : next);
                          }}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Lägg till..." />
                            </SelectTrigger>
                            <SelectContent>
                              {options.filter((o) => !items.includes(o)).map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Skriv värde och tryck Enter"
                            className="h-8 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const v = (e.target as HTMLInputElement).value.trim();
                                if (v) {
                                  const next = [...items, v];
                                  updateField(key, next.length === 1 ? next[0] : next);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {type === 'string_array' && (
                <div className="space-y-1">
                  {(() => {
                    const items = Array.isArray(value) ? value : [];
                    const options = key === 'construction_type' ? CONSTRUCTION_TYPES : [];
                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {items.map((item: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs gap-1">
                              {item}
                              <button onClick={() => {
                                updateField(key, items.filter((_: string, idx: number) => idx !== i));
                              }}>
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        {options.length > 0 ? (
                          <Select onValueChange={(v) => updateField(key, [...items, v])}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Lägg till..." />
                            </SelectTrigger>
                            <SelectContent>
                              {options.filter((o) => !items.includes(o)).map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Skriv värde och tryck Enter"
                            className="h-8 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const v = (e.target as HTMLInputElement).value.trim();
                                if (v) {
                                  updateField(key, [...items, v]);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeField(key)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        );
      })}

      {unusedKeys.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Plus className="h-3 w-3 text-muted-foreground" />
          <Select onValueChange={addField}>
            <SelectTrigger className="h-8 text-xs w-48">
              <SelectValue placeholder="Lägg till villkor..." />
            </SelectTrigger>
            <SelectContent>
              {unusedKeys.map((k) => (
                <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {Object.keys(logic).length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Inga villkor = kravet matchar alla {targetType === 'system' ? 'system' : 'anläggningar'}
        </p>
      )}
    </div>
  );
}
