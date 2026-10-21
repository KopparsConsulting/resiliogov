import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Trash2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFacilities } from '@/hooks/useFacilities';
import { useLinkFacilityToSystem, useUnlinkFacilityFromSystem } from '@/hooks/useInformationSystems';
import type { FacilitySystem } from '@/types/system';
import { relationTypeLabels, criticalityLabels } from '@/types/system';

interface SystemFacilitiesListProps {
  facilities: FacilitySystem[];
  systemId: string;
}

export function SystemFacilitiesList({ facilities, systemId }: SystemFacilitiesListProps) {
  const navigate = useNavigate();
  const { data: allFacilities } = useFacilities();
  const linkFacility = useLinkFacilityToSystem();
  const unlinkFacility = useUnlinkFacilityFromSystem();
  const [open, setOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState('');
  const [relationType, setRelationType] = useState<'styr' | 'övervakar' | 'betjänar' | 'stödjer'>('betjänar');
  const [criticality, setCriticality] = useState<'critical' | 'important' | 'supporting'>('important');

  const linkedFacilityIds = new Set(facilities.map(f => f.facility_id));
  const availableFacilities = allFacilities?.filter(f => !linkedFacilityIds.has(f.id)) || [];

  const handleLink = async () => {
    if (!selectedFacility) return;
    await linkFacility.mutateAsync({
      facilityId: selectedFacility,
      systemId,
      relationType,
      criticality,
    });
    setOpen(false);
    setSelectedFacility('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Koppla anläggning
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Koppla anläggning till system</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Anläggning</Label>
                <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj anläggning" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFacilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relationstyp</Label>
                <Select 
                  value={relationType} 
                  onValueChange={(v) => setRelationType(v as 'styr' | 'övervakar' | 'betjänar' | 'stödjer')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(relationTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kritikalitet</Label>
                <Select 
                  value={criticality} 
                  onValueChange={(v) => setCriticality(v as 'critical' | 'important' | 'supporting')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(criticalityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={handleLink}
                disabled={!selectedFacility || linkFacility.isPending}
              >
                <Link className="mr-2 h-4 w-4" />
                Koppla
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-3 rounded-full bg-muted mb-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Inga anläggningar kopplade</p>
            <p className="text-sm text-muted-foreground">
              Koppla fysiska anläggningar som detta system betjänar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {facilities.map((link) => (
            <Card 
              key={link.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/facility/${link.facility_id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{link.facilities?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {link.facilities?.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {relationTypeLabels[link.relation_type]}
                        </Badge>
                        <Badge 
                          variant={link.criticality === 'critical' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          {criticalityLabels[link.criticality]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      unlinkFacility.mutate({ 
                        facilityId: link.facility_id, 
                        systemId 
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
