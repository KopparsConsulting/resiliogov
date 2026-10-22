"""Chunkning av regelverkstext med kapitelkontext.

Svenska författningar refererar krav som "3 kap. 19 §". En chunk som börjar mitt
i ett kapitel innehåller inte rubriken "3 kap.", och modellen skriver då bara
"19 §" – som sedan kolliderar med "19 §" i andra kapitel. Här följer vi
kapitelrubrikerna genom hela dokumentet och ger varje chunk det kapitel som
gäller vid dess början, så att extraktionen kan fylla på referenserna."""
import re
from dataclasses import dataclass

PAGE_MARK = re.compile(r"(?=--- Sida \d+ ---)")
# "3 kap." i början av en rad, ev. följt av rubrik. Inte "enligt 3 kap. 4 §" mitt i en mening.
CHAPTER_HEADING = re.compile(r"(?m)^\s*(\d+)\s*kap\.\s*(?![\d ]*§)")
SECTION_ONLY = re.compile(r"^\s*(\d+\s*[a-z]?\s*§)\s*$", re.IGNORECASE)
SECTION_HEADING = re.compile(r"(?m)^\s*(\d+\s*[a-z]?)\s*§")
# IEC 62443: "SR 1.1", "CR 3.4 RE 2", även skrivet "5.3 SR 1.1" (klausulprefix) eller "SR 1.1 (2)"
IEC_REF = re.compile(r"\b(SR|CR|EDR|HDR|NDR|SAR|SPR)\s*(\d+)\.(\d+)\s*(?:RE\s*(\d+)|\((\d+)\))?", re.IGNORECASE)
# IEC-rubrik med klausulnummer: "6.9 SR 2.7 - Concurrent session control" → klausul 6.9 = SR 2.7.
# Under den ligger "6.9.1 Requirement", "6.9.3.k" = RE k. Docling slår ihop sidor till en rad, så inget radankare.
IEC_CLAUSE_HEADING = re.compile(r"\b(\d{1,2}\.\d{1,2})\s+((?:SR|CR|EDR|HDR|NDR)\s*\d+\.\d+)\s*[-–—:]", re.IGNORECASE)
# Innehållsförteckning: rader som slutar med sidnummer, ofta med punktrad före
TOC_LINE = re.compile(r"(?m)^.{3,}?(\.{3,}|\s)\s*\d{1,3}\s*$")


@dataclass
class Chunk:
    text: str
    chapter: str | None      # t.ex. "3 kap." – kapitlet som gäller vid chunkens början
    first_page: int | None
    last_section: str | None = None   # t.ex. "3 kap. 4 §" – senaste paragraf före chunkens början
    skip_reason: str | None = None    # satt om chunken inte ska extraheras (t.ex. innehållsförteckning)
    clause_map: dict[str, str] | None = None   # IEC: klausul → krav ("5.3" → "SR 1.1"), för hela dokumentet
    last_iec: str | None = None       # IEC: senaste kravrubrik före chunkens början, t.ex. "SR 1.1 (klausul 5.3)"


def pages_to_text(pages: dict[int, str]) -> str:
    return "\n".join(f"--- Sida {n} ---\n{t}" for n, t in sorted(pages.items()))


def split(text: str, size: int) -> list[Chunk]:
    """Delar på sidgränser; bryter aldrig en sida. Kapitlet följer med mellan chunkar."""
    parts: list[str] = []
    cur = ""
    for page in PAGE_MARK.split(text):
        if cur and len(cur) + len(page) > size:
            parts.append(cur)
            cur = ""
        cur += page
    if cur.strip():
        parts.append(cur)

    clause_map = {c: canonical_reference(r) for c, r in IEC_CLAUSE_HEADING.findall(text)} or None
    out: list[Chunk] = []
    chapter: str | None = None
    last_section: str | None = None
    last_iec: str | None = None
    for p in parts:
        m = re.search(r"--- Sida (\d+) ---", p)
        out.append(Chunk(text=p, chapter=chapter, first_page=int(m.group(1)) if m else None, last_section=last_section,
                         skip_reason="innehållsförteckning" if looks_like_toc(p) else None,
                         clause_map=clause_map, last_iec=last_iec))
        iec = IEC_CLAUSE_HEADING.findall(p)
        if iec:
            last_iec = f"{canonical_reference(iec[-1][1])} (klausul {iec[-1][0]})"
        # gå igenom rubrikerna i ordning så att paragrafen får rätt kapitel
        events = sorted([(h.start(), "kap", h.group(1)) for h in CHAPTER_HEADING.finditer(p)] +
                        [(h.start(), "sec", h.group(1)) for h in SECTION_HEADING.finditer(p)])
        for _, kind, val in events:
            if kind == "kap":
                chapter = f"{val} kap."
            elif chapter:
                last_section = f"{chapter} {val.replace(' ', '')} §"
    return out


