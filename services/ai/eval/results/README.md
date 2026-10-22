# Utvärderingsresultat

Facit = prototypens granskade krav (AddContext). Mått enligt `eval/README.md`.
Resultatfilerna (`*.json`) skrivs på maskinen som kör och checkas inte in; den här
tabellen är sammanfattningen.

| Datum | Modell | Maskin | Källa | Facit | Funna | Recall | Precision | Rätt sida | Text ≥0,9 | Tid |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-21 | mistral-small:24b (Ollama) | Mac mini M5 Pro 64 GB | MCFFS 2026:11 | 143 | 135 | 0,92 | 0,97 | 0,91 | 0,66 | 25 min |
| 2026-10-22 | mistral-small:24b (Ollama) | Mac mini M5 Pro 64 GB | IEC 62443-3-3:2013 | 100 | 94 | 0,94 | 1,00 | 0,89 | 0,48 | 36 min |

## Vad som avgjorde (MCFFS 2026:11, mistral-small:24b)

Tre körningar samma dag, samma modell:

1. **38 funna** – referenser utan kapitel ("19 §") kolliderade mellan kapitel. Löst med kapitelkontext i chunkningen (`app/chunking.py`).
2. **53 funna, recall 0,33, precision 0,89** – modellen gav en rad per paragraf; facit har paragraf + varje numrerad punkt + "allmänna råd" som egna krav. Löst med granularitetsregeln i prompten.
3. **135 funna, recall 0,92, precision 0,97** – efter att utdraget (`source_excerpt`) räknas fram lokalt i stället för att modellen skriver kravtexten två gånger.

Lärdom: skillnaden mellan oduglig och duglig låg inte i modellen utan i chunkning,
prompt och utdataformat. Textlikheten (0,66) är det som återstår att höja –
modellen skriver för det mesta ordagrant men avviker i punkt-kraven där
inledningen ska upprepas.

## IEC 62443-3-3 (mistral-small:24b), 22 okt

Tre körningar/omräkningar:

1. **366 funna, recall 0,65, precision 0,18.** Innehållsförteckning och SL-tabeller lästes som krav; modellen skrev
   "5.3 SR 1.1" (klausulprefix) och "SR 1.1 (1)" där facit har "SR 1.1" / "SR 1.1 RE 1"; dedupliceringen behöll
   ToC-raden och kastade det riktiga kravet.
2. **Omräkning med kanonisk referens och längsta-beskrivning-dedup: recall 0,83** – 18 procentenheter var formatfel.
3. **94 funna, recall 0,94, precision 1,00** efter: klausulkarta (5.3 → SR 1.1, 5.3.3.k → SR 1.1 RE k) som
   följer med varje chunk, och spärr som kastar referenser som inte finns i chunktexten. Spärren fångade
   ~300 påhittade referenser (modellen skrev "CR 1.1 … CR 1.32" i Scope-avsnittet för att prompten nämner CR).

Textlikheten (0,48) beror på att facit skriver rubrik + kravtext; prompten är justerad, inte omkörd.
Tidsnot: de tre chunkar där modellen fabulerade tog 5,5 min vardera (16 av 36 min) – kandidat för en
försignal "finns kravsignal i chunken?" innan modellen anropas.
