import { describe, it, expect } from 'vitest';
import { fetchAllRows } from './fetchAll';

/** Låtsas-Supabase som, precis som PostgREST, kapar varje svar vid maxRows. */
function fakeTable(rows: { id: number }[], maxRows = 1000, failOnPage?: number) {
  const calls: { from: number; to: number; order: string[] }[] = [];
  const build = () => {
    const order: string[] = [];
    const builder = {
      order(column: string) {
        order.push(column);
        return builder;
      },
      range(from: number, to: number) {
        calls.push({ from, to, order: [...order] });
        if (failOnPage !== undefined && calls.length - 1 === failOnPage) {
          return Promise.resolve({ data: null, error: { message: 'nätverksfel' } as never });
        }
        const end = Math.min(to + 1, from + maxRows);
        return Promise.resolve({ data: rows.slice(from, end), error: null });
      },
    };
    return builder;
  };
  return { build, calls };
}

const makeRows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe('fetchAllRows', () => {
  it('hämtar alla rader när tabellen har fler än 1000 rader', async () => {
    const { build, calls } = fakeTable(makeRows(2500));
    const { data, error } = await fetchAllRows(build);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(calls.map((c) => c.from)).toEqual([0, 1000, 2000]);
  });

  it('gör ett enda anrop när allt ryms på en sida', async () => {
    const { build, calls } = fakeTable(makeRows(978));
    const { data } = await fetchAllRows(build);
    expect(data).toHaveLength(978);
    expect(calls).toHaveLength(1);
  });

  it('hämtar en extra sida när antalet är exakt 1000', async () => {
    const { build, calls } = fakeTable(makeRows(1000));
    const { data } = await fetchAllRows(build);
    expect(data).toHaveLength(1000);
    expect(calls).toHaveLength(2);
  });

  it('lägger till stabil sortering på id för varje sida', async () => {
    const { build, calls } = fakeTable(makeRows(1500));
    await fetchAllRows(build);
    expect(calls.every((c) => c.order.includes('id'))).toBe(true);
  });

  it('returnerar felet om en sida misslyckas', async () => {
    const { build } = fakeTable(makeRows(2500), 1000, 1);
    const { data, error } = await fetchAllRows(build);
    expect(error?.message).toBe('nätverksfel');
    expect(data).toHaveLength(1000);
  });

  it('tar bort dubbletter om en rad hamnar på två sidor', async () => {
    const rows = makeRows(1001);
    const { build } = fakeTable([...rows.slice(0, 1000), rows[999], ...rows.slice(1000)]);
    const { data } = await fetchAllRows(build);
    expect(data).toHaveLength(1001);
  });
});
