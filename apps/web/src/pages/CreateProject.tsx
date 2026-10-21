import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { ProjectForm } from '@/components/project/ProjectForm';
import { useCreateProject } from '@/hooks/useProjects';

export default function CreateProject() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Briefcase className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Nytt projekt</h1>
          <p className="text-sm text-muted-foreground">
            Skapa en upphandling eller leverans och välj kravomfattning i nästa steg
          </p>
        </div>
      </div>

      <ProjectForm
        submitLabel="Skapa projekt"
        isSaving={createProject.isPending}
        onCancel={() => navigate('/projects')}
        onSubmit={(values) =>
          createProject.mutate(values, {
            onSuccess: (project) => navigate(`/projects/${project.id}`),
          })
        }
      />
    </div>
  );
}
