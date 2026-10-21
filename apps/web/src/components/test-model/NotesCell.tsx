import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { format } from 'date-fns';
import { useAddTestMappingNote, type TestMappingNote } from '@/hooks/useTestMappingNotes';

interface NotesCellProps {
  mappingId: string;
  notes: TestMappingNote[];
}

export function NotesCell({ mappingId, notes }: NotesCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const addNote = useAddTestMappingNote();

  const latest = notes[0];

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addNote.mutate({ mappingId, note: trimmed }, { onSuccess: () => setDraft('') });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-56 justify-start gap-2 px-2 font-normal">
          {notes.length > 0 ? (
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <MessageSquarePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-xs">
            {latest ? `${notes.length} · ${latest.note}` : <span className="text-muted-foreground">Lägg till anteckning</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 space-y-3">
        <div>
          <h4 className="text-sm font-medium">Anteckningar</h4>
          <p className="text-xs text-muted-foreground">Logg per krav och testrad — inlägg kan inte ändras i efterhand.</p>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto">
          {notes.length === 0 && (
            <p className="text-xs italic text-muted-foreground">Inga anteckningar ännu</p>
          )}
          {notes.map(note => (
            <div key={note.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{note.author_email ?? 'Okänd'}</span>
                <span className="shrink-0 font-mono">{format(new Date(note.created_at), 'yyyy-MM-dd HH:mm')}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs">{note.note}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`note-${mappingId}`} className="text-xs">Ny anteckning</Label>
          <Textarea
            id={`note-${mappingId}`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            placeholder="Beskriv observation, beslut eller nästa steg..."
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={!draft.trim() || addNote.isPending}>
              Spara anteckning
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
