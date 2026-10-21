import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Paperclip, Loader2, X, FileText } from 'lucide-react';

interface EvidenceCellProps {
  mappingId: string;
  fileName: string | null;
  path: string | null;
  onChange: (values: { evidence_url: string | null; evidence_file_name: string | null }) => void;
}

export function EvidenceCell({ mappingId, fileName, path, onChange }: EvidenceCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const objectPath = `${mappingId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error } = await supabase.storage.from('test-evidence').upload(objectPath, file, { upsert: true });
      if (error) throw error;
      onChange({ evidence_url: objectPath, evidence_file_name: file.name });
    } catch (error: any) {
      toast.error('Uppladdning misslyckades: ' + error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('test-evidence').createSignedUrl(path, 300);
    if (error || !data) {
      toast.error('Kunde inte öppna verifikatet');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const handleRemove = async () => {
    if (path) await supabase.storage.from('test-evidence').remove([path]);
    onChange({ evidence_url: null, evidence_file_name: null });
  };

  if (busy) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />
      {path ? (
        <>
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1 text-xs text-primary underline max-w-[140px] truncate"
            title={fileName ?? 'Verifikat'}
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{fileName ?? 'Verifikat'}</span>
          </button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleRemove} aria-label="Ta bort verifikat">
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => inputRef.current?.click()}>
          <Paperclip className="h-3 w-3 mr-1" /> Ladda upp
        </Button>
      )}
    </div>
  );
}
