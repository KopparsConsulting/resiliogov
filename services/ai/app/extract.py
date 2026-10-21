"""Extraktion av krav ur regelverkstext. Samma kontrakt som prototypens
edge-funktion extract-requirements: in {text, document_name, domains, language},
ut {requirements: [...]}. Prompten är prototypens (den är beprövad mot 418 krav);
skillnaden är att utdata tvingas följa ett JSON-schema i stället för att
förlita sig på modellens tool-calling."""
from typing import Any

from pydantic import BaseModel

from . import llm


class Domain(BaseModel):
    name: str
    slug: str


class ExtractRequest(BaseModel):
    text: str
    document_name: str | None = None
    domains: list[Domain] = []
    language: str | None = None


# Tillåtna villkorsnycklar – speglar public.trigger_logic_keys() i databasen.
FACILITY_KEYS = ["type", "length_gt", "traffic_flow_gt", "construction_type", "is_critical_entity", "has_dangerous_goods", "owner_type"]
SYSTEM_KEYS = ["is_critical_entity", "is_central_system", "is_externally_accessible", "owner_type", "system_category", "system_type",
               "linked_to_facility_type", "linked_to_critical_facility", "linked_to_dangerous_goods_facility"]

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "requirements": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "chapter_section": {"type": "string"},
                    "description": {"type": "string"},
                    "requirement_level": {"type": "string", "enum": ["mandatory", "recommended", "strategic"]},
                    "target_type": {"type": "string", "enum": ["facility", "system"]},
                    "domain_slug": {"type": ["string", "null"]},
                    "source_page": {"type": ["integer", "null"]},
                    "source_excerpt": {"type": ["string", "null"]},
                    "trigger_logic": {"type": ["object", "null"], "additionalProperties": True},
                },
                "required": ["chapter_section", "description", "requirement_level", "target_type",
                             "domain_slug", "source_page", "source_excerpt", "trigger_logic"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["requirements"],
    "additionalProperties": False,
}


def _language_instruction(language: str | None) -> str:
    if language == "sv":
        return ("\n\n=== SPRÅKKRAV — KRITISKT ===\nReturnera ENDAST krav vars beskrivning är skriven på SVENSKA i originaltexten.\n"
                "- Översätt INTE engelska eller franska krav till svenska.\n- Om ett krav endast finns på engelska/franska — HOPPA ÖVER det helt.\n"
                "- Om samma krav finns på flera språk — välj SVENSKA versionen.")
    if language == "en":
        return ("\n\n=== LANGUAGE REQUIREMENT — CRITICAL ===\nReturn ONLY requirements whose description text is written in ENGLISH in the original document.\n"
                "- Do NOT translate French, German, or Swedish requirements into English.\n- If a requirement only exists in another language — SKIP it entirely.\n"
                "- If the same requirement appears in multiple languages — pick the ENGLISH version verbatim.\n- All \"description\" fields in your output MUST be in English.")
    return ""


