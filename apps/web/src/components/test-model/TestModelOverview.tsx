import { useMemo } from 'react';
import { useTestMappings } from '@/hooks/useTestMappings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LabelList, LineChart, Line, Legend } from 'recharts';
import { TEST_PHASES, TEST_PHASE_LABELS, RESULT_STATUSES, RESULT_STATUS_LABELS } from './constants';

export function TestModelOverview() {
  const { data: mappings = [] } = useTestMappings();

  const stats = useMemo(() => {
    const total = mappings.length;
    const applicable = mappings.filter(m => m.is_applicable === true).length;
    const unassessed = mappings.filter(m => m.is_applicable == null).length;
    const byStatus = RESULT_STATUSES.map(s => ({
      status: RESULT_STATUS_LABELS[s],
      count: mappings.filter(m => m.result_status === s).length,
    }));
    const tested = mappings.filter(m => m.result_status !== 'not_tested').length;
    const testable = mappings.filter(m => m.testability === 'yes').length;
    const partial = mappings.filter(m => m.testability === 'partial').length;
    const notTestable = mappings.filter(m => m.testability === 'no').length;
    const noPhase = mappings.filter(m => m.is_applicable && !m.test_phase);
    const noType = mappings.filter(m => m.is_applicable && !m.test_type);

    const byPhase = TEST_PHASES.map(p => ({
      phase: TEST_PHASE_LABELS[p],
      count: mappings.filter(m => m.test_phase === p).length,
    }));

    const bySystem = new Map<string, { name: string; applicable: number; testable: number }>();
    for (const m of mappings) {
      const key = m.system_name || 'Utan system';
      const cur = bySystem.get(key) ?? { name: key, applicable: 0, testable: 0 };
      if (m.is_applicable === true) cur.applicable++;
      if (m.testability === 'yes') cur.testable++;
      bySystem.set(key, cur);
    }

    // Framdrift över tid: kumulativt antal testade rader per testdatum
    const datedRows = mappings
      .filter(m => m.tested_at && m.result_status !== 'not_tested')
      .sort((a, b) => String(a.tested_at).localeCompare(String(b.tested_at)));
    const progressMap = new Map<string, { date: string; passed: number; remarks: number; failed: number }>();
    for (const m of datedRows) {
      const date = String(m.tested_at).slice(0, 10);
      const cur = progressMap.get(date) ?? { date, passed: 0, remarks: 0, failed: 0 };
      if (m.result_status === 'passed') cur.passed++;
      else if (m.result_status === 'passed_with_remarks') cur.remarks++;
      else if (m.result_status === 'failed') cur.failed++;
      progressMap.set(date, cur);
    }
    let runningTotal = 0;
    const progressOverTime = Array.from(progressMap.values()).map(point => {
      runningTotal += point.passed + point.remarks + point.failed;
      return { ...point, cumulative: runningTotal };
    });

    // Framdrift per testtillfälle
    const phaseProgress = TEST_PHASES.map(p => {
      const rows = mappings.filter(m => m.test_phase === p);
      const done = rows.filter(m => m.result_status !== 'not_tested').length;
      return {
        phase: TEST_PHASE_LABELS[p],
        total: rows.length,
        done,
        percent: rows.length ? Math.round((done / rows.length) * 100) : 0,
      };
    });

    return { total, applicable, unassessed, byStatus, tested, testable, partial, notTestable, noPhase, noType, byPhase, progressOverTime, phaseProgress, bySystem: Array.from(bySystem.values()) };
  }, [mappings]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Totalt</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.applicable}</p><p className="text-xs text-muted-foreground">Tillämpliga</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{stats.unassessed}</p><p className="text-xs text-muted-foreground">Ej bedömda</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.tested}</p><p className="text-xs text-muted-foreground">Testade</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-status-success">{stats.testable}</p><p className="text-xs text-muted-foreground">Testbara</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-status-warning">{stats.partial}</p><p className="text-xs text-muted-foreground">Delvis testbara</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{stats.notTestable}</p><p className="text-xs text-muted-foreground">Ej testbara</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-status-warning">{stats.noPhase.length}</p><p className="text-xs text-muted-foreground">Saknar tillfälle</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Testresultat</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))">
                <LabelList dataKey="count" position="top" className="fill-foreground text-xs" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Framdrift över tid</CardTitle></CardHeader>
        <CardContent>
          {stats.progressOverTime.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga testdatum registrerade ännu. Sätt status och testdatum på raderna i Mappning för att följa framdriften.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.progressOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cumulative" name="Testade totalt" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="passed" name="Godkända (per dag)" stroke="hsl(142 71% 45%)" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" name="Underkända (per dag)" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Framdrift per testtillfälle</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stats.phaseProgress.map(p => (
            <div key={p.phase} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.phase}</span>
                <span className="text-muted-foreground">{p.done} av {p.total} testade ({p.percent}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${p.percent}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Krav per testtillfälle</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.byPhase}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phase" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))">
                  <LabelList dataKey="count" position="top" className="fill-foreground text-xs" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Per system</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.bySystem.map(s => (
                <div key={s.name} className="flex items-center justify-between text-sm border-b pb-2">
                  <span className="font-medium">{s.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">Tillämpliga: {s.applicable}</Badge>
                    <Badge variant="default">Testbara: {s.testable}</Badge>
                  </div>
                </div>
              ))}
              {stats.bySystem.length === 0 && <p className="text-sm text-muted-foreground">Inga mappningar ännu</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Krav utan testtillfälle ({stats.noPhase.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-72 overflow-y-auto text-sm">
              {stats.noPhase.slice(0, 50).map(m => (
                <div key={m.id} className="flex justify-between border-b pb-1">
                  <span className="font-mono text-xs">{m.requirement_chapter}</span>
                  <span className="text-muted-foreground text-xs">{m.system_name || '–'}</span>
                </div>
              ))}
              {stats.noPhase.length === 0 && <p className="text-muted-foreground">Alla tillämpliga krav har ett testtillfälle ✓</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Krav utan testtyp ({stats.noType.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-72 overflow-y-auto text-sm">
              {stats.noType.slice(0, 50).map(m => (
                <div key={m.id} className="flex justify-between border-b pb-1">
                  <span className="font-mono text-xs">{m.requirement_chapter}</span>
                  <span className="text-muted-foreground text-xs">{m.system_name || '–'}</span>
                </div>
              ))}
              {stats.noType.length === 0 && <p className="text-muted-foreground">Alla tillämpliga krav har en testtyp ✓</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
