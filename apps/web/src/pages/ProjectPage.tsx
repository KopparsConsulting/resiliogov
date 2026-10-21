import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectForm } from '@/components/project/ProjectForm';
import { ProjectRequirementScope } from '@/components/project/ProjectRequirementScope';
import { ProjectTestPlan } from '@/components/project/ProjectTestPlan';
import { MetricPair } from '@/components/compliance/ComplianceMetricsDisplay';
import { useDeleteProject, useProject, useUpdateProject } from '@/hooks/useProjects';
import { useProjectMetrics } from '@/hooks/useProjectMetrics';
import { PROJECT_STATUS_LABELS } from '@/types/project';
import { SECURITY_LEVEL_LABELS, securityLevelCode } from '@/lib/securityLevel';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: metrics } = useProjectMetrics(id, project?.system_id ?? null);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Laddar projekt...</div>;
  if (!project) return <div className="p-6 text-sm text-muted-foreground">Projektet hittades inte.</div>;

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Alla projekt
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {project.facility_name ?? 'Fristående upphandling'}
              {project.system_name && ` · ${project.system_name}`}
              {project.component_type_name && ` · ${project.component_type_name}`}
              {project.unit_count ? ` · ${project.unit_count} enheter` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {SECURITY_LEVEL_LABELS[securityLevelCode(project.target_sl ?? 0)]}
          </Badge>
          <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Krav i omfattning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics?.scopeCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Testplanerade krav
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metrics?.plannedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {metrics?.unplannedCount ?? 0} krav saknar testaktivitet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bedömning av kraven
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetricPair
              coverage={metrics?.coverage ?? 0}
              compliance={metrics?.compliance ?? null}
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scope">
        <TabsList>
          <TabsTrigger value="scope">Kravomfattning</TabsTrigger>
          <TabsTrigger value="plan">Testplan</TabsTrigger>
          <TabsTrigger value="settings">Projektuppgifter</TabsTrigger>
        </TabsList>

        <TabsContent value="scope" className="mt-4">
          <ProjectRequirementScope
            projectId={project.id}
            projectName={project.name}
            targetSl={project.target_sl ?? 0}
            componentTypeId={project.component_type_id}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <ProjectTestPlan
            projectId={project.id}
            projectName={project.name}
            systemId={project.system_id}
          />

        </TabsContent>

        <TabsContent value="settings" className="mt-4 max-w-3xl space-y-4">
          <ProjectForm
            initial={project}
            submitLabel="Spara ändringar"
            isSaving={updateProject.isPending}
            onSubmit={(values) => updateProject.mutate({ id: project.id, ...values })}
          />
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() =>
              deleteProject.mutate(project.id, { onSuccess: () => navigate('/projects') })
            }
          >
            Ta bort projektet
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
