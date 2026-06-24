# Tigube Homepage - Tierbetreuungsservice Website

Professionelle Website für "Tierisch Gut Betreut" - einen Tierbetreuungsservice in Moos. Die Website dient als digitale Visitenkarte und Kundenakquise-Tool für den Tierbetreuungsservice.

## Projektübersicht

Diese Website wurde entwickelt, um Vertrauen zu schaffen und Kontaktanfragen für den Tierbetreuungsservice zu generieren. Sie richtet sich an Tierbesitzer in Moos und Umgebung, die professionelle Betreuung für ihre Haustiere benötigen.

### Kernfunktionen

- **Landingpage** mit Hero-Bereich und Vertrauensindikatoren
- **Services-Übersicht** mit Preisen und Features
- **Über uns** Sektion für Vertrauen und Glaubwürdigkeit
- **Kundenbewertungen** als Social Proof
- **Kontaktformular** für Anfragen
- **Admin-Bereich** für Verwaltung von Kunden, Leads und Inhalten
- **Kundenportal** für registrierte Kunden
- **Responsive Design** für alle Geräte

### Services

1. **Hundepension** (ab 35€/Tag) - Betreuung im hundefreundlichen Zuhause
2. **Mobile Katzenbetreuung** (ab 18€/Besuch) - Katze bleibt in gewohnter Umgebung
3. **Tagesbetreuung** (ab 25€/Tag) - Flexible Betreuung für Berufstätige
4. **Notfallbetreuung** (auf Anfrage) - 24h Erreichbarkeit

## Technologie-Stack

### Frontend
- **Next.js 15.2.4** mit App Router
- **React 19** - UI Library
- **TypeScript** - Typsicherheit
- **Tailwind CSS** - Utility-First CSS Framework
- **Radix UI** - Accessible UI Primitives
- **shadcn/ui** - Wiederverwendbare Komponenten
- **Lucide React** - Icon Library

### Backend & Datenbank
- **Supabase** - PostgreSQL-Datenbank
- **Next.js API Routes** - Server-Side API-Endpoints
- **SMTP / Nodemailer** - E-Mail-Versand für Lead-Anfragen

## Entwicklung

### Voraussetzungen

- Node.js 18+ oder höher
- pnpm oder npm
- Supabase-Projekt

### Installation

```bash
# Dependencies installieren
pnpm install
# oder
npm install
```

### Entwicklungsserver starten

```bash
# Development Server starten
pnpm dev
# oder
npm run dev
```

Die Anwendung läuft dann unter [http://localhost:3000](http://localhost:3000)

### Build für Produktion

```bash
# Production Build erstellen
pnpm build
# oder
npm run build

# Production Server starten
pnpm start
# oder
npm start
```

### Code-Qualität

```bash
# Linting
pnpm lint
# oder
npm run lint
```

## Umgebungsvariablen

### Erforderlich

Erstelle eine `.env.local` Datei im Root-Verzeichnis mit folgenden Variablen:

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Schlüssel für serverseitige Datenbankzugriffe |
| `SMTP_HOST` | SMTP-Hostname des Postfach-Anbieters |
| `SMTP_PORT` | SMTP-Port, üblicherweise `587` (STARTTLS) oder `465` (TLS) |
| `SMTP_SECURE` | `true` für Port 465, sonst `false` |
| `SMTP_USER` | SMTP-Benutzername |
| `SMTP_PASSWORD` | SMTP-Passwort oder App-Passwort |
| `SMTP_FROM` | Verifizierter Absender, standardmäßig `info@tierischgutbetreut.de` |
| `SMTP_TO` | Empfänger der internen Lead-Benachrichtigung, standardmäßig `info@tierischgutbetreut.de` |

### Google Places API (Optional)

Für die Integration von Google Bewertungen:

| Variable | Beschreibung |
|----------|--------------|
| `GOOGLE_PLACES_API_KEY` | Google Cloud API-Schlüssel |
| `GOOGLE_PLACE_ID` | Place ID des Geschäfts |

#### Setup Google Places API

1. **Google Cloud Console** öffnen: https://console.cloud.google.com/
2. **Projekt erstellen** oder bestehendes auswählen
3. **Places API aktivieren** unter APIs & Dienste > Bibliothek
4. **API-Schlüssel erstellen** unter APIs & Dienste > Anmeldedaten
5. **Schlüssel einschränken** (empfohlen):
   - Anwendungseinschränkungen: HTTP-Referrer oder Server-IP
   - API-Einschränkungen: Nur "Places API"

#### Place ID finden

- **Place ID Finder**: https://developers.google.com/maps/documentation/places/web-service/place-id
- **Google Maps**: Geschäft suchen, in der URL nach dem Teil `!1s` suchen

#### Kosten

- Google bietet **200$/Monat Freikontingent**
- Place Details Request: **$0.017 pro Anfrage**
- Mit 1h-Caching: ca. 720 Anfragen/Monat = ~**$12/Monat**

## Projektstruktur

```
projekt_tigube_homepage/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin-Bereich
│   ├── api/               # API Routes
│   ├── portal/            # Kundenportal
│   └── page.tsx           # Homepage
├── components/            # React Komponenten
│   ├── admin/            # Admin-Komponenten
│   ├── auth/             # Authentifizierung
│   └── ui/               # UI-Komponenten (shadcn/ui)
├── lib/                  # Utilities und Helper
├── hooks/                # Custom React Hooks
├── public/               # Statische Assets
├── memory-bank/          # Projektdokumentation
└── styles/               # Globale Styles
```

## Features im Detail

### Admin-Bereich
- Dashboard mit Übersicht
- Kundenverwaltung
- Lead-Management
- Testimonials-Verwaltung
- Newsbar-Verwaltung
- Eigenschaften-Verwaltung

### Kundenportal
- Profil-Verwaltung
- Haustiere-Verwaltung
- Dokumente-Verwaltung

### Öffentliche Seiten
- Homepage mit Services
- Hundepension Detailseite
- Katzenbetreuung Detailseite
- Kundenstimmen
- Impressum

## Design-System

### Farbpalette
- **Sage-600**: Primärfarbe für Buttons und Akzente
- **Sage-50/100**: Hintergründe für Sektionen
- **Sage-900**: Dunkle Texte und Headlines
- **Gray-600**: Sekundäre Texte

### Typographie
- **Raleway**: Headlines und wichtige Texte
- Responsive Schriftgrößen mit Tailwind

## Sicherheit

- **Row Level Security (RLS)** in Supabase aktiviert
- Validierung auf Client- und Server-Side
- Sichere Formular-Übertragung
- Authentifizierung für Admin- und Portal-Bereiche

## Browser-Unterstützung

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Browser (iOS Safari, Chrome Mobile)

## Lizenz

Privat - Alle Rechte vorbehalten
