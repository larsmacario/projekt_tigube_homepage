import { COMBI_VACCINE_LABELS } from '@/lib/pet-vaccination'

function escapeHtml(value: string | null | undefined): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const kombiVaccinesText = COMBI_VACCINE_LABELS.join(', ')

function checklistSectionsPlain(): string {
  return [
    'Was du im Kundenportal erwartet (3 Schritte):',
    '',
    'Schritt 1 – Persönliche Daten',
    '  Pflicht: Vorname, Nachname, E-Mail, Telefonnummer, Straße, Hausnummer, PLZ, Ort, Zustimmung zur Datenschutzerklärung',
    '  Die Anschrift erscheint auch in deinem Betreuungsvertrag (Schritt 3).',
    '  Optional: zweite Telefonnummer, Notfallkontakt (Name und Nummer)',
    '',
    'Schritt 2 – Tier/e & Dokumente',
    '  Mindestens ein Tier anlegen (Name und Tierart sind Pflicht)',
    '  Stammdaten: Geschlecht, Rasse, Farbe, Wiedererkennungsmerkmal',
    '  Tierfoto',
    '  Impfpass (Foto, Bild oder PDF)',
    '  Wurmtest (Foto, Bild oder PDF)',
    '  Entwurmungsdatum (letzte bzw. nächste Stuhlprobe)',
    '  Futter, Medikamente, Besonderheiten (falls relevant)',
    '  Bei Hunden zusätzlich:',
    `    – Kombiimpfung: Datum und Intervall (${kombiVaccinesText}; Zwingerhusten oft in der Kombi enthalten)`,
    '    – Separates Datum der Zwingerhusten-Impfung',
    '',
    'Schritt 3 – Betreuungsvertrag',
    '  Vertrag im Portal lesen und digital unterzeichnen',
    '  Danach erhältst du das unterzeichnete PDF per E-Mail',
    '',
    'Tipp: Halte Impfpass, Wurmtest und Fotos deiner Tiere griffbereit (Handy-Foto oder PDF).',
    'Fehlende Angaben kannst du später im Dashboard ergänzen – für einen reibungslosen Start lohnt sich die Vorbereitung.',
  ].join('\n')
}

function checklistSectionsHtml(): string {
  return `
<p><strong>Was du im Kundenportal erwartet (3 Schritte):</strong></p>

<p><strong>Schritt 1 – Persönliche Daten</strong></p>
<ul>
  <li><strong>Pflicht:</strong> Vorname, Nachname, E-Mail, Telefonnummer, Straße, Hausnummer, PLZ, Ort, Zustimmung zur Datenschutzerklärung</li>
  <li>Die Anschrift erscheint auch in deinem Betreuungsvertrag (Schritt 3).</li>
  <li><strong>Optional:</strong> zweite Telefonnummer, Notfallkontakt (Name und Nummer)</li>
</ul>

<p><strong>Schritt 2 – Tier/e &amp; Dokumente</strong></p>
<ul>
  <li>Mindestens ein Tier anlegen (Name und Tierart sind Pflicht)</li>
  <li>Stammdaten: Geschlecht, Rasse, Farbe, Wiedererkennungsmerkmal</li>
  <li>Tierfoto</li>
  <li>Impfpass (Foto, Bild oder PDF)</li>
  <li>Wurmtest (Foto, Bild oder PDF)</li>
  <li>Entwurmungsdatum (letzte bzw. nächste Stuhlprobe)</li>
  <li>Futter, Medikamente, Besonderheiten (falls relevant)</li>
</ul>
<p><strong>Bei Hunden zusätzlich:</strong></p>
<ul>
  <li>Kombiimpfung: Datum und Intervall (${escapeHtml(kombiVaccinesText)}; Zwingerhusten oft in der Kombi enthalten)</li>
  <li>Separates Datum der Zwingerhusten-Impfung</li>
</ul>

<p><strong>Schritt 3 – Betreuungsvertrag</strong></p>
<ul>
  <li>Vertrag im Portal lesen und digital unterzeichnen</li>
  <li>Danach erhältst du das unterzeichnete PDF per E-Mail</li>
</ul>

<p><em>Tipp:</em> Halte Impfpass, Wurmtest und Fotos deiner Tiere griffbereit (Handy-Foto oder PDF). Fehlende Angaben kannst du später im Dashboard ergänzen – für einen reibungslosen Start lohnt sich die Vorbereitung.</p>
`.trim()
}

export function buildOnboardingInvitePlainText(name: string, onboardingUrl: string): string {
  return [
    `Hallo ${name},`,
    '',
    'willkommen bei tierisch gut betreut.',
    '',
    'Über diesen Link richtest du dein Kundenkonto ein und gehst danach direkt ins Onboarding im Portal:',
    onboardingUrl,
    '',
    'Der Link ist sieben Tage gültig.',
    '',
    checklistSectionsPlain(),
    '',
    'Herzliche Grüße',
    'Tamara und Gabriel',
  ].join('\n')
}

export function buildOnboardingInviteHtml(name: string, onboardingUrl: string): string {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(onboardingUrl)

  return [
    `<p>Hallo ${safeName},</p>`,
    '<p>willkommen bei tierisch gut betreut.</p>',
    '<p>Über diesen Link richtest du dein Kundenkonto ein und gehst danach direkt ins Onboarding im Portal:</p>',
    `<p><a href="${safeUrl}">Kundenkonto einrichten</a></p>`,
    '<p>Der Link ist sieben Tage gültig.</p>',
    checklistSectionsHtml(),
    '<p>Herzliche Grüße<br>Tamara und Gabriel</p>',
  ].join('')
}
