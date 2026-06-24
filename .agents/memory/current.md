# Aktueller Stand

## Letzte Änderungen
- Agent-Anweisungen und Memory-Dateien für zukünftige Sitzungen angelegt.
- Löschfunktion für CRM-Leads und -Kunden ergänzt, inklusive Bestätigungsdialog und Bereinigung verknüpfter CRM-Daten.
- Löschabfragen laufen nach expliziter Admin-Prüfung über den serverseitigen Service-Role-Client, damit RLS keine stille Erfolgsantwort ohne Löschung liefert.

## Fokus
- Löschfunktion mit einem Testdatensatz im laufenden Admin-Frontend verifizieren.

## Nächste Schritte
- Testdatensatz im Admin-Frontend löschen und Listenansicht prüfen.
- Änderungen nach erfolgreicher Prüfung deployen.

## Offene Punkte
- Das getrennte Supabase-Auth-Konto eines Kunden wird beim CRM-Löschen bewusst nicht entfernt.
