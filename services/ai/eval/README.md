# Modellutvärdering mot facit

Prototypens 418 granskade krav – med `chapter_section`, `source_page` och
`source_excerpt` – är ett färdigt facit. Skriptet läser in samma källdokument
genom AI-tjänsten med en given modell och mäter:

- **Återfunna krav**: andel referensnummer i facit som modellen hittar (recall)
- **Precision**: andel modellfynd som finns i facit
- **Rätt sida**: andel återfunna krav med samma `source_page`
- **Textlikhet**: andel återfunna krav vars `description` matchar facit ≥ 0,9 (normaliserad)
- Tid och tokens per dokument

```sh
# Databas med kravpaketet inläst; källdokumenten (PDF) i eval/docs/
LLM_MODEL=mistral-small:24b python -m eval.run --source "IEC 62443-3-3" --pdf eval/docs/iec-62443-3-3.pdf
LLM_MODEL=gpt-oss:20b        python -m eval.run --source "IEC 62443-3-3" --pdf eval/docs/iec-62443-3-3.pdf
```

Resultat skrivs till `eval/results/<modell>-<källa>-<datum>.json` och en
sammanfattning till `eval/results/README.md`. Det är dessa siffror som avgör
modellvalet i fas 2 – inte tyckande.
