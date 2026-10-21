import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import { buildSourceLink, sourceLinkLabel, isPdfUrl } from '@/lib/sourceLink';
import type { TestMappingWithDetails } from '@/hooks/useTestMappings';
import {
  TEST_PHASE_LABELS, TEST_TYPE_LABELS, RESULT_STATUS_LABELS, RESPONSIBLE_ORG_LABELS,
  type TestPhase, type TestType, type ResponsibleOrg,
} from './constants';

interface RequirementPanelProps {
  mapping: TestMappingWithDetails | null;
  rounds: TestMappingWithDetails[];
  onOpenChange: (open: boolean) => void;
  decision?: ReactNode;
}

function applicabilityLabel(value: boolean | null) {
  if (value == null) return 'Ej bedömt';
  return value ? 'Ja' : 'Nej';
}

export function RequirementPanel({ mapping, rounds, onOpenChange, decision }: RequirementPanelProps) {
  if (!mapping) return null;

  return (
    <Sheet open={!!mapping} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">{mapping.requirement_chapter}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 text-sm">
          {decision && (
            <section className="space-y-2 rounded-md border p-3">
              <h3 className="text-xs font-medium text-muted-foreground">
                Beslut för detta test ({mapping.test_phase ?? 'ingen fas'})
              </h3>
              {decision}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Kravtext</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{mapping.requirement_description}</p>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Källa</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{mapping.source_name ?? 'Okänd källa'}</Badge>
              {(() => {
                const isPdfSource = mapping.source_url ? isPdfUrl(mapping.source_url) : true;
                const label = sourceLinkLabel({
                  documentUrl: mapping.source_url,
                  page: mapping.requirement_page,
                  chapterSection: mapping.requirement_chapter,
                });
                const href = buildSourceLink({
                  documentUrl: mapping.source_url,
                  page: mapping.requirement_page,
                  excerpt: mapping.requirement_excerpt,
                  chapterSection: mapping.requirement_chapter,
                });

                return (
                  <>
                    {label ? (
                      <Badge variant="secondary">{isPdfSource ? `Sida ${mapping.requirement_page}` : label}</Badge>
                    ) : isPdfSource ? (
                      <Badge variant="outline" className="text-muted-foreground">Sidhänvisning saknas</Badge>
                    ) : null}
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        {label
                          ? `Öppna ${mapping.source_name ?? 'dokument'}, ${label}`
                          : 'Öppna dokument'}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                );
              })()}
            </div>
            {mapping.requirement_excerpt && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Originaltext ur källan</p>
                <p className="text-xs whitespace-pre-wrap leading-relaxed italic">{mapping.requirement_excerpt}</p>
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Objekt</h3>
            <dl className="grid grid-cols-2 gap-2">
              <div><dt className="text-muted-foreground text-xs">System</dt><dd>{mapping.system_name || '–'}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Komponent</dt><dd>{mapping.asset_name || '–'}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Anläggningsklass</dt><dd>{mapping.classification_level ? `L${mapping.classification_level}` : '–'}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Kravets säkerhetsnivå</dt><dd>{mapping.requirement_sl ? `SL ${mapping.requirement_sl}` : '–'}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Tillämpligt</dt><dd>{applicabilityLabel(mapping.is_applicable)}</dd></div>
            </dl>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Testkedja ({rounds.length} {rounds.length === 1 ? 'omgång' : 'omgångar'})
            </h3>
            <div className="space-y-2">
              {rounds.map(round => (
                <div key={round.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {round.test_phase ? TEST_PHASE_LABELS[round.test_phase as TestPhase] : 'Ingen fas'}
                      </Badge>
                      {round.project_name && (
                        <Badge variant="secondary" className="font-normal">{round.project_name}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {RESULT_STATUS_LABELS[round.result_status]}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {round.test_type ? TEST_TYPE_LABELS[round.test_type as TestType] : 'Ingen testtyp'}
                    {' · '}
                    {round.responsible_party || round.responsible_org
                      ? round.responsible_party || RESPONSIBLE_ORG_LABELS[round.responsible_org as ResponsibleOrg]
                      : 'Ingen ansvarig'}
                    {round.tested_at ? ` · ${round.tested_at}` : ''}
                  </p>

                  <dl className="space-y-1 text-xs">
                    {round.test_method && (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">Testmetod:</dt>
                        <dd>{round.test_method}</dd>
                      </div>
                    )}
                    {round.acceptance_criteria && (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">Acceptanskriterium:</dt>
                        <dd>{round.acceptance_criteria}</dd>
                      </div>
                    )}
                    {round.tested_by && (
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground shrink-0">Utförd av:</dt>
                        <dd>{round.tested_by}</dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground shrink-0">Verifikat:</dt>
                      <dd>
                        {round.evidence_url ? (
                          <a
                            href={round.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {round.evidence_file_name || round.evidence || 'Öppna verifikat'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          round.evidence_file_name || round.evidence || (
                            <span className="text-muted-foreground">Saknas</span>
                          )
                        )}
                      </dd>
                    </div>
                  </dl>

                  {round.deviation && <p className="text-xs text-destructive">{round.deviation}</p>}
                  {round.comment && <p className="text-xs text-muted-foreground italic">{round.comment}</p>}
                </div>
              ))}
            </div>
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
