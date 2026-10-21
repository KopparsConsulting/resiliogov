import { describe, it, expect } from 'vitest';
import { guessSources, mapColumns, parseMappingRows, parseMappingWorkbook, type SourceOption } from './linkMappingSheet';

// Rubrikerna i mappningsarket (fliken "Mappning", rubriker på rad 2)
const HEADER = [
  'Rad-ID', 'Lagparagraf', 'Lagkrav (sammanfattning)', 'MCFFS 2026:11 – punkt',
  'Föreskriftskrav (sammanfattning)', 'IEC 62443 – krav-ID', 'IEC-krav (egen formulering)',
  'Lägsta SL', 'Teststeg', 'Testfas', 'Ansvarig', 'Status', 'Datum', 'Verifikat', 'Täckning', 'Kommentar',
];

const row = (cells: Record<number, unknown>) => HEADER.map((_, i) => cells[i] ?? '');

describe('mapColumns', () => {
  it('hittar rätt kolumner och blandar inte ihop id-kolumner med textkolumner', () => {
    expect(mapColumns(HEADER)).toEqual({
      ref: 0, law: 1, regulation: 3, standard: 5, coverage: 14, comment: 15,
    });
  });

  it('klarar andra rubrikvarianter', () => {
    expect(mapColumns(['Lagparagraf', 'Föreskrift – punkt', 'Standard krav-ID', 'Täckning lag → IEC'])).toEqual({
      law: 0, regulation: 1, standard: 2, coverage: 3,
    });
  });
});

describe('parseMappingRows', () => {
  const sheet = {
    name: 'Mappning',
    rows: [
      ['Mappning lag → MCFFS → IEC 62443 → teststeg'],
      HEADER,
      row({ 0: 'EX-1', 1: '§ X (illustr.)', 5: 'SR 1.1', 14: 'Full' }),
      row({ 0: 'EX-2', 1: '§ Y (illustr.)', 14: 'Saknas' }),
      row({ 0: 'R-1', 1: '3 kap. 1 §', 3: '3 kap. 1 §', 5: 'SR 1.1, SR 1.2', 14: 'Full', 15: '  Åtkomst  ' }),
      row({}),
      row({ 1: '2 §', 3: '5 kap. 2 §', 14: 'Saknas' }),
      row({ 0: 'R-3', 1: 12, 5: 'SR 2.1', 14: 'Delvis' }),
    ],
  };

  it('läser raderna under rubrikraden och hoppar över exempel och tomma rader', () => {
    const parsed = parseMappingRows(sheet)!;
    expect(parsed.headerRow).toBe(2);
    expect(parsed.skippedExamples).toBe(2);
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.rows).toEqual([
      { ref: 'R-1', law: '3 kap. 1 §', regulation: '3 kap. 1 §', standard: 'SR 1.1, SR 1.2', coverage: 'Full', comment: 'Åtkomst' },
      { ref: 'Rad 7', law: '2 §', regulation: '5 kap. 2 §', standard: '', coverage: 'Saknas', comment: '' },
      { ref: 'R-3', law: '12', regulation: '', standard: 'SR 2.1', coverage: 'Delvis', comment: '' },
    ]);
  });

  it('returnerar null när arket saknar en lagparagraf-kolumn', () => {
    expect(parseMappingRows({ name: 'Annat', rows: [['Krav-ID', 'System'], ['SR 1.1', 'SCADA']] })).toBeNull();
  });

  it('redovisar kolumner som saknas', () => {
    const parsed = parseMappingRows({ name: 'x', rows: [['Lagparagraf', 'IEC krav-ID'], ['2 §', 'SR 1.1']] })!;
    expect(parsed.missingColumns).toEqual(['ref', 'regulation', 'coverage', 'comment']);
    expect(parsed.rows[0]).toMatchObject({ ref: 'Rad 2', law: '2 §', standard: 'SR 1.1' });
  });
});

describe('parseMappingWorkbook', () => {
  it('föredrar fliken Mappning framför andra flikar', () => {
    const parsed = parseMappingWorkbook([
      { name: 'Förklaring', rows: [['Nivå', 'Källa'], ['1. Lag', 'Cybersäkerhetslagen']] },
      { name: 'Mappning', rows: [HEADER, row({ 0: 'R-1', 1: '2 §', 5: 'SR 1.1' })] },
    ])!;
    expect(parsed.sheetName).toBe('Mappning');
    expect(parsed.rows).toHaveLength(1);
  });

  it('faller tillbaka på första flik med rätt rubriker', () => {
    const parsed = parseMappingWorkbook([
      { name: 'Blad1', rows: [['Hej']] },
      { name: 'Blad2', rows: [['Lagparagraf', 'IEC krav-ID'], ['2 §', 'SR 1.1']] },
    ])!;
    expect(parsed.sheetName).toBe('Blad2');
  });
});

describe('guessSources', () => {
  const sources: SourceOption[] = [
    { id: 'tsfs', document_name: 'TSFS 2022:14', source_level: 'föreskrift' },
    { id: 'mcffs', document_name: 'MCFFS 2026:11', source_level: 'föreskrift' },
    { id: 'lag', document_name: 'Cybersäkerhetslagen (2025:1506)', source_level: 'lag' },
    { id: 'iec', document_name: 'IEC 62443-3-3', source_level: 'standard' },
  ];

  it('väljer cybersäkerhetslagen, MCFFS och IEC 62443', () => {
    expect(guessSources(sources)).toEqual({ law: 'lag', regulation: 'mcffs', standard: 'iec' });
  });

  it('väljer det enda regelverket på en nivå, men gissar inte bland flera', () => {
    expect(guessSources([
      { id: 'a', document_name: 'Annan lag', source_level: 'lag' },
      { id: 'b', document_name: 'TSFS 1', source_level: 'föreskrift' },
      { id: 'c', document_name: 'TSFS 2', source_level: 'föreskrift' },
    ])).toEqual({ law: 'a', regulation: undefined, standard: undefined });
  });
});
