import { useState } from 'react';
import { ChevronDown, Library } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRequirementSources, useUpdateRequirementSource } from '@/hooks/useRequirementSources';
import {
  ADDRESSEES,
  ADDRESSEE_DESCRIPTIONS,
  ADDRESSEE_LABELS,
  MEASURE_SCALES,
  MEASURE_SCALE_LABELS,
  type MeasureScale,
  type RequirementAddressee,
} from '@/lib/requirementAddressee';

/** Administration of recipient and measurement scale per regulatory source. */
export function RequirementSourcesAdminCard() {
  const { data: sources = [] } = useRequirementSources();
  const updateSource = useUpdateRequirementSource();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Library className="h-4 w-4" />
                Regelverk – mottagare och mätskala
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Leverantörs- och organisationskrav matchas aldrig mot anläggningar, system eller komponenter.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regelverk</TableHead>
                  <TableHead className="w-[90px] text-right">Krav</TableHead>
                  <TableHead className="w-[230px]">Mottagare</TableHead>
                  <TableHead className="w-[230px]">Mätskala</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="text-sm">{source.document_name}</TableCell>
                    <TableCell className="text-right text-sm">{source.requirement_count}</TableCell>
                    <TableCell>
                      <Select
                        value={source.addressee}
                        onValueChange={(value) =>
                          updateSource.mutate({ id: source.id, addressee: value as RequirementAddressee })
                        }
                      >
                        <SelectTrigger aria-label={`Mottagare för ${source.document_name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ADDRESSEES.map((addressee) => (
                            <SelectItem key={addressee} value={addressee}>
                              <div>
                                <div>{ADDRESSEE_LABELS[addressee]}</div>
                                <div className="text-xs text-muted-foreground">{ADDRESSEE_DESCRIPTIONS[addressee]}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={source.measure_scale}
                        onValueChange={(value) =>
                          updateSource.mutate({ id: source.id, measure_scale: value as MeasureScale })
                        }
                      >
                        <SelectTrigger aria-label={`Mätskala för ${source.document_name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEASURE_SCALES.map((scale) => (
                            <SelectItem key={scale} value={scale}>{MEASURE_SCALE_LABELS[scale]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
