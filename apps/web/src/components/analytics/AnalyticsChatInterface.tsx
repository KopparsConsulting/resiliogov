import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAnalyticsChat } from '@/hooks/useAnalyticsChat';
import { useInstallationSettings } from '@/hooks/useInstallationSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { AnalyticsChatMessage } from './AnalyticsChatMessage';
import { AnalyticsExampleQuestions } from './AnalyticsExampleQuestions';
import { AnalyticsQuickFilters } from './AnalyticsQuickFilters';
import { ContextChips } from './ContextChips';
import type { ContextItem } from './AnalyticsContextPanel';

interface AnalyticsChatInterfaceProps {
  selectedContext?: ContextItem[];
  onRemoveContext?: (id: string) => void;
  onClearContext?: () => void;
  prefillText?: string;
  onPrefillConsumed?: () => void;
}

export function AnalyticsChatInterface({
  selectedContext = [],
  onRemoveContext,
  onClearContext,
  prefillText,
  onPrefillConsumed,
}: AnalyticsChatInterfaceProps) {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearMessages, exportToHtml } = useAnalyticsChat();
  const { data: settings, isLoading: settingsLoading } = useInstallationSettings();
  const aiDisabled = !settingsLoading && !settings?.ai_compliance_analysis;
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle prefill text from quick filters
  useEffect(() => {
    if (prefillText) {
      setInput(prefillText);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefillText, onPrefillConsumed]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const buildContextPrefix = (): string => {
    if (selectedContext.length === 0) return '';
    const parts = selectedContext.map(c => `[${c.name}]`);
    return `Kontext: ${parts.join(', ')}. `;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const contextPrefix = buildContextPrefix();
    sendMessage(contextPrefix + input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExampleSelect = (question: string) => {
    const contextPrefix = buildContextPrefix();
    sendMessage(contextPrefix + question);
  };

  const handleQuickFilter = (prompt: string) => {
    if (selectedContext.length > 0) {
      const names = selectedContext.map(c => c.name).join(', ');
      setInput(prompt + names);
    } else {
      setInput(prompt);
    }
    textareaRef.current?.focus();
  };

  const getPlaceholder = () => {
    if (selectedContext.length > 0) {
      const names = selectedContext.map(c => c.name).join(', ');
      return `Fråga om ${names}...`;
    }
    return 'Ställ en fråga om efterlevnad, jämför anläggningar...';
  };

  const showWelcome = messages.length === 0;

  if (aiDisabled) {
    return (
      <div className="p-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">Analysassistenten är avstängd</p>
            <p>
              Den skickar anläggningsnamn och vilka krav som inte är uppfyllda till en extern AI-tjänst, och är
              därför avstängd som standard. En administratör kan slå på den under Administration → AI och extern
              databehandling. Översikter och rapporter fungerar som vanligt utan AI.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Analysassistent</h2>
            <p className="text-sm text-muted-foreground">
              GAP-analys, diagram och efterlevnadsöversikt
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={exportToHtml} className="gap-2">
                <Download className="h-4 w-4" />
                Exportera
              </Button>
              <Button variant="outline" size="sm" onClick={clearMessages} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Rensa
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {showWelcome ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-3 py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">
                Analysassistent för tunnelsäkerhet
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Jag kan hjälpa dig att analysera efterlevnad, jämföra anläggningar 
                och generera diagram baserat på data i systemet.
                {selectedContext.length === 0 && (
                  <span className="block mt-2 text-xs">
                    💡 Välj anläggningar, system eller regelverk i panelen till vänster för att ge mig kontext.
                  </span>
                )}
              </p>
            </div>

            <AnalyticsExampleQuestions 
              onSelectQuestion={handleExampleSelect} 
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((message) => (
              <AnalyticsChatMessage 
                key={message.id} 
                message={message} 
                onFollowUp={isLoading ? undefined : handleExampleSelect}
              />
            ))}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 text-muted-foreground p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyserar data...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t space-y-2">
        {/* Context chips + quick filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {onRemoveContext && (
            <ContextChips items={selectedContext} onRemove={onRemoveContext} />
          )}
          <AnalyticsQuickFilters onSelect={handleQuickFilter} disabled={isLoading} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
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
      </div>
    </div>
  );
}
