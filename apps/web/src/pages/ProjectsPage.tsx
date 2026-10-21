import { Link } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProjects } from '@/hooks/useProjects';
import { PROJECT_STATUS_LABELS } from '@/types/project';
import { SECURITY_LEVEL_LABELS, securityLevelCode } from '@/lib/securityLevel';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Projekt</h1>
            <p className="text-sm text-muted-foreground">
              Upphandlingar och leveranser med egen kravomfattning och testplan
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            Nytt projekt
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Laddar projekt...</p>
          ) : !projects || projects.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Inga projekt ännu. Skapa ett projekt för att samla krav, testplan och resultat för en
                upphandling.
              </p>
              <Button asChild variant="outline">
                <Link to="/projects/new">Skapa första projektet</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Anläggning</TableHead>
                  <TableHead>System / Komponenttyp</TableHead>
                  <TableHead className="text-right">Antal</TableHead>
                  <TableHead>Säkerhetsnivå</TableHead>
                  <TableHead className="text-right">Krav i omfattning</TableHead>
                  <TableHead className="text-right">Testplanerade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to={`/projects/${project.id}`} className="hover:underline">
                        {project.name}
                      </Link>
                      {project.supplier_name && (
                        <p className="text-xs text-muted-foreground">
                          Leverantör: {project.supplier_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {project.facility_name ?? 'Fristående'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.system_name ?? '–'}
                      {project.component_type_name && (
                        <span className="text-muted-foreground"> / {project.component_type_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{project.unit_count ?? '–'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SECURITY_LEVEL_LABELS[securityLevelCode(project.target_sl ?? 0)]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {project.requirement_count}
                      {project.not_applicable_count > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          ({project.not_applicable_count} ej tillämpliga)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{project.mapped_count}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
