import { useState, useCallback } from 'react';
import { functionAuthHeaders } from '@/lib/functionAuth';

export interface AnalyticsChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chartConfig?: ChartConfig;
  gapDetails?: GapDetails;
  toolResults?: ToolResult[];
  followUpQuestions?: string[];
  timestamp: Date;
}

export interface ChartConfig {
  type: 'bar' | 'radar' | 'pie' | 'heatmap';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  dataKeys?: string[];
  categories?: string[];
}

export interface GapDetails {
  facility1: { name: string; percentage: number | null };
  facility2: { name: string; percentage: number | null };
  gap_percentage: number | null;
  missing_requirements: Array<{
    id: string;
    document_name: string;
    chapter_section: string;
    description: string;
    domain_name: string;
  }>;
}

export interface ToolResult {
  tool_name: string;
  tool_args: Record<string, any>;
  result: any;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-chat`;

// Extract chart config from markdown response
function extractChartConfig(content: string): { cleanContent: string; chartConfig?: ChartConfig } {
  const chartMatch = content.match(/```chart_config\n([\s\S]*?)\n```/);
  
  if (chartMatch) {
    try {
      const chartConfig = JSON.parse(chartMatch[1]);
      const cleanContent = content.replace(/```chart_config\n[\s\S]*?\n```/, '').trim();
      return { cleanContent, chartConfig };
    } catch (e) {
      console.error('Failed to parse chart config:', e);
    }
  }
  
  return { cleanContent: content };
}

// Extract follow-up questions from response
function extractFollowUpQuestions(content: string): { cleanContent: string; followUpQuestions?: string[] } {
  const match = content.match(/```follow_up\n([\s\S]*?)\n```/);
  
  if (match) {
    try {
      const questions = JSON.parse(match[1]);
      const cleanContent = content.replace(/```follow_up\n[\s\S]*?\n```/, '').trim();
      return { cleanContent, followUpQuestions: Array.isArray(questions) ? questions : undefined };
    } catch (e) {
      console.error('Failed to parse follow-up questions:', e);
    }
  }
  
  return { cleanContent: content };
}

// Extract GAP details from tool results
function extractGapDetails(toolResults: ToolResult[]): GapDetails | undefined {
  for (const result of toolResults) {
    if (result.tool_name === 'compare_facilities' && result.result?.facility1 && result.result?.facility2) {
      return {
        facility1: {
          name: result.result.facility1.name,
          percentage: result.result.facility1.percentage
        },
        facility2: {
          name: result.result.facility2.name,
          percentage: result.result.facility2.percentage
        },
        gap_percentage: result.result.gap_percentage,
        missing_requirements: result.result.missing_requirements || []
      };
    }
  }
  return undefined;
}

// Auto-generate chart from tool results
function generateChartFromToolResults(toolResults: ToolResult[]): ChartConfig | undefined {
  for (const result of toolResults) {
    if (result.tool_name === 'get_compliance_overview' && Array.isArray(result.result)) {
      return {
        type: 'bar',
        title: 'Efterlevnad per anläggning',
        data: result.result.map((f: any) => ({
          name: f.name.length > 15 ? f.name.substring(0, 15) + '...' : f.name,
          Efterlevnad: f.percentage,
          fullName: f.name
        })),
        xKey: 'name',
        yKey: 'Efterlevnad'
      };
    }
    
    if (result.tool_name === 'compare_facilities' && result.result?.domain_comparison) {
      return {
        type: 'radar',
        title: `GAP-analys: ${result.result.facility1.name} vs ${result.result.facility2.name}`,
        data: result.result.domain_comparison.map((d: any) => ({
          domain: d.domain_name.length > 12 ? d.domain_name.substring(0, 12) + '...' : d.domain_name,
          [result.result.facility1.name]: d.facility1_percentage,
          [result.result.facility2.name]: d.facility2_percentage,
        })),
        dataKeys: [result.result.facility1.name, result.result.facility2.name]
      };
    }
    
    if (result.tool_name === 'get_domain_summary' && Array.isArray(result.result)) {
      return {
        type: 'bar',
        title: 'Efterlevnad per domän',
        data: result.result.map((d: any) => ({
          name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
          Efterlevnad: d.percentage,
          fullName: d.name
        })),
        xKey: 'name',
        yKey: 'Efterlevnad'
      };
    }

    if (result.tool_name === 'get_heatmap_data' && result.result?.matrix) {
      return {
        type: 'heatmap',
        title: 'Efterlevnad: Anläggningar × Domäner',
        data: result.result.matrix,
        categories: result.result.domains
      };
    }
  }
  
  return undefined;
}

export function useAnalyticsChat() {
  const [messages, setMessages] = useState<AnalyticsChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (question: string) => {
    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: AnalyticsChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      conversationHistory.push({ role: 'user', content: question });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await functionAuthHeaders()),
        },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Extract chart config, follow-ups, and generate from tool results
      const { cleanContent: afterChart, chartConfig: extractedChart } = extractChartConfig(data.content);
      const { cleanContent, followUpQuestions } = extractFollowUpQuestions(afterChart);
      const generatedChart = generateChartFromToolResults(data.tool_results || []);
      const gapDetails = extractGapDetails(data.tool_results || []);
      
      const assistantMessage: AnalyticsChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: cleanContent,
        chartConfig: extractedChart || generatedChart,
        gapDetails,
        toolResults: data.tool_results,
        followUpQuestions,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (e) {
      console.error('Analytics chat error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Ett fel uppstod';
      setError(errorMessage);
      
      // Add error as assistant message
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Export conversation to HTML
  const exportToHtml = useCallback(() => {
    const html = generateHtmlReport(messages);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysrapport-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    exportToHtml,
  };
}

function generateHtmlReport(messages: AnalyticsChatMessage[]): string {
  const conversationHtml = messages.map(m => {
    if (m.role === 'user') {
      return `<div class="message user"><strong>Fråga:</strong> ${escapeHtml(m.content)}</div>`;
    }
    
    let html = `<div class="message assistant"><div class="content">${escapeHtml(m.content).replace(/\n/g, '<br>')}</div>`;
    
    if (m.gapDetails) {
      html += `
        <div class="gap-summary">
          <h4>GAP-analys sammanfattning</h4>
          <p><strong>${escapeHtml(m.gapDetails.facility1.name)}:</strong> ${m.gapDetails.facility1.percentage}%</p>
          <p><strong>${escapeHtml(m.gapDetails.facility2.name)}:</strong> ${m.gapDetails.facility2.percentage}%</p>
          <p><strong>Gap:</strong> ${m.gapDetails.gap_percentage} procentenheter</p>
          ${m.gapDetails.missing_requirements.length > 0 ? `
            <h5>Krav som saknas:</h5>
            <table>
              <thead><tr><th>Dokument</th><th>Paragraf</th><th>Domän</th><th>Beskrivning</th></tr></thead>
              <tbody>
                ${m.gapDetails.missing_requirements.map(r => `
                  <tr>
                    <td>${escapeHtml(r.document_name)}</td>
                    <td>${escapeHtml(r.chapter_section)}</td>
                    <td>${escapeHtml(r.domain_name)}</td>
                    <td>${escapeHtml(r.description.substring(0, 100))}...</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analysrapport - ${new Date().toLocaleDateString('sv-SE')}</title>
  <style>
    body { font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif; font-feature-settings: 'ss01' on; max-width: 900px; margin: 0 auto; padding: 2rem; background: #fafafa; color: #0a0a0a; }
    h1 { color: #0a0a0a; border-bottom: 2px solid #0a0a0a; padding-bottom: 0.5rem; }
    h1, h2, h3, h4 { letter-spacing: -0.02em; }
    .message { margin: 1rem 0; padding: 1rem; border-radius: 8px; }
    .message.user { background: #0a0a0a; color: white; }
    .message.assistant { background: white; border: 1px solid #e5e5e5; }
    .gap-summary { margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 6px; }
    .gap-summary h4 { margin: 0 0 0.5rem 0; color: #525252; }
    .gap-summary h5 { margin: 1rem 0 0.5rem 0; color: #737373; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.875rem; }
    th, td { border: 1px solid #e5e5e5; padding: 0.5rem; text-align: left; }
    th { background: #fafafa; font-weight: 600; }
    .meta { color: #737373; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #e5e5e5; padding-top: 1rem; }
  </style>
</head>
<body>
  <h1>🔍 Analysrapport</h1>
  <p class="meta">Genererad: ${new Date().toLocaleString('sv-SE')}</p>
  ${conversationHtml}
  <p class="meta">Rapport genererad av Compliance Manager Analysassistent</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
