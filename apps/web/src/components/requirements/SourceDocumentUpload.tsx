import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, FileText, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  sourceId: string;
  sourceName: string;
  documentUrl: string | null;
}

export function SourceDocumentUpload({ sourceId, sourceName, documentUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: 'Fel', description: 'Endast PDF-filer stöds', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${sourceId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('requirement-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('requirement-documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('requirement_sources')
        .update({ document_url: urlData.publicUrl } as any)
        .eq('id', sourceId);

      if (updateError) throw updateError;

      toast({ title: 'Uppladdad', description: `${file.name} har länkats till ${sourceName}` });
      queryClient.invalidateQueries({ queryKey: ['requirement-sources-with-counts'] });
    } catch (err: any) {
      toast({ title: 'Fel vid uppladdning', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from('requirement_sources')
        .update({ document_url: null } as any)
        .eq('id', sourceId);

      if (error) throw error;

      toast({ title: 'Borttaget', description: 'Dokumentlänk borttagen' });
      queryClient.invalidateQueries({ queryKey: ['requirement-sources-with-counts'] });
    } catch (err: any) {
      toast({ title: 'Fel', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {documentUrl ? (
        <>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="h-3 w-3" /> Visa PDF
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRemove}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </>
      ) : (
        <>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? 'Laddar upp...' : 'Ladda upp PDF'}
          </Button>
        </>
      )}
    </div>
  );
}