def with_context(chunk: Chunk) -> str:
    """Texten som skickas till modellen: kapitelkontext först om chunken börjar mitt i ett kapitel."""
    notes = []
    if chunk.chapter:
        notes.append(f"Kapitel som gäller vid textens början: {chunk.chapter} – paragrafer utan egen kapitelrubrik "
                     f"i texten tillhör detta kapitel tills en ny rubrik \"N kap.\" dyker upp.")
        if chunk.last_section:
            notes.append(f"Senaste paragraf före textens början: {chunk.last_section} – börjar texten med fortsättningen "
                         f"av en punktlista eller ett \"Allmänna råd\" hör det till den paragrafen.")
    if chunk.last_iec:
        notes.append(f"Senaste krav före textens början: {chunk.last_iec}. I IEC 62443 är klausulen N.M = kravet, "
                     f"N.M.1 = kravtexten och N.M.3.k = requirement enhancement k, dvs. \"{chunk.last_iec.split(' (')[0]} RE k\". "
                     f"Använd kravreferensen (SR/CR …), inte klausulnumret.")
    if not notes:
        return chunk.text
    return "[" + " ".join(notes) + f"]\n\n{chunk.text}"


def qualify_reference(ref: str, chunk: Chunk) -> str:
    """'19 §' → '3 kap. 19 §' när chunkens kapitel är känt och referensen saknar kapitel.
    IEC: '5.3.3.2' → 'SR 1.1 RE 2' och '6.9' / '6.9.1' → 'SR 2.7' via klausulkartan."""
    m = SECTION_ONLY.match(ref)
    if m and chunk.chapter:
        return f"{chunk.chapter} {re.sub(r'\s*§', ' §', re.sub(r'\s+', ' ', m.group(1))).strip()}"
    if chunk.clause_map and not IEC_REF.search(ref):
        c = re.fullmatch(r"\s*(\d{1,2}\.\d{1,2})(?:\.1)?\s*", ref)
        if c and c.group(1) in chunk.clause_map:
            return chunk.clause_map[c.group(1)]
        e = re.fullmatch(r"\s*(\d{1,2}\.\d{1,2})\.3\.(\d+)\s*", ref)
        if e and e.group(1) in chunk.clause_map:
            return f"{chunk.clause_map[e.group(1)]} RE {e.group(2)}"
    return ref


def reference_in_text(ref: str, chunk: Chunk) -> bool:
    """Spärr mot påhittade referenser: kravets nummer måste finnas i chunktexten – eller vara
    det krav/den paragraf som pågick när chunken började (fortsättning över chunkgräns).
    (Modellen hittade på 'CR 1.1 … CR 1.32' i ett Scope-avsnitt för att prompten nämner CR som exempel.)"""
    text = chunk.text
    m = IEC_REF.search(ref)
    if m:
        prefix, a, b, re1, re2 = m.groups()
        base = f"{prefix.upper()} {a}.{b}"
        if re.search(rf"\b{prefix}\s*{a}\.{b}\b", text, re.IGNORECASE):
            return True
        if chunk.last_iec and chunk.last_iec.startswith(base + " "):
            return True
        # RE-numret kan stå som klausul "N.M.3.k" när rubriken ligger i föregående chunk
        n = re1 or re2
        return bool(n) and bool(re.search(rf"\b\d{{1,2}}\.\d{{1,2}}\.3\.{n}\b", text))
    sw = re.search(r"((\d+)\s*[a-z]?)\s*§", ref)
    if sw:
        if re.search(rf"\b{sw.group(1).replace(' ', '')}\s*§", text):
            return True
        # fortsättning: punktlista eller allmänna råd till paragrafen som pågick vid chunkens början
        return bool(chunk.last_section) and chunk.last_section.replace(" ", "") in ref.replace(" ", "")
    # övriga: sista numeriska token i referensen ska förekomma
    tokens = re.findall(r"\d+(?:\.\d+)*", ref)
    return not tokens or any(re.search(rf"(?<![\d.]){re.escape(t)}(?![\d.])", text) for t in tokens[-1:])


def looks_like_toc(text: str) -> bool:
    """Innehållsförteckning: en stor andel av raderna slutar med ett sidnummer.
    Modellen läser annars varje rad ("5.3 SR 1.1 ... 29") som ett krav."""
    lines = [l for l in text.splitlines() if l.strip() and not l.startswith("--- Sida")]
    if len(lines) < 15:
        return False
    toc = sum(1 for l in lines if TOC_LINE.match(l))
    return toc / len(lines) >= 0.5


def canonical_reference(ref: str) -> str:
    """Normaliserar IEC-referenser till facits form: "5.3 SR 1.1 (2)" → "SR 1.1 RE 2".
    Övriga referenser (svenska paragrafer) lämnas orörda."""
    m = IEC_REF.search(ref or "")
    if not m:
        return re.sub(r"\s+", " ", (ref or "").strip())
    prefix, a, b, re1, re2 = m.groups()
    out = f"{prefix.upper()} {a}.{b}"
    n = re1 or re2
    return f"{out} RE {n}" if n else out
