import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapChartProps {
  title: string;
  data: Array<{
    facility: string;
    values: Record<string, number>;
  }>;
  categories: string[];
}

function getHeatmapColor(value: number): string {
  if (value >= 80) return 'bg-status-success';
  if (value >= 60) return 'bg-status-success';
  if (value >= 40) return 'bg-status-warning';
  if (value >= 20) return 'bg-status-warning';
  return 'bg-destructive';
}

function getTextColor(value: number): string {
  if (value >= 60) return 'text-status-success-foreground';
  if (value >= 20) return 'text-status-warning-foreground';
  return 'text-destructive-foreground';
}

export function HeatmapChart({ title, data, categories }: HeatmapChartProps) {
  if (!data || data.length === 0 || !categories || categories.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Ingen data tillgänglig</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">Anläggning</th>
                {categories.map(cat => (
                  <th key={cat} className="p-1 font-medium text-muted-foreground text-center">
                    <span className="block max-w-[60px] truncate" title={cat}>
                      {cat.length > 8 ? cat.substring(0, 8) + '...' : cat}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="p-2 font-medium max-w-[120px] truncate" title={row.facility}>
                    {row.facility.length > 15 ? row.facility.substring(0, 15) + '...' : row.facility}
                  </td>
                  {categories.map(cat => {
                    const value = row.values[cat] ?? 0;
                    return (
                      <td key={cat} className="p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className={`
                                w-full h-8 rounded flex items-center justify-center 
                                cursor-default transition-transform hover:scale-105
                                ${getHeatmapColor(value)} ${getTextColor(value)}
                              `}
                            >
                              {value}%
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{row.facility}</p>
                            <p>{cat}: {value}% efterlevnad</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-destructive" />
            <span>0-19%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-status-warning" />
            <span>20-39%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-status-warning" />
            <span>40-59%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-status-success" />
            <span>60-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-status-success" />
            <span>80-100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
