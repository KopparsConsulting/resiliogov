import { Bot, BookOpen, Shield, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatInterface } from '@/components/ai/ChatInterface';

export default function AIAssistantPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI-Assistent för Regelverk</h1>
          <p className="text-muted-foreground">
            Sök och förstå krav i regelverken med AI-stöd
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* Main chat area */}
        <ChatInterface />

        {/* Sidebar with info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tillgängliga källor
              </CardTitle>
              <CardDescription>
                Svar baseras på dessa regelverk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-foreground" />
                <span>MSBFS 2020:7 (Informationssäkerhet)</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-foreground" />
                <span>TSFS 2019:93 (Tunnelsäkerhet)</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-foreground" />
                <span>TSFS 2022:14 (Uppdateringar)</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-foreground" />
                <span>NIS2/CER-direktivet</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-foreground" />
                <span>MSBFS 2018:8 (Krisberedskap)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Om assistenten
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Assistenten hjälper till att söka och förstå krav i regelverken. Den:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Söker endast i definierade kravtexter</li>
                <li>Visar tydliga källhänvisningar</li>
                <li>Skiljer på bindande krav och rekommendationer</li>
                <li>Meddelar när underlag saknas</li>
                <li>Kör AI-modellen lokalt i driftläge – inget lämnar nätet</li>
              </ul>
              <p className="pt-2 font-medium text-foreground">
                Svaren är ett stöd, inte ett beslutsunderlag – kontrollera alltid mot originalföreskriften.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