def system_prompt(domains: list[Domain], language: str | None) -> str:
    domain_context = "\n".join(f"- {d.name} (slug: {d.slug})" for d in domains) or "Inga domäner tillgängliga"
    return f"""Du är en expert på att extrahera krav ur regelverk, föreskrifter och standarder (svenska samt internationella IEC/ISO/EN).

UPPGIFT: Identifiera och returnera VARJE enskilt krav i texten. En textchunk innehåller normalt 5–30 krav — returnera alla. Att bara returnera ett enda krav är ett FEL om texten innehåller fler.

TILLGÄNGLIGA DOMÄNER:
{domain_context}

Vad räknas som ett krav:
- Numrerade paragrafer/sektioner med "shall", "ska", "must", "doivent", "bör", "should"
- I IEC 62443: varje CR/SR/EDR/HDR/NDR/FR med suffixet ".1 Requirement" är ETT krav
- Requirement enhancements (numrerade (1), (2)…) är SEPARATA krav (t.ex. "CR 1.1 (1)", "CR 1.1 (2)")
- Hoppa över "Rationale", "Security levels", innehållsförteckning, sidfötter

Regler:
1. Identifiera varje krav med exakt kapitel/paragraf-referens (t.ex. "4 kap. 3 §", "CR 1.1", "CR 1.2 (1)", "SR 2.3", "EDR 2.4 (1)")
2. "ska"/"shall"/"doivent" = mandatory, "bör"/"should"/"devraient" = recommended, övergripande mål = strategic
3. Mappa varje krav till en domän baserat på innehållet om möjligt (domain_slug), annars null
4. Fysisk infrastruktur → target_type = "facility", IT/system/komponenter → target_type = "system"
5. Sätt trigger_logic ENDAST om kravet har explicita villkor, annars null. Använd BARA dessa nycklar – okända nycklar avvisas:
   - target_type "facility": {", ".join(FACILITY_KEYS)}
     (type: en eller flera av Vägtunnel, Bro, IT-System, Ledningscentral, Järnvägstunnel, Trafikledningscentral, Datacenter, Spåranläggning, Signalanläggning, Elkraftsanläggning, Terminal, Trafikplats; length_gt/traffic_flow_gt: tal; construction_type: lista av Berg, Betong, Sänktunnel, Överdäckning; is_critical_entity/has_dangerous_goods: true/false; owner_type: text)
   - target_type "system": {", ".join(SYSTEM_KEYS)}
     (system_category: tunnel_traffic_ot, it_infrastructure, physical_security, communication_crisis; linked_to_facility_type: anläggningstyp enligt ovan; booleaner true/false; owner_type/system_type: text)
   - Lämna aldrig tomma värden. Klass- och säkerhetsnivå hanteras separat och ska INTE läggas i trigger_logic.
6. Beskrivningen ska vara den faktiska kravtexten — VERBATIM från dokumentet, ingen översättning, ingen sammanfattning
7. SIDNUMMER: texten innehåller markörer i formatet "--- Sida N ---". Sätt source_page till N för den närmast föregående markören där kravet börjar. Gissa aldrig ett sidnummer som inte finns i texten; saknas markör: null.
8. ORIGINALTEXT: sätt source_excerpt till det ordagranna stycket ur dokumentet som kravet härleds från (inklusive referensnumret, max ~600 tecken). Ingen omskrivning.

DEDUPLICERING:
- Texten kan innehålla SAMMA krav på flera språk (bilingual EN/FR-standarder).
- Returnera VARJE referensnummer (CR 1.1, SR 2.3, 4 kap. 3 §) ENDAST EN GÅNG.
- För IEC/ISO/EN: använd referensnumret som unik nyckel.{_language_instruction(language)}"""


def _clean_trigger_logic(tl: dict[str, Any] | None, target_type: str) -> dict[str, Any] | None:
    """Släpp igenom bara tillåtna nycklar med icke-tomma värden; databasens
    trigger validerar igen, men vi vill inte skicka skräp till granskningskön."""
    if not tl:
        return None
    allowed = FACILITY_KEYS if target_type == "facility" else SYSTEM_KEYS
    out = {k: v for k, v in tl.items() if k in allowed and v not in (None, "", [], {})}
    return out or None


async def extract(req: ExtractRequest) -> dict[str, Any]:
    user = (f"Dokumentnamn: {req.document_name or 'Okänt'}\n\n"
            f"Analysera följande text och extrahera ALLA krav (inte bara ett):\n\n{req.text}")
    result = await llm.chat_json(system_prompt(req.domains, req.language), user, SCHEMA)
    out = []
    seen: set[str] = set()
    for r in result.get("requirements", []):
        ref = (r.get("chapter_section") or "").strip()
        if not ref or not (r.get("description") or "").strip() or ref in seen:
            continue
        seen.add(ref)
        out.append({
            "chapter_section": ref,
            "description": r["description"].strip(),
            "requirement_level": r.get("requirement_level") or "mandatory",
            "target_type": r.get("target_type") or "system",
            "domain_slug": r.get("domain_slug") or None,
            "source_page": r.get("source_page") or None,
            "source_excerpt": (r.get("source_excerpt") or None),
            "trigger_logic": _clean_trigger_logic(r.get("trigger_logic"), r.get("target_type") or "system"),
        })
    return {"requirements": out, "model": llm.MODEL}
