import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useRegulatoryChat } from '@/hooks/useRegulatoryChat';
import { ChatMessage } from './ChatMessage';
import { ExampleQuestions } from './ExampleQuestions';
import { ChatDisclaimer } from './ChatDisclaimer';

const AVAILABLE_SOURCES = [
  { id: 'MSBFS 2020:6', label: 'MSBFS 2020:6', category: 'Informationssäkerhet' },
  { id: 'MSBFS 2020:7', label: 'MSBFS 2020:7', category: 'Informationssäkerhet' },
  { id: 'TSFS 2019:93', label: 'TSFS 2019:93', category: 'Tunnelsäkerhet' },
  { id: 'TSFS 2022:14', label: 'TSFS 2022:14', category: 'Säkerhetsskydd' },
  { id: 'PTSFS 2021:3', label: 'PTSFS 2021:3', category: 'Elektronisk kommunikation' },
  { id: 'NIS2/CER', label: 'NIS2/CER', category: 'EU-direktiv' },
];

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const { messages, isLoading, sendMessage, clearMessages } = useRegulatoryChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const contextFilter = selectedSources.length > 0 
      ? { sources: selectedSources } 
      : undefined;
    
    sendMessage(input.trim(), contextFilter);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExampleSelect = (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev => 
      prev.includes(sourceId)
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const clearFilters = () => {
    setSelectedSources([]);
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold">Regelverksassistent</h2>
          <p className="text-sm text-muted-foreground">
            Ställ frågor om NIS2, MSBFS, TSFS och andra regelverk
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Source filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {selectedSources.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedSources.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover z-50">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Filtrera på regelverk</span>
                {selectedSources.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={clearFilters}
                  >
                    Rensa
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {AVAILABLE_SOURCES.map((source) => (
                <DropdownMenuCheckboxItem
                  key={source.id}
                  checked={selectedSources.includes(source.id)}
                  onCheckedChange={() => toggleSource(source.id)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{source.label}</span>
                    <span className="text-xs text-muted-foreground">{source.category}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearMessages}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Rensa
            </Button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {selectedSources.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Söker i:</span>
          {selectedSources.map((source) => (
            <Badge 
              key={source} 
              variant="secondary" 
              className="gap-1 pr-1"
            >
              {source}
              <button
                onClick={() => toggleSource(source)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Rensa alla
          </Button>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {showWelcome ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            <ChatDisclaimer />
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">
                Välkommen till regelverksassistenten
              </h3>
              <p className="text-muted-foreground">
                Jag kan hjälpa dig att hitta och förstå krav från svenska regelverk 
                inom informationssäkerhet och kritisk infrastruktur. Mina svar baseras 
                enbart på de kravtexter som finns i systemets databas.
              </p>
              {selectedSources.length > 0 && (
                <p className="text-sm text-primary">
                  Du har aktiverat filter för {selectedSources.length} regelverk. 
                  Sökningen kommer begränsas till dessa källor.
                </p>
              )}
            </div>

            <ExampleQuestions 
              onSelectQuestion={handleExampleSelect} 
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 text-muted-foreground p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Söker i regelverk...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t space-y-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedSources.length > 0 
                ? `Ställ en fråga om ${selectedSources.join(', ')}...`
                : "Ställ en fråga om regelverk..."
            }
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-[60px] w-[60px]"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <ChatDisclaimer variant="subtle" />
      </div>
    </div>
  );
}
