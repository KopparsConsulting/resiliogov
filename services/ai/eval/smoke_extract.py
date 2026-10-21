"""Rökprov för extraktionen mot den lokala modellen – utan PDF, utan gränssnitt.

  docker compose exec ai python -m eval.smoke_extract

Skickar ett kort utdrag ur MCFFS 2026:11 (samma text som finns i kravdatabasen)
och skriver ut vad modellen hittar. Facit: 3 kap. 19 § (bindande), 4 kap. 9 § (bindande)
och 4 kap. 13 § allmänna råd (rekommendation)."""
import asyncio
import json
import time

from app import extract, llm

TEXT = """--- Sida 7 ---
3 kap. Systematiskt cybersäkerhetsarbete

19 § För att kunna bedöma effektiviteten av införda säkerhetsåtgärder ska verksamhetsutövaren följa upp och
utvärdera om säkerhetsåtgärderna är lämpliga och proportionella i förhållande till externa krav, interna behov
och identifierade risker. Verksamhetsutövaren ska även identifiera behov av att förbättra säkerhetsåtgärder.
Uppföljning och utvärdering av säkerhetsåtgärder för sektorskritiska system ska ske vid behov men minst en gång per år.

--- Sida 12 ---
4 kap. Säkerhetsåtgärder

9 § För att verksamhetsutövaren skyndsamt ska kunna omhänderta sårbarheter och incidenter i den digitala
miljön samt bedöma konsekvenserna av dessa ska verksamhetsutövaren hålla en uppdaterad förteckning över
relevant information om den digitala miljön.

13 § Verksamhetsutövaren ska säkerhetskonfigurera system.
Allmänna råd
Verksamhetsutövaren bör inte tillåta direktkommunikation mellan klienter. Inaktiva sessioner bör automatiskt
avslutas efter en fördefinierad tidsperiod. Verksamhetsutövaren bör använda tekniskt systemstöd för att följa
upp att systemen är korrekt konfigurerade.
"""

DOMAINS = [extract.Domain(name="Styrning och riskhantering", slug="styrning"),
           extract.Domain(name="Systemintegritet och härdning", slug="systemintegritet")]


async def main() -> None:
    print(f"modell: {llm.MODEL} via {llm.BASE_URL}")
    t0 = time.time()
    res = await extract.extract(extract.ExtractRequest(text=TEXT, document_name="MCFFS 2026:11", domains=DOMAINS, language="sv"))
    print(f"{len(res['requirements'])} krav på {time.time() - t0:.1f} s\n")
    for r in res["requirements"]:
        print(f"[{r['chapter_section']}] {r['requirement_level']} / {r['target_type']} / sida {r['source_page']} / domän {r['domain_slug']}")
        print("   " + r["description"][:140].replace("\n", " ") + ("…" if len(r["description"]) > 140 else ""))
    print("\nrå utdata:")
    print(json.dumps(res, ensure_ascii=False, indent=1)[:1500])


if __name__ == "__main__":
    asyncio.run(main())
