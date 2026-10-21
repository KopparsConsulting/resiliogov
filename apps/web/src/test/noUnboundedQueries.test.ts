/**
 * Skydd mot 1000-radersgränsen.
 *
 * Supabase returnerar max 1000 rader per anrop och kapar resten tyst.
 * Varje listfråga (`.from(...).select(...)`) måste därför antingen
 *  - gå via fetchAllRows (src/lib/fetchAll.ts), eller
 *  - vara uttryckligen begränsad: .single(), .maybeSingle(), .limit(),
 *    .range(), { head: true } eller .eq('id', …).
 *
 * Testet läser källkoden och listar frågor som bryter mot regeln.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const SKIP_FILES = ['integrations/supabase/', 'lib/fetchAll.ts', '.test.'];
/** Fasta konfigurationstabeller med ett fåtal rader och utan id-kolumn. */
const SKIP_TABLES = new Set(['class_sl_mapping', 'scoring_thresholds']);
const BOUNDED = /\.(insert|update|delete|upsert|single|maybeSingle|limit|range)\(|head:\s*true|\.eq\(\s*['"]id['"]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** Hittar slutet på en kedja av metodanrop (första ; eller , på djup 0). */
function chainEnd(s: string, i: number): number {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) {
      if (depth === 0) return j;
      depth--;
    } else if ((c === ';' || c === ',') && depth === 0) return j;
  }
  return s.length;
}

describe('Supabase-frågor', () => {
  it('inga listfrågor kan tyst kapas vid 1000 rader', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
      if (SKIP_FILES.some((s) => rel.includes(s))) continue;
      const src = readFileSync(file, 'utf8');
      const re = /supabase\s*\.from\(\s*['"]([a-z_]+)['"]\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const chain = src.slice(m.index, chainEnd(src, m.index + m[0].length));
        if (!chain.includes('.select(') || BOUNDED.test(chain) || SKIP_TABLES.has(m[1])) continue;
        const before = src.slice(Math.max(0, m.index - 300), m.index);
        if (/fetchAllRows\(\s*\(\)\s*=>\s*$/.test(before)) continue;
        // fetchAllRows(() => { const q = supabase.from(...)...; return villkor ? q.in(...) : q; })
        if (/fetchAllRows\(\s*\(\)\s*=>\s*\{\s*(const|let)\s+\w+\s*=\s*$/.test(before)) continue;
        if (/buildQuery\s*=\s*\(\)\s*=>\s*\{[^}]*let query\s*=\s*$/.test(before)) continue;
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${rel}:${line} (${m[1]})`);
      }
    }
    expect(offenders, `Använd fetchAllRows för dessa frågor:\n${offenders.join('\n')}`).toEqual([]);
  });
});
