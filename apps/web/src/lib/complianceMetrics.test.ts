/**
 * Samma fall som supabase/tests/metrics_test.sql – appens och databasens
 * mått ska alltid ge samma svar.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  isClosed,
  needsAction,
  stockholmToday,
  metricsFromRow,
  type ScorableRecord,
} from './complianceMetrics';

const TODAY = '2026-10-05';

const RECORDS: ScorableRecord[] = [
  { status: 'Ej påbörjad' },
  { status: 'Pågående' },
  { status: 'Uppfyllt', valid_until: '2027-01-01' },
  { status: 'Uppfyllt', valid_until: '2026-10-04' }, // utgången igår
  { status: 'Ej tillämpligt' },
  { status: 'Delvis uppfyllt' },
  { status: 'Ej uppfyllt' },
  { status: 'Uppfyllt', out_of_scope_since: '2026-09-01T10:00:00Z' }, // utanför omfattning
  { status: null }, // tom status räknas som Ej påbörjad
];

describe('calculateMetrics', () => {
  it('räknar enligt den gemensamma definitionen', () => {
    expect(calculateMetrics(RECORDS, TODAY)).toEqual({
      total: 8,
      assessed: 5,
      notApplicable: 1,
      fulfilled: 1,
      expired: 1,
      outOfScope: 1,
      coverage: 63, // 5/8 = 62,5 → 63
      compliance: 25, // 1 / (5 − 1)
    });
  });

  it('ger 0 % täckning och ingen efterlevnad för en tom lista', () => {
    const m = calculateMetrics([], TODAY);
    expect(m.coverage).toBe(0);
    expect(m.compliance).toBeNull();
  });

  it('ger ingen efterlevnad när allt bedömt är Ej tillämpligt', () => {
    const m = calculateMetrics([{ status: 'Ej tillämpligt' }, { status: 'Ej påbörjad' }], TODAY);
    expect(m.coverage).toBe(50);
    expect(m.compliance).toBeNull();
  });

  it('räknar giltig-till samma dag som giltig', () => {
    const m = calculateMetrics([{ status: 'Uppfyllt', valid_until: TODAY }], TODAY);
    expect(m.fulfilled).toBe(1);
    expect(m.expired).toBe(0);
  });
});

describe('öppna och klara krav', () => {
  it('varje krav i omfattningen är antingen öppet eller klart', () => {
    const open = RECORDS.filter((r) => needsAction(r, TODAY));
    const closed = RECORDS.filter((r) => isClosed(r, TODAY));
    expect(open).toHaveLength(6);
    expect(closed).toHaveLength(2);
    expect(open.length + closed.length).toBe(calculateMetrics(RECORDS, TODAY).total);
  });
});

describe('hjälpfunktioner', () => {
  it('stockholmToday använder svensk tid', () => {
    // 23:30 UTC den 4 oktober är 01:30 den 5 oktober i Stockholm
    expect(stockholmToday(new Date('2026-10-04T23:30:00Z'))).toBe('2026-10-05');
  });

  it('metricsFromRow ger samma form som calculateMetrics', () => {
    expect(metricsFromRow(undefined)).toEqual(calculateMetrics([], TODAY));
  });
});
