import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Search, AlertTriangle, Info, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  MANUAL_CHAPTERS,
  MANUAL_DATE,
  MANUAL_DOCX_URL,
  MANUAL_VERSION,
  type ManualBlock,
  type ManualChapter,
} from '@/content/manual';
import { cn } from '@/lib/utils';

/** Renders **bold** markup and "\n" line breaks as React nodes. */
function renderInline(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {lineIndex > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
        part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
          <strong key={partIndex} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={partIndex}>{part}</Fragment>
        ),
      )}
    </Fragment>
  ));
}

function blockText(block: ManualBlock): string {
  switch (block.t) {
    case 'ul':
    case 'ol':
      return block.items.join(' ');
    case 'table':
      return [...block.headers, ...block.rows.flat()].join(' ');
    case 'note':
      return [block.title, ...block.lines].join(' ');
    default:
      return block.text;
  }
}

function chapterMatches(chapter: ManualChapter, query: string): boolean {
  const haystack = [chapter.title, ...chapter.blocks.map(blockText)]
    .join(' ')
    .replace(/\*\*/g, '')
    .toLowerCase();
  return haystack.includes(query);
}

function ManualBlockView({ block }: { block: ManualBlock }) {
  switch (block.t) {
    case 'h2':
      return <h3 className="text-base font-semibold text-foreground pt-4">{renderInline(block.text)}</h3>;
    case 'h3':
      return <h4 className="text-sm font-semibold text-foreground pt-2">{renderInline(block.text)}</h4>;
    case 'p':
      return <p className="text-sm text-muted-foreground leading-relaxed">{renderInline(block.text)}</p>;
    case 'ul':
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {block.items.map((listItem, index) => (
            <li key={index}>{renderInline(listItem)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          {block.items.map((listItem, index) => (
            <li key={index}>{renderInline(listItem)}</li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {block.headers.map((header, index) => (
                  <TableHead key={index} className="whitespace-nowrap">{renderInline(header)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="align-top text-sm">{renderInline(cell)}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    case 'note': {
      const Icon = block.warn ? AlertTriangle : Info;
      return (
        <div
          className={cn(
            'rounded-md border-l-4 p-4 space-y-2',
            block.warn ? 'border-destructive bg-destructive/10' : 'border-primary bg-muted/50',
          )}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className={cn('h-4 w-4', block.warn ? 'text-destructive' : 'text-primary')} />
            {block.title}
          </p>
          {block.lines.map((line, index) => (
            <p key={index} className="text-sm text-muted-foreground">{renderInline(line)}</p>
          ))}
        </div>
      );
    }
  }
}

export default function ManualPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleChapters = useMemo(
    () => (normalizedQuery ? MANUAL_CHAPTERS.filter(chapter => chapterMatches(chapter, normalizedQuery)) : MANUAL_CHAPTERS),
    [normalizedQuery],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Manual</h1>
          <p className="text-sm text-muted-foreground">
            Användarmanual {MANUAL_VERSION} · {MANUAL_DATE}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={MANUAL_DOCX_URL} download>
            <Download className="h-4 w-4 mr-1" /> Ladda ner som Word
          </a>
        </Button>
      </div>

      <div className="space-y-2 max-w-md">
        <Label htmlFor="manual-search">Sök i manualen</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="manual-search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="T.ex. kravprofil, SAT, upphäva"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Innehåll</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {visibleChapters.map(chapter => (
                  <li key={chapter.id}>
                    <a href={`#${chapter.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                      {chapter.title}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </nav>

        <div className="space-y-6 min-w-0">
          {visibleChapters.length === 0 && (
            <p className="text-sm text-muted-foreground">Inga kapitel matchar ”{searchQuery}”.</p>
          )}
          {visibleChapters.map(chapter => (
            <Card key={chapter.id} id={chapter.id} className="scroll-mt-4">
              <CardHeader>
                <CardTitle className="text-lg">{chapter.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chapter.blocks.map((block, index) => (
                  <ManualBlockView key={index} block={block} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
