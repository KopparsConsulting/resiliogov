import { ArrowLeft, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDomain } from '@/hooks/useDomains';
import { useRequirementsByDomain } from '@/hooks/useDomainCompliance';
import { 
  Shield, 
  Lock, 
  Server, 
  Mountain, 
  Activity, 
  ClipboardCheck 
} from 'lucide-react';
import { domainIcon } from '@/lib/domainIcons';


function getLevelBadge(level: string | null): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  switch (level) {
    case 'strategic':
      return { label: 'Strategisk', variant: 'default' };
    case 'mandatory':
      return { label: 'Ska-krav', variant: 'secondary' };
    case 'recommended':
      return { label: 'Bör-krav', variant: 'outline' };
    default:
      return { label: 'Krav', variant: 'secondary' };
  }
}

export function DomainDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { data: domain, isLoading: domainLoading } = useDomain(slug || '');
  const { data: requirements, isLoading: reqLoading } = useRequirementsByDomain(domain?.id);

  const isLoading = domainLoading || reqLoading;
  const IconComponent = domainIcon(domain?.icon);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="p-6">
        <p>Domän hittades inte.</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>
      </div>
    );
  }

  const mandatoryReqs = requirements?.filter(r => r.requirement_level === 'mandatory' || !r.requirement_level) ?? [];
  const strategicReqs = requirements?.filter(r => r.requirement_level === 'strategic') ?? [];
  const recommendedReqs = requirements?.filter(r => r.requirement_level === 'recommended') ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div 
          className="p-3 rounded-lg bg-muted text-foreground"
        >
          <IconComponent 
            className="h-6 w-6" 
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{domain.name}</h1>
          <p className="text-muted-foreground">{domain.description}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-foreground" />
              Strategiska krav
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategicReqs.length}</div>
            <p className="text-xs text-muted-foreground">NIS2/CER ledningsansvar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Ska-krav
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mandatoryReqs.length}</div>
            <p className="text-xs text-muted-foreground">Föreskrifter som ska uppfyllas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Bör-krav
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendedReqs.length}</div>
            <p className="text-xs text-muted-foreground">Allmänna råd</p>
          </CardContent>
        </Card>
      </div>

      {/* Requirements Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Krav inom domänen</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Alla ({requirements?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="strategic">Strategiska ({strategicReqs.length})</TabsTrigger>
              <TabsTrigger value="mandatory">Ska-krav ({mandatoryReqs.length})</TabsTrigger>
              <TabsTrigger value="recommended">Bör-krav ({recommendedReqs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <RequirementsList requirements={requirements ?? []} />
            </TabsContent>

            <TabsContent value="strategic" className="mt-4">
              <RequirementsList requirements={strategicReqs} />
            </TabsContent>

            <TabsContent value="mandatory" className="mt-4">
              <RequirementsList requirements={mandatoryReqs} />
            </TabsContent>

            <TabsContent value="recommended" className="mt-4">
              <RequirementsList requirements={recommendedReqs} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface Requirement {
  id: string;
  chapter_section: string;
  description: string;
  requirement_level?: string | null;
  is_general_advice: boolean;
  requirement_sources?: {
    document_name: string;
    category: string;
  } | null;
}

function RequirementsList({ requirements }: { requirements: Requirement[] }) {
  if (requirements.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        Inga krav i denna kategori.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requirements.map((req) => {
        const level = getLevelBadge(req.requirement_level ?? null);
        return (
          <div 
            key={req.id} 
            className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium font-mono">
                    {req.requirement_sources?.document_name} {req.chapter_section}
                  </span>
                  <Badge variant={level.variant}>{level.label}</Badge>
                  {req.is_general_advice && (
                    <Badge variant="outline">Allmänt råd</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{req.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
