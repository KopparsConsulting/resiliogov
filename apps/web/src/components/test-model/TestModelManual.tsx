import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ListChecks, Workflow, Layers, Lightbulb, Download } from 'lucide-react';

export function TestModelManual() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Manual som PDF</p>
          <p className="text-xs text-muted-foreground">
            Ladda ner hela manualen för utskrift eller delning med leverantör.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/Testmodell-manual.pdf" download="Testmodell-manual.pdf">
            <Download className="h-4 w-4" /> Ladda ner PDF
          </a>
        </Button>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> Vad är testmodellen?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Testmodellen kopplar regulatoriska <strong>krav</strong> mot konkreta{' '}
            <strong>system och komponenter</strong> och anger i vilket{' '}
            <strong>teststeg</strong> (FAT 1–3, SAT, OSAT) varje krav ska verifieras.
          </p>
          <p>
            Syftet är att ge en spårbar verifieringskedja: varje krav ska gå att följa
            från författning till bevis i ett specifikt test, så att man inför
            driftsättning kan visa att anläggningen uppfyller tillämpliga krav.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-primary" /> Arbetsflöde
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Importera</strong> – ladda upp Excel
              med mappningar i fliken <em>Importera</em>, eller skapa rader manuellt.
            </li>
            <li>
              <strong className="text-foreground">Mappa</strong> – i fliken{' '}
              <em>Mappning</em> kopplas varje krav mot ett system och eventuellt en
              komponent.
            </li>
            <li>
              <strong className="text-foreground">Klassificera</strong> – sätt
              tillämplighet, testbarhet, testfas, testtyp, ansvarig och bevis.
            </li>
            <li>
              <strong className="text-foreground">Följ upp</strong> – fliken{' '}
              <em>Översikt</em> visar täckning per testfas och system, framdrift över
              tid samt krav som saknar testfas eller testtyp.
            </li>
            <li>
              <strong className="text-foreground">Exportera</strong> – knappen{' '}
              <em>Exportera Excel</em> i Mappning laddar ner de rader som just nu visas
              (filter och sortering följer med), med ett blad per testtillfälle.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" /> System, komponent och anläggningsklass
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            <strong className="text-foreground">System</strong> är informationssystemet som kravet
            testas mot, till exempel ett SCADA-system eller ett kamerasystem.
          </p>
          <p>
            <strong className="text-foreground">Komponent</strong> är en enskild del under systemet,
            till exempel en PLC, switch eller server. Är fältet tomt gäller kravet hela systemet.
          </p>
          <p>
            <strong className="text-foreground">Anläggningsklass</strong> är klassificeringen 1–5 på
            den anläggning systemet tillhör — inte en egenskap på systemet självt. Klassen härleds
            automatiskt till en IEC 62443 Security Level:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Klass 1 — ingen SL (endast baskrav)</li>
            <li>Klass 2 — SL 1</li>
            <li>Klass 3 — SL 2</li>
            <li>Klass 4 — SL 3 (skydd mot sofistikerade angrepp med IACS-specifik kunskap)</li>
            <li>Klass 5 — SL 3</li>
          </ul>
          <p>
            Filtret <em>System / komponent</em> svarar alltså på <em>vilken tillgång</em> som testas,
            medan <em>Anläggningsklass</em> svarar på <em>vilken kravnivå</em> som gäller.
          </p>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-primary" /> Import, testkörning och export
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            <strong className="text-foreground">Testkörning (dry-run):</strong> när du väljer
            en Excel-fil sparas ingenting direkt. Du får en förhandsgranskning där varje rad
            markeras som <em>Ny</em>, <em>Uppdateras</em> eller <em>Hoppas över</em> (fel i raden).
          </p>
          <p>
            <strong className="text-foreground">Dubblettskydd:</strong> en rad räknas som samma
            mappning när krav, system, komponent och testtillfälle stämmer. Sådana rader uppdateras
            i stället för att skapa dubbletter. Testresultat, testdatum och uppladdade verifikat
            skrivs aldrig över av importen.
          </p>
          <p>
            <strong className="text-foreground">Export:</strong> exportfilen innehåller ett blad
            med alla valda rader och ett blad per testtillfälle, inklusive status, testdatum,
            utförd av, avvikelse och verifikat. Filen kan användas som testprotokoll eller
            underlag för leverantör.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" /> Fält per krav
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><strong>Tillämplighet</strong><p className="text-muted-foreground text-xs">Ej bedömt (standard), Ja eller Nej – gäller kravet för detta system/denna komponent?</p></div>
            <div><strong>Testbarhet</strong><p className="text-muted-foreground text-xs">Ja, Delvis eller Nej – går det att verifiera i test?</p></div>
            <div><strong>Testfas</strong><p className="text-muted-foreground text-xs">När ska kravet testas (FAT 1–3, SAT, OSAT)?</p></div>
            <div><strong>Testtyp</strong><p className="text-muted-foreground text-xs">Hur ska kravet verifieras (dokument, funktion, pentest, m.m.)?</p></div>
            <div><strong>Ansvarig</strong><p className="text-muted-foreground text-xs">Vem äger verifieringen (leverantör, TRV, tredje part).</p></div>
            <div><strong>Status</strong><p className="text-muted-foreground text-xs">Testresultat: Ej testad, Godkänd, Godkänd med anmärkning eller Underkänd.</p></div>
            <div><strong>Testdatum & Utförd av</strong><p className="text-muted-foreground text-xs">När testet genomfördes och vem som utförde det.</p></div>
            <div><strong>Avvikelse/åtgärd</strong><p className="text-muted-foreground text-xs">Fylls i när ett krav underkänns – beskriv avvikelse och planerad åtgärd.</p></div>
            <div><strong>Verifikat</strong><p className="text-muted-foreground text-xs">Uppladdat testprotokoll. Filen lagras skyddat och öppnas via tidsbegränsad länk.</p></div>
          </div>
          <p className="text-muted-foreground text-xs pt-2">
            Tips: markera flera rader med kryssrutorna och använd massredigering för att sätta samma testtillfälle, testtyp, ansvarig eller status på många krav samtidigt. Filtret ”Visa bara ofullständiga” listar rader som saknar tillämplighet, testtillfälle, testtyp, ansvarig eller verifikat.
          </p>
          <p className="text-muted-foreground text-xs">
            <strong className="text-foreground">Testkedja:</strong> markera rader och välj faser under ”Skapa testkedja” för att lägga upp samma krav i flera testomgångar (t.ex. FAT 2 → SAT → OSAT). Varje omgång får egen status och eget verifikat.
          </p>
          <p className="text-muted-foreground text-xs">
            <strong className="text-foreground">Gruppera per krav:</strong> slå på växeln ovanför tabellen för att se ett krav per rad med systemen som chips — expandera för att arbeta med de enskilda raderna. Panelikonen längst till höger öppnar full kravtext, källa och sidhänvisning samt hela testkedjan för kravet.
          </p>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-primary" /> Testfaser
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {[
            { tag: 'FAT 1', desc: 'Fabrikstest hos leverantör – grundläggande funktion och konfiguration av enskilda delsystem.' },
            { tag: 'FAT 2', desc: 'Utökad fabrikstest – integration mellan delsystem, gränssnitt och kommunikation.' },
            { tag: 'FAT 3', desc: 'Slutlig fabrikstest – fullständig konfiguration motsvarande driftmiljön, inklusive säkerhetsfunktioner.' },
            { tag: 'SAT', desc: 'Site Acceptance Test – verifiering på plats efter installation; gränssnitt mot omgivande system.' },
            { tag: 'OSAT', desc: 'Operational SAT – verifiering i drift, under realistiska förhållanden inför överlämning.' },
          ].map(p => (
            <div key={p.tag} className="flex gap-3 border-b last:border-0 pb-2 last:pb-0">
              <Badge variant="outline" className="shrink-0 w-16 justify-center">{p.tag}</Badge>
              <p className="text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" /> Testtyper
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
            <div><strong className="text-foreground">Dokumentgranskning</strong> – verifiering via underlag, rutiner eller specifikationer.</div>
            <div><strong className="text-foreground">Funktionstest</strong> – aktiv test av funktion mot förväntat beteende.</div>
            <div><strong className="text-foreground">Penetrationstest</strong> – aktiv säkerhetstest av komponent/system.</div>
            <div><strong className="text-foreground">Konfigurationstest</strong> – verifiering av inställningar mot baseline.</div>
            <div><strong className="text-foreground">Granskning av riskanalys</strong> – kontroll att risker hanterats korrekt.</div>
            <div><strong className="text-foreground">Annat</strong> – övriga verifieringsmetoder; specificera i kommentar.</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" /> Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Krav utan testfas eller testtyp listas i <em>Översikt</em> – åtgärda dem först.</li>
            <li>Samma krav kan mappas mot flera system om det gäller flera.</li>
            <li>Markera krav som <em>Ej tillämpligt</em> hellre än att radera – det bevarar spårbarheten.</li>
            <li>Ange alltid en bevisreferens när status är verifierad.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
