import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDomainChecklists } from '@/hooks/useDomains';
import { useDomainCompliance } from '@/hooks/useDomainCompliance';
import { useManagerChecklistData } from '@/hooks/useManagerChecklistData';
import { ChecklistWarningCard } from './ChecklistWarningCard';

// Default checklist items for managers
const DEFAULT_CHECKLIST_ITEMS = [
  {
    id: 'inv-1',
    category: 'Inventera & Äg',
    items: [
      { id: 'inv-1-1', text: 'Säkerställ att varje anläggning har en namngiven ägare', warningKey: 'facilities' },
      { id: 'inv-1-2', text: 'Säkerställ att varje IT-system har en systemägare', warningKey: 'systems' },
      { id: 'inv-1-3', text: 'Verifiera att budget för säkerhetsåtgärder finns', warningKey: null },
    ],
  },
  {
    id: 'klass-2',
    category: 'Klassificera',
    items: [
      { id: 'klass-2-1', text: 'Identifiera vilka system som är "Väsentliga" enligt NIS2', warningKey: 'criticalUnlinked' },
      { id: 'klass-2-2', text: 'Identifiera vilka system som är "Centrala" enligt MSBFS', warningKey: 'central' },
      { id: 'klass-2-3', text: 'Prioritera dessa i säkerhetsarbetet', warningKey: null },
    ],
  },
  {
    id: 'tech-3',
    category: 'Tekniska Skulder',
    items: [
      { id: 'tech-3-1', text: 'Inför MFA om det saknas', warningKey: 'techDebt' },
      { id: 'tech-3-2', text: 'Implementera nätverkssegmentering', warningKey: 'techDebt' },
      { id: 'tech-3-3', text: 'Planera in kvartalsvisa återställningstester för kritiska system', warningKey: null },
    ],
  },
  {
    id: 'lev-4',
    category: 'Leveranskedjan',
    items: [
      { id: 'lev-4-1', text: 'Se över avtal med leverantörer', warningKey: null },
      { id: 'lev-4-2', text: 'Ställ krav på säkerhetsanalys i upphandlingar', warningKey: null },
      { id: 'lev-4-3', text: 'Krav på incidentrapportering enligt TSFS 2022:14', warningKey: null },
    ],
  },
  {
    id: 'ov-5',
    category: 'Övningar',
    items: [
      { id: 'ov-5-1', text: 'Planera IT-incidentövning', warningKey: null },
      { id: 'ov-5-2', text: 'Planera fysisk tunnelövning (fullskalig vart 4:e år)', warningKey: null },
      { id: 'ov-5-3', text: 'Genomför partiell övning årligen', warningKey: null },
    ],
  },
];

