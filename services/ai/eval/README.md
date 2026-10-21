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
# PDF:erna i EVAL_DOCS_DIR (.env), t.ex. ~/data/docs på minin; monteras som /srv/eval/docs i containern.
# --source måste vara exakt document_name i requirement_sources.
docker compose exec ai python -m eval.run --source "MCFFS 2026:11" --pdf eval/docs/mcffs-2026-11.pdf --language sv
docker compose exec -e LLM_MODEL=gpt-oss:20b ai python -m eval.run --source "MCFFS 2026:11" --pdf eval/docs/mcffs-2026-11.pdf --language sv
docker compose exec ai python -m eval.run --source "IEC 62443-3-3:2013 - System security requirements and security levels" --pdf eval/docs/iec-62443-3-3.pdf --language en
```

Första körningen laddar Docling ner sina layoutmodeller (~500 MB) från Hugging Face –
det kräver internet och görs en gång (cachas i volymen `aicache`). I en avskärmad
installation levereras cachen med installationspaketet.

Resultat skrivs till `eval/results/<modell>-<källa>-<datum>.json` och en
sammanfattning till `eval/results/README.md`. Det är dessa siffror som avgör
modellvalet i fas 2 – inte tyckande.
