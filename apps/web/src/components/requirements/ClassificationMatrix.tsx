import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ShieldCheck, Info } from 'lucide-react';
import type { RequirementWithDetails } from '@/hooks/useRequirements';
import { useClassSlMapping } from '@/hooks/useClassSlMapping';
import {
  getTargetSecurityLevel,
  requirementAppliesToLevel,
  securityLevelCode,
  SECURITY_LEVEL_LABELS,
} from '@/lib/securityLevel';

interface Props {
  requirements: RequirementWithDetails[];
}

const EXAMPLES: Record<number, string> = {
  1: 'Mindre, isolerad anläggning utan extern uppkoppling.',
  2: 'Anläggning med begränsad nätverksexponering.',
  3: 'Samhällsviktig anläggning med extern uppkoppling.',
  4: 'Kritisk infrastruktur med farligt gods eller hög trafikvolym.',
  5: 'Nationellt kritisk anläggning.',
};

export function ClassificationMatrix({ requirements }: Props) {
  const [open, setOpen] = useState(false);
  const { data: mapping } = useClassSlMapping();

  const rows = useMemo(() => {
    // Live figures: exactly the same rule as the database function
    // get_applicable_requirements — IEC requirements are gated by the target
    // Security Level, all other sources by the classification level.
    return [1, 2, 3, 4, 5].map(level => {
      const config = mapping?.find(m => m.classification_level === level);
      const targetSl = getTargetSecurityLevel(level);
      const applicable = requirements.filter(r => requirementAppliesToLevel(r, level));
      return {
        level,
        label: config?.label ?? `Klass ${level}`,
        description: config?.description ?? '',
        example: EXAMPLES[level],
        sl: SECURITY_LEVEL_LABELS[securityLevelCode(targetSl)],
        targetSl,
        total: applicable.length,
        iec: applicable.filter(r => r.sl_capability != null).length,
      };
    });
  }, [requirements, mapping]);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Mappningsmatris: Anläggningsklass → IEC 62443-3-3 Security Level</h3>
                <p className="text-xs text-muted-foreground">Så här styr en anläggnings säkerhetsklassificering vilka cybersäkerhetskrav som blir tillämpliga</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Anläggningsklass</th>
                    <th className="text-left px-3 py-2 font-medium">IEC SL-täckning</th>
                    <th className="text-left px-3 py-2 font-medium">Innebörd</th>
                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Tillämpliga krav</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const c = row;
                    return (
                      <tr key={row.level} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">L{row.level}</Badge>
                            <span className="font-medium">{row.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Badge variant={row.level === 1 ? 'secondary' : 'default'} className="text-xs">
                            {row.sl}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 align-top text-muted-foreground">
                          <p>{row.description}</p>
                          <p className="mt-1 text-xs italic flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            Exempel: {row.example}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                          <div className="font-bold text-base">{c?.total ?? 0}</div>
                          <div className="text-xs text-muted-foreground">varav {c?.iec ?? 0} IEC</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Filtreringen är kumulativ: en anläggning på Klass N ärver alla krav från lägre klasser.
              Säkerhetsnivån (SL) sätts aldrig separat — den härleds alltid från anläggningsklassen via
              den konfigurerbara mappningstabellen. Krav från IEC 62443-3-3 styrs av sin SL-nivå enligt
              Annex B (kravet gäller när <code className="bg-muted px-1 rounded">SL-nivå ≤ målets SL</code>),
              övriga regelverk av klassnivån. Siffrorna ovan räknas live ur databasen med exakt samma
              regel som används när krav synkas till anläggningar och system.
            </p>

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