export function ManagerChecklist() {
  const { isLoading: checklistsLoading } = useDomainChecklists();
  const { data: domains, isLoading: domainsLoading } = useDomainCompliance();
  const checklistData = useManagerChecklistData();
  
  const [localItems, setLocalItems] = useState(
    DEFAULT_CHECKLIST_ITEMS.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({ ...item, completed: false })),
    }))
  );

  const isLoading = checklistsLoading || domainsLoading || checklistData.isLoading;

  const handleToggle = (categoryId: string, itemId: string) => {
    setLocalItems(prev => 
      prev.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            items: category.items.map(item => 
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          };
        }
        return category;
      })
    );
  };

  const totalItems = localItems.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = localItems.reduce(
    (sum, cat) => sum + cat.items.filter(i => i.completed).length, 
    0
  );
  const progressPercentage = Math.round((completedItems / totalItems) * 100);

  // Find critical domains
  const criticalDomains = domains?.filter(d => d.compliance_percentage < 50) ?? [];

  // Calculate category-level warning counts
  const getCategoryWarningCount = (categoryId: string): number => {
    switch (categoryId) {
      case 'inv-1':
        return checklistData.facilitiesWithoutOwner.length + checklistData.systemsWithoutOwner.length;
      case 'klass-2':
        return checklistData.criticalSystemsWithoutFacility.length;
      case 'tech-3':
        return checklistData.techDebtItems.length;
      default:
        return 0;
    }
  };

  // Render warning card based on warning key
  const renderWarningCard = (warningKey: string | null) => {
    if (!warningKey) return null;

    switch (warningKey) {
      case 'facilities':
        return (
          <ChecklistWarningCard
            items={checklistData.facilitiesWithoutOwner.map(f => ({
              id: f.id,
              name: f.name,
              linkTo: `/facility/${f.id}`,
              subtitle: f.type,
            }))}
            successMessage="Alla anläggningar har en ägare"
            warningMessage={(count) => `${count} anläggning${count > 1 ? 'ar' : ''} saknar ägare`}
            className="mt-2"
          />
        );
      case 'systems':
        return (
          <ChecklistWarningCard
            items={checklistData.systemsWithoutOwner.map(s => ({
              id: s.id,
              name: s.name,
              linkTo: `/systems/${s.id}`,
              subtitle: s.system_type,
            }))}
            successMessage="Alla system har en systemägare"
            warningMessage={(count) => `${count} system saknar systemägare`}
            className="mt-2"
          />
        );
      case 'criticalUnlinked':
        return (
          <ChecklistWarningCard
            items={checklistData.criticalSystemsWithoutFacility.map(s => ({
              id: s.id,
              name: s.name,
              linkTo: `/systems/${s.id}`,
              subtitle: `${s.system_type} - ej kopplat till anläggning`,
            }))}
            successMessage="Alla kritiska system är kopplade till anläggningar"
            warningMessage={(count) => `${count} kritiskt system utan anläggningskoppling`}
            className="mt-2"
          />
        );
      case 'central':
        if (checklistData.centralSystems.length === 0) {
          return (
            <div className="mt-2 flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Inga system markerade som centrala ännu</span>
            </div>
          );
        }
        return (
          <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2">
            <p className="text-sm font-medium text-primary mb-1">
              {checklistData.centralSystems.length} centralt system:
            </p>
            <div className="space-y-1">
              {checklistData.centralSystems.map(s => (
                <a
                  key={s.id}
                  href={`/systems/${s.id}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <span className="text-primary">→</span>
                  <span>{s.name}</span>
                  <span className="text-muted-foreground text-xs">({s.system_type})</span>
                </a>
              ))}
            </div>
          </div>
        );
      case 'techDebt':
        return (
          <ChecklistWarningCard
            items={checklistData.techDebtItems.slice(0, 5).map(t => ({
              id: t.id,
              name: t.system_name,
              linkTo: `/systems/${t.system_id}`,
              subtitle: t.requirement_description.slice(0, 60) + '...',
            }))}
            successMessage="Inga tekniska skulder identifierade"
            warningMessage={(count) => `${count} krav ej påbörjade`}
            className="mt-2"
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Checklista för Chefer</h1>
        <p className="text-muted-foreground">
          Vad behöver göras nu? Prioriterade åtgärder baserat på NIS2, CER och MSB.
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Åtgärdsframsteg</span>
            <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'}>
              {completedItems} / {totalItems}
            </Badge>
          </CardTitle>
          <CardDescription>
            {progressPercentage}% av prioriterade åtgärder genomförda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-secondary rounded-full h-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {criticalDomains.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Kritiska områden kräver omedelbar åtgärd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalDomains.map(domain => (
                <div 
                  key={domain.id} 
                  className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg"
                >
                  <span className="font-medium">{domain.name}</span>
                  <Badge variant="destructive">{domain.compliance_percentage}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Categories */}
      <div className="grid gap-4 md:grid-cols-2">
        {localItems.map(category => {
          const categoryCompleted = category.items.filter(i => i.completed).length;
          const allCompleted = categoryCompleted === category.items.length;
          const warningCount = getCategoryWarningCount(category.id);

          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <span>{category.category}</span>
                    {warningCount > 0 && (
                      <Badge variant="outline" className="bg-status-warning/10 text-status-warning border-status-warning/30 dark:bg-status-warning/10 dark:text-status-warning dark:border-status-warning/30">
                        ⚠️ {warningCount}
                      </Badge>
                    )}
                  </div>
                  {allCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-status-success" />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {categoryCompleted}/{category.items.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.items.map(item => (
                    <div key={item.id}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={item.completed}
                          onCheckedChange={() => handleToggle(category.id, item.id)}
                        />
                        <label 
                          htmlFor={item.id}
                          className={`text-sm cursor-pointer ${
                            item.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {item.text}
                        </label>
                      </div>
                      {!item.completed && renderWarningCard(item.warningKey)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Important Notice */}
      <Card className="bg-accent/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium">Kom ihåg</p>
              <p className="text-sm text-muted-foreground">
                Säkerhet är inte en IT-fråga, det är en förutsättning för att Trafikverket ska kunna leverera sin samhällsviktiga tjänst.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
