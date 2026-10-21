# Utvärderingsresultat

Facit = prototypens granskade krav (AddContext). Mått enligt `eval/README.md`.
Resultatfilerna (`*.json`) skrivs på maskinen som kör och checkas inte in; den här
tabellen är sammanfattningen.

| Datum | Modell | Maskin | Källa | Facit | Funna | Recall | Precision | Rätt sida | Text ≥0,9 | Tid |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-21 | mistral-small:24b (Ollama) | Mac mini M5 Pro 64 GB | MCFFS 2026:11 | 143 | 135 | 0,92 | 0,97 | 0,91 | 0,66 | 25 min |

## Vad som avgjorde (MCFFS 2026:11, mistral-small:24b)

Tre körningar samma dag, samma modell:

1. **38 funna** – referenser utan kapitel ("19 §") kolliderade mellan kapitel. Löst med kapitelkontext i chunkningen (`app/chunking.py`).
2. **53 funna, recall 0,33, precision 0,89** – modellen gav en rad per paragraf; facit har paragraf + varje numrerad punkt + "allmänna råd" som egna krav. Löst med granularitetsregeln i prompten.
3. **135 funna, recall 0,92, precision 0,97** – efter att utdraget (`source_excerpt`) räknas fram lokalt i stället för att modellen skriver kravtexten två gånger.

Lärdom: skillnaden mellan oduglig och duglig låg inte i modellen utan i chunkning,
prompt och utdataformat. Textlikheten (0,66) är det som återstår att höja –
modellen skriver för det mesta ordagrant men avviker i punkt-kraven där
inledningen ska upprepas.
