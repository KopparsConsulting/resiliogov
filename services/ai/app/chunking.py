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
# Innehållsförteckning: rader som slutar med sidnummer, ofta med punktrad före
TOC_LINE = re.compile(r"(?m)^.{3,}?(\.{3,}|\s)\s*\d{1,3}\s*$")


@dataclass
class Chunk:
    text: str
    chapter: str | None      # t.ex. "3 kap." – kapitlet som gäller vid chunkens början
    first_page: int | None
    last_section: str | None = None   # t.ex. "3 kap. 4 §" – senaste paragraf före chunkens början
    skip_reason: str | None = None    # satt om chunken inte ska extraheras (t.ex. innehållsförteckning)


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

    out: list[Chunk] = []
    chapter: str | None = None
    last_section: str | None = None
    for p in parts:
        m = re.search(r"--- Sida (\d+) ---", p)
        out.append(Chunk(text=p, chapter=chapter, first_page=int(m.group(1)) if m else None, last_section=last_section,
                         skip_reason="innehållsförteckning" if looks_like_toc(p) else None))
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
    if not chunk.chapter:
        return chunk.text
    ctx = (f"[Kapitel som gäller vid textens början: {chunk.chapter} – paragrafer utan egen kapitelrubrik "
           f"i texten tillhör detta kapitel tills en ny rubrik \"N kap.\" dyker upp.")
    if chunk.last_section:
        ctx += (f" Senaste paragraf före textens början: {chunk.last_section} – börjar texten med fortsättningen "
                f"av en punktlista eller ett \"Allmänna råd\" hör det till den paragrafen.")
    return ctx + f"]\n\n{chunk.text}"


def qualify_reference(ref: str, chunk: Chunk) -> str:
    """'19 §' → '3 kap. 19 §' när chunkens kapitel är känt och referensen saknar kapitel."""
    m = SECTION_ONLY.match(ref)
    if m and chunk.chapter:
        return f"{chunk.chapter} {re.sub(r'\s*§', ' §', re.sub(r'\s+', ' ', m.group(1))).strip()}"
    return ref


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
