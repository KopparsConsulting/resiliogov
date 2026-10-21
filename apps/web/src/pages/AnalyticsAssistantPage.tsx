import { useState, useCallback } from 'react';
import { AnalyticsChatInterface } from '@/components/analytics/AnalyticsChatInterface';
import { AnalyticsContextPanel, type ContextItem } from '@/components/analytics/AnalyticsContextPanel';

export default function AnalyticsAssistantPage() {
  const [selectedContext, setSelectedContext] = useState<ContextItem[]>([]);
  const [prefillText, setPrefillText] = useState('');

  const handleSelectContext = useCallback((item: ContextItem) => {
    setSelectedContext(prev => {
      const exists = prev.some(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  }, []);

  const handleRemoveContext = useCallback((id: string) => {
    setSelectedContext(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleClearContext = useCallback(() => {
    setSelectedContext([]);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Analysassistent</h1>
        <p className="text-muted-foreground">
          Dialog-driven analys med diagram och GAP-analys för tunnelsäkerhet
        </p>
      </div>

      <div className="flex h-[calc(100vh-14rem)] border rounded-lg overflow-hidden bg-card">
        <AnalyticsContextPanel
          selectedItems={selectedContext}
          onSelect={handleSelectContext}
        />
        <div className="flex-1 min-w-0">
          <AnalyticsChatInterface
            selectedContext={selectedContext}
            onRemoveContext={handleRemoveContext}
            onClearContext={handleClearContext}
            prefillText={prefillText}
            onPrefillConsumed={() => setPrefillText('')}
          />
        </div>
      </div>
    </div>
  );
}
