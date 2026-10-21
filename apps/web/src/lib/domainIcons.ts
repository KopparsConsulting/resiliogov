import {
  Activity, ClipboardCheck, LifeBuoy, Lock, Mountain, Network, Server, Shield, Siren,
  type LucideIcon,
} from 'lucide-react';

/** Ikoner för säkerhetsdomäner (kolumnen security_domains.icon). En lista för hela appen. */
export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  Shield, Lock, Network, Server, Activity, Siren, LifeBuoy, Mountain, ClipboardCheck,
};

export function domainIcon(name: string | null | undefined): LucideIcon {
  return (name && DOMAIN_ICONS[name]) || Shield;
}
