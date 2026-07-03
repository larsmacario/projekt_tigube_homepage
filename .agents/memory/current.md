# Aktueller Stand

## Letzte Änderungen
- Live-Warnung bei Betriebsferien im Kontaktformular (Variante 1) implementiert. Das Formular ruft die Ferienzeiten aus der NewsBar-Tabelle ab, prüft auf Kollisionen (aktuelles Datum oder gewünschter Betreuungszeitraum) und zeigt ein elegantes Warnbanner.
- Funktion zum Zusammenführen von Leads (Merge) implementiert, inklusive neuer Backend-POST-Route und Frontend-Auswahldialog in der Lead-Detailseite.
- Kontaktformular aus dem Impressum ([page.tsx](file:///Users/larsmacario/Desktop/tigube/tierischgutbetreut/app/impressum/page.tsx)) entfernt, das Layout der Seite auf eine einspaltige, zentrierte Darstellung angepasst und die Headline sowie Beschreibung im Hero-Bereich aktualisiert.
- Gewünschte Leistungen im Kontaktformular auf *Tagesbetreuung*, *Urlaubsbetreuung* und *Mobile Katzenbetreuung* reduziert (Notfallbetreuung entfernt). Das interne Mapping verwendet weiterhin `"hundepension"`, `"tagesbetreuung"` und `"katzenbetreuung"`, um die Datenbank und Buchungssysteme kompatibel zu halten. Die Bezeichnungen im Admin-Bereich wurden entsprechend angepasst.
- Das Freitextfeld „Ihr Tier“ im Kontaktformular wurde durch ein professionelles Radio-Button-System (*Hund*, *Katze*, *Sonstiges*) ersetzt.
- Das Eingabefeld „Beste Erreichbarkeits-Zeitfenster“ wurde zu einer smarten interaktiven Auswahl umgebaut. Der Nutzer kann per Klick Tage (*Werktags*, *Wochenende*) und Uhrzeiten (*Vormittags*, *Nachmittags*, *Abends*) kombinieren. Alternativ kann er per Link eigene Zeiten im Freitext eingeben.

- Sanity.io als Standalone CMS in einem separaten Sibling-Ordner (`studio-tierisch-gut-betreut`) aufgesetzt.
- Schemas für `homepage` (Startseite als Singleton) und `service` (Dienstleistungen als Liste) entworfen und auf den Sanity Content Lake hochgeladen.
- Automatisches Seeding-Skript ausgeführt: Alle lokalen Bilder hochgeladen und die Startseite + Dienstleistungen mit den Originaldaten befüllt.
- Next.js-Frontend dynamisch angebunden mit clientseitigen und serverseitigen Integrationen (Live Content API, Draft Mode für Visual Editing, Ausfallsicherheits-Fallbacks).
- Erfolgreichen Next.js-Produktions-Build durchgeführt nach Behebung aller TypeScript- und Peer-Dependency-Fehler.

## Fokus
- Abschluss der CMS-Integration und Übergabe an den Nutzer.

## Nächste Schritte
- Lokalen Start der beiden Server (`npm run dev` für Next.js auf Port 3000 und `npx sanity dev` im Studio-Ordner auf Port 3333).
- Testen des Bearbeitungs-Workflows im Sanity Studio.


## Offene Punkte
- Das getrennte Supabase-Auth-Konto eines Kunden wird beim CRM-Löschen bewusst nicht entfernt.
