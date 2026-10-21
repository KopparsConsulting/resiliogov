import { Badge } from '@/components/ui/badge';
import {
  ADDRESSEE_DESCRIPTIONS,
  ADDRESSEE_LABELS,
  MEASURE_SCALE_LABELS,
  MEASURE_SCALE_SHORT,
  effectiveAddressee,
  type MeasureScale,
  type RequirementAddressee,
} from '@/lib/requirementAddressee';

interface AddresseeBadgesProps {
  addressee: RequirementAddressee;
  measureScale: MeasureScale;
  targetType?: string | null;
  slCapability?: number | null;
  mlCapability?: number | null;
  /** Hide the badge for ordinary asset requirements to reduce noise in long lists. */
  hideAsset?: boolean;
}

/** Badge for who a requirement addresses and which scale it is measured on. */
export function AddresseeBadges({
  addressee,
  measureScale,
  targetType,
  slCapability,
  mlCapability,
  hideAsset = false,
}: AddresseeBadgesProps) {
  const effective = effectiveAddressee(addressee, targetType);
  const scaleShort = MEASURE_SCALE_SHORT[measureScale];
  const level = measureScale === 'maturity_level' ? mlCapability : slCapability;

  return (
    <>
      {!(hideAsset && effective === 'asset') && (
        <Badge
          variant={effective === 'asset' ? 'outline' : 'default'}
          className="text-[10px]"
          title={ADDRESSEE_DESCRIPTIONS[effective]}
        >
          {ADDRESSEE_LABELS[effective]}
        </Badge>
      )}
      {scaleShort && (
        <Badge variant="secondary" className="text-[10px]" title={MEASURE_SCALE_LABELS[measureScale]}>
          {level != null ? `${scaleShort} ${level}` : scaleShort}
        </Badge>
      )}
    </>
  );
}
