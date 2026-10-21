import ReactMarkdown from 'react-markdown';
import { User, Bot, Database, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DynamicChart } from './DynamicChart';
import { GapDetailsCard } from './GapDetailsCard';
import type { AnalyticsChatMessage as MessageType } from '@/hooks/useAnalyticsChat';

interface AnalyticsChatMessageProps {
  message: MessageType;
  onFollowUp?: (question: string) => void;
}

export function AnalyticsChatMessage({ message, onFollowUp }: AnalyticsChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}
      `}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      <div className={`flex-1 space-y-3 ${isUser ? 'text-right' : ''}`}>
        <div className={`
          inline-block max-w-[85%] rounded-lg px-4 py-2
          ${isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
          }
        `}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Tool results indicator */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.toolResults.map((result, index) => (
              <Badge key={index} variant="outline" className="gap-1 text-xs">
                <Database className="h-3 w-3" />
                {result.tool_name === 'get_compliance_overview' && 'Hämtade efterlevnadsdata'}
                {result.tool_name === 'compare_facilities' && 'GAP-analys'}
                {result.tool_name === 'list_facilities' && 'Listade anläggningar'}
                {result.tool_name === 'get_domain_summary' && 'Domänsammanfattning'}
                {result.tool_name === 'get_heatmap_data' && 'Heatmap-data'}
              </Badge>
            ))}
          </div>
        )}

        {/* Chart */}
        {message.chartConfig && (
          <div className="mt-4">
            <DynamicChart config={message.chartConfig} />
          </div>
        )}

        {/* GAP Details */}
        {message.gapDetails && (
          <div className="mt-4">
            <GapDetailsCard details={message.gapDetails} />
          </div>
        )}

        {/* Follow-up questions */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && onFollowUp && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.followUpQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-3 text-xs text-left whitespace-normal gap-1.5 max-w-[300px]"
                onClick={() => onFollowUp(question)}
              >
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span>{question}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
