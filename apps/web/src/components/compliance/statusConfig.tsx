import { CheckCircle2, Clock, CircleDashed, XCircle, MinusCircle, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComplianceStatus } from '@/types/compliance';

export interface StatusStyle {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  badgeClass: string;
}

export const STATUS_STYLES: Record<ComplianceStatus, StatusStyle> = {
  'Ej påbörjad': {
    icon: CircleDashed,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
  'Pågående': {
    icon: Clock,
    color: 'text-status-pending',
    bgColor: 'bg-status-pending/10',
    badgeClass: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  },
  'Delvis uppfyllt': {
    icon: AlertTriangle,
    color: 'text-status-warning',
    bgColor: 'bg-status-warning/10',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  },
  'Uppfyllt': {
    icon: CheckCircle2,
    color: 'text-status-success',
    bgColor: 'bg-status-success/10',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/20',
  },
  'Ej uppfyllt': {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  'Ej tillämpligt': {
    icon: MinusCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};
