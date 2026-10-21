// Type definitions for Security Domains

export type RequirementLevel = 'strategic' | 'mandatory' | 'recommended';

export interface SecurityDomain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priority_order: number;
  icon: string;
  color: string;
  created_at: string;
}

export interface DomainChecklist {
  id: string;
  domain_id: string;
  title: string;
  description?: string;
  action_items?: ActionItem[];
  priority: number;
  created_at: string;
  security_domains?: SecurityDomain;
}

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface DomainWithStats extends SecurityDomain {
  total_requirements: number;
  compliant_count: number;
  pending_count: number;
  compliance_percentage: number;
  coverage_percentage?: number;
  compliance_value?: number | null;
}

// Icon mapping for Lucide icons
export const DOMAIN_ICONS: Record<string, string> = {
  'Shield': 'Shield',
  'Lock': 'Lock',
  'Server': 'Server',
  'Mountain': 'Mountain',
  'Activity': 'Activity',
  'ClipboardCheck': 'ClipboardCheck',
};
