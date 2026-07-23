-- Create cms_content table
CREATE TABLE IF NOT EXISTS cms_content (
  key VARCHAR PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to cms_content"
  ON cms_content FOR SELECT
  USING (true);

-- Allow authenticated admin write access
CREATE POLICY "Allow admin write access to cms_content"
  ON cms_content FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for cms assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-assets', 'cms-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public read access to cms-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-assets');

CREATE POLICY "Allow admin write access to cms-assets"
  ON storage.objects FOR ALL
  USING (bucket_id = 'cms-assets')
  WITH CHECK (bucket_id = 'cms-assets');

-- Seed initial data
INSERT INTO cms_content (key, data)
VALUES 
  ('homepage', '{
    "heroTitle": "Tierbetreuung mit Herz und Verstand",
    "heroSubtitle": "Wir betreuen Ihre Lieblinge mit der Hingabe und Sorgfalt, die sie verdienen. Professionell, liebevoll und mit jahrelanger Erfahrung - damit Sie beruhigt sein können.",
    "heroMainImage": "/images/pexels-helenalopes-2253275.jpg",
    "heroSecondaryImage": "/images/pexels-kirsten-buhne-682055-1521304.jpg",
    "heroTrustIndicators": [
      "Versichert & zertifiziert",
      "Über 400 zufriedene Kunden",
      "5/5 Sterne Bewertung"
    ],
    "aboutTitle": "(D)ein Team für alle Felle",
    "aboutSubtitle": "Wir sind da wenn Du uns brauchst! Ganz gleich, ob Du in den Urlaub fährst, krank bist, einen Termin beim Tierarzt oder Groomer aus Zeitgründen nicht wahrnehmen kannst oder Dein eigentlicher Gassigänger/Katzensitter ausfällt - wir sind gerne für Dich und Deine Fellnase da!",
    "tamaraName": "Tamara Pfaff",
    "tamaraTexts": [
      "Mit Hunden und Katzen habe ich seit meiner Kindheit zu tun. Ob eigenes Haustier oder auch ehrenamtliche Hundenanny im Tierheim - ohne Fellnase war mein Leben noch nie!",
      "Aktuell beglückt mich unser Boxermädchen Luna mit ihrer Anwesenheit. Tiefes Verständnis für individuelle Bedürfnisse des einzelnen Tieres eignete ich mir in fachspezifischen Kursen und Ausbildungen, aber vor allem in der Praxis an.",
      "Als stellvertretende Leitung auf einem Schweizer Hunde-Gnadenhof konnte ich unglaublich viel Erfahrung mit verhaltensoriginellen Hunden sammeln. Für mich gibt es keine schwierigen Felle sondern nur große Herausforderungen! Und ich liebe Herausforderungen."
    ],
    "tamaraImage": "/images/tigube_Tamara_Pfaff.jpg",
    "gabrielName": "Gabriel Haaga",
    "gabrielTexts": [
      "Hunde waren mir als Kind nicht ganz geheuer. Als mich ein kleiner Dackel beim Spielen abschleckte dachte ich, der frisst mich gleich. Aber dem war nicht so!",
      "Das war verrückterweise der Beginn meiner großen Liebe zu Hunden. Mit Lunchen habe ich den ersten eigenen Hund und will natürlich mein Bestes geben im Umgang und in der Erziehung.",
      "Aus diesem Grund habe ich mit Mara zusammen eine Ausbildung zum Hundetrainer und Problemhunde-Therapeuten gemacht. Das Wissen kommt hier nicht nur bei uns zu Hause zum Einsatz, sondern vor allem im Umgang mit besonderen Hunden in unserer Pension."
    ],
    "gabrielImage": "/images/tigube_Gabriel_Haaga.jpg",
    "lunaTitle": "Unsere pelzigen Kollegen",
    "lunaSubtitle": "Luna ist nicht nur unser Familienmitglied, sondern auch unsere beste Lehrmeisterin. Sie zeigt uns täglich, was es heißt, bedingungslos zu lieben, im Moment zu leben und dass ein Leckerli alle Probleme der Welt lösen kann. Außerdem ist sie unsere strengste Qualitätsprüferin - wer bei ihr punktet, hat definitiv das Zeug zum Tierflüsterer! 🐕",
    "lunaImage": "/images/Boxer_Hund_Luna.jpg",
    "lunaDescription": "Boxermädchen mit Herz und Seele. Spezialistin für Herzensangelegenheiten und Chefin der Qualitätskontrolle bei Streicheleinheiten.",
    "aboutCtaText": "Ab hier wäre ein richtig guter Zeitpunkt, Kontakt zu uns aufzunehmen, um ein unverbindliches Erstgespräch zu vereinbaren.",
    "aboutCtaSubtitle": "Lass uns in aller Ruhe herausfinden, ob die Chemie zwischen allen Beteiligten stimmt. Ist dem so und alle wichtigen Fragen sind geklärt und Du mit unserem Angebot einverstanden, dann können wir die Betreuung in dringenden Fällen auch kurzfristig übernehmen.",
    "statExperience": "15+",
    "statExperienceLabel": "Jahre Erfahrung",
    "statClients": "400+",
    "statClientsLabel": "Zufriedene Kunden",
    "statAnimals": "500+",
    "statAnimalsLabel": "Betreute Tiere",
    "contactTitle": "Kontakt aufnehmen",
    "contactSubtitle": "Haben Sie Fragen oder möchten Sie einen Termin vereinbaren? Wir freuen uns auf Ihre Nachricht!",
    "contactPhone": "07732-988 50 91",
    "contactEmail": "info@tierischgutbetreut.de",
    "contactLocation": "78345 Moos",
    "contactAvailability": "Mo-So: 8:00-20:00 Uhr",
    "contactWhatsAppUrl": "https://wa.me/491754685977"
  }'::jsonb),

  ('hundepension', '{
    "badge": "Hundepension",
    "heroSubtitle": "Tages- und Urlaubsbetreuung für Deinen Hund",
    "heroIntroText": "Du suchst Unterstützung in der Betreuung, weil:",
    "heroChecklist": [
      "Du arbeiten gehst und Dein Hund nicht allein zu Hause bleiben soll bzw. kann",
      "Du einen Plan B für Deine aktuelle Betreuung sucht",
      "Du in Urlaub / in Kur gehst oder ins Krankenhaus kommst",
      "Du ein Hunde freies Wochenende machen möchtest",
      "Dein Hund Zeit mit Hundefreunden verbringen soll"
    ],
    "heroPriceBadge": "ab 31€/Tag",
    "heroImageSrc": "/images/pexels-thijsvdw-998251.jpg",
    "qualificationsTitle": "Unsere Qualifikationen",
    "qualificationsSubtitle": "Langjährige Erfahrung mit den unterschiedlichsten Rassen und Charakteren",
    "qualificationsList": [
      {
        "title": "Hundetrainer & Problemhunde-Therapeut",
        "description": "Unsere Ausbildungen befähigen uns auch für den Umgang mit verhaltens-originellen Hunden."
      },
      {
        "title": "Spezialbetreuung",
        "description": "Betreuung von Schutz-, Polizei- und Zollhunden ist möglich, da wir diese von anderen Gast-Hunden separieren können."
      },
      {
        "title": "Sporthunde-Trainer",
        "description": "Artgerechte, körperliche Auslastung über den Tag verteilt - dem Alter und Fitnessgrad Deines Hundes angepasst."
      }
    ],
    "activitiesTitle": "Bei uns darf Dein Hund ein Hund sein",
    "activitiesSubtitle": "Eine zusätzliche Ausbildung zum Sporthunde-Trainer garantiert die artgerechte, körperliche Auslastung über den Tag verteilt - dem Alter und Fitnessgrad Deines Hundes angepasst.",
    "activitiesList": [
      "Kleine sportliche Einheiten",
      "Wasserspiele im Sommer",
      "Artgerechte körperliche und geistige Auslastung",
      "Erholungs- und Ruhephasen"
    ],
    "activitiesSummary": "Artgerechte körperliche und geistige Auslastung gepaart mit Erholungs- und Ruhephasen sorgen dafür, dass Du einen zufriedenen, ausgeglichenen Hund wieder bei uns abholst.",
    "priceListTitle": "Unsere Preise",
    "priceListSubtitle": "Transparente Preisgestaltung für alle Leistungen",
    "priceList": [
      {
        "service": "Kennenlernen",
        "price": "49€",
        "duration": "60 Minuten",
        "note": "Eine Betreuung ohne Erstgespräch ist nicht möglich. Ein Probetag für die Tagesbetreuung ist sinnvoll, ein bis zwei Übernachtungen vor einem Urlaubsaufenthalt sind ein Muss."
      },
      {
        "service": "Hündin/Rüde, verträglich",
        "price": "31€",
        "duration": "je Kalendertag"
      },
      {
        "service": "Rüde, unkastriert",
        "price": "39€",
        "duration": "je Kalendertag"
      },
      {
        "service": "Hündin/Rüde, unverträglich/aggressiv",
        "price": "55€",
        "duration": "je Kalendertag"
      }
    ],
    "additionalServicesTitle": "Zusätzliche Leistungen",
    "additionalServices": [
      { "service": "Übernachtung", "price": "10€", "unit": "je Nacht" },
      { "service": "Läufige Hündin/inkontinenter Hund/Hunde bis 6 Monate", "price": "8€", "unit": "je angefangenem Tag" },
      { "service": "Medikamentengabe/Nahrungsergänzung", "price": "1,50€", "unit": "je Gabe" },
      { "service": "Fütterung BARF/gekocht, tiefgefroren (mitgebracht)", "price": "1,50€", "unit": "je Fütterung" },
      { "service": "Zwischenreinigung der Box aufgrund Markierens, Durchfall, etc.", "price": "25€", "unit": "pauschal" },
      { "service": "Sonn- und Feiertagspauschale", "price": "50%", "unit": "Zuschlag auf Tagespreis" },
      { "service": "An- und Abreise an Sonn- und Feiertagen", "price": "19€", "unit": "pauschal" }
    ],
    "cancellationPolicyTitle": "Stornierungsbedingungen",
    "cancellationPolicy": [
      { "period": "15 Tage und mehr vor Check-In", "refund": "100% Rückerstattung" },
      { "period": "14 - 7 Tage vor Check-In", "refund": "50% Rückerstattung" },
      { "period": "6 Tage und weniger vor Check-In", "refund": "keine Rückerstattung" }
    ],
    "pickupTimesTitle": "Bring- und Holzeiten",
    "pickupTimesList": [
      { "days": "Montag - Freitag", "times": "7-8h / 12-14h (nur mit festem Termin) / 17-18h" },
      { "days": "Samstag - Sonn-/Feiertag", "times": "9-10h / 17-18h" }
    ],
    "warningBoxTitle": "Achtung",
    "warningBoxNotes": [
      "Individuelle Bring- und Holzeiten außerhalb der angegebenen Zeiten zzgl. 8€/Termin",
      "Urlaubsgäste, die unter der Woche vor 7h und am Wochenende/Feiertagen vor 8h gebracht werden sollten, müssen am Tag davor anreisen (abends nur für Stammgäste möglich)",
      "Hunde, die abends nicht bis spätestens 20h geholt werden können, bleiben kostenpflichtig über Nacht bei uns"
    ],
    "warningBoxSummary": "Wir bitten um Pünktlichkeit beim Bringen und Holen, da wir ein sehr strenges Programm haben - Hundebetreuung ist viel mehr als Gassi gehen, spielen und schmusen.",
    "contactCtaTitle": "Wenn das für Dich interessant klingt...",
    "contactCtaSubtitle": "...dann lass uns wissen, wie wir Dich in der Betreuung unterstützen können.",
    "contactCtaWhatsAppUrl": "https://wa.me/491754685977",
    "contactCtaInfo": "Kontakt: +49 175 4685977 (WhatsApp/Anruf) • info@tierischgutbetreut.de"
  }'::jsonb),

  ('katzenbetreuung', '{
    "title": "Katzenbetreuung",
    "badge": "Katzenbetreuung",
    "heroSubtitle": "Deine Samtpfote in besten Händen",
    "heroIntroText": "Katzen lieben ihre gewohnte Umgebung. Sie in Urlaub außer Haus zu geben, bringt ihr ordentlich Stress. Die Betreuung in gewohnter Umgebung ist die beste Lösung für die Zeit Deiner Abwesenheit. Ist Deine Mieze ein Freigänger, so kann sie ihren ganz normalen Gewohnheiten nachgehen.",
    "heroChecklist": [],
    "heroPriceBadge": "ab 12,50€/Besuch",
    "heroImageSrc": "/images/pexels-kerber-774731.jpg",
    "qualificationsTitle": "Unsere Katzenbetreuung beinhaltet",
    "qualificationsSubtitle": "Ein Besuch dauert 30 Minuten und umfasst alle wichtigen Leistungen für das Wohlbefinden Deiner Katze.",
    "qualificationsList": [
      { "title": "Füttern", "description": "" },
      { "title": "Näpfe reinigen", "description": "" },
      { "title": "Frisches Wasser", "description": "" },
      { "title": "Spielen, bürsten, beschäftigen", "description": "" },
      { "title": "Gesellschaft leisten", "description": "" },
      { "title": "Missgeschicke bereinigen" }
    ],
    "activitiesTitle": "Zusätzliche Betreuungs-Hinweise",
    "activitiesSubtitle": "Selbstverständlich wird das Katzenkistchen gereinigt (nur Hinterlassenschaften, keine Vollreinigung) und um das Katzenkistchen gefegt.",
    "activitiesList": [],
    "activitiesSummary": "",
    "priceListTitle": "Preise",
    "priceListSubtitle": "Transparente Preisgestaltung für alle Leistungen",
    "priceList": [
      { "service": "Erstgespräch", "price": "25€", "duration": "ca. 30 Min vor Ort" },
      { "service": "1 Besuch/Tag", "price": "14,50€", "duration": "ca. 30 Min je Besuch" },
      { "service": "2 Besuche/Tag", "price": "12,50€", "duration": "ca. 30 Min je Besuch" }
    ],
    "additionalServicesTitle": "Zusätzliche Leistungen",
    "additionalServices": [
      { "service": "Streu komplett tauschen", "price": "10€", "unit": "pauschal" },
      { "service": "Medikamentengabe", "price": "1,50€", "unit": "je Gabe" },
      { "service": "Schlüssel holen/bringen", "price": "5€", "unit": "je holen und bringen" },
      { "service": "Fahrtkosten", "price": "0,55€/km", "unit": "An- und Abfahrt" },
      { "service": "Sonn- und Feiertagszuschlag", "price": "50%", "unit": "auf den vereinbarten Tagespreis" }
    ],
    "cancellationPolicyTitle": "Stornierungsbedingungen",
    "cancellationPolicy": [
      { "period": "15 Tage und mehr vor Betreuungsbeginn", "refund": "100% Rückerstattung" },
      { "period": "14-7 Tage vor Betreuungsbeginn", "refund": "50% Rückerstattung" },
      { "period": "6 Tage und weniger vor Betreuungsbeginn", "refund": "keine Rückerstattung" }
    ],
    "warningBoxTitle": "Wichtige Hinweise",
    "warningBoxNotes": [
      "Alle Preise verstehen sich netto, auf der Rechnung werden 19% USt. ausgewiesen",
      "Die Steuer kann beim Finanzamt als ''haushaltsnahe Dienstleistung'' abgesetzt werden",
      "Leistungen werden im Voraus beim Erstgespräch definiert und in einem Angebot zugesandt",
      "Medikamentengabe nur möglich, wenn die Katze zutraulich ist",
      "Rechnungsbetrag ist vor Betreuungsbeginn in voller Höhe zu begleichen",
      "Im Preis enthalten ist eine Haftpflichtversicherung gegen Schäden oder Schlüsselverlust"
    ],
    "warningBoxSummary": "Für einen genauen Betreuungspreis machen wir Dir ein unverbindliches Angebot. Betreuungstage werden nicht zurückerstattet bei vorzeitiger Rückkehr aus dem Urlaub. Bitte rechtzeitig absagen. Reservierte Zeit wird bei Nichterscheinen in voller Höhe in Rechnung gestellt.",
    "contactCtaTitle": "Deine Samtpfote verdient die beste Betreuung",
    "contactCtaSubtitle": "Vereinbare jetzt ein unverbindliches Erstgespräch und lass uns gemeinsam die perfekte Betreuung für Deine Katze planen.",
    "contactCtaWhatsAppUrl": "https://wa.me/4917672404561",
    "contactCtaInfo": "Kontakt: 0176-724 045 61 (WhatsApp/Anruf) • info@tierischgutbetreut.de"
  }'::jsonb),

  ('agb', '{
    "title": "Betreuungsvertrag",
    "content": ""
  }'::jsonb),

  ('datenschutz', '{
    "title": "Datenschutzerklärung",
    "content": ""
  }'::jsonb),

  ('impressum', '{
    "title": "Impressum",
    "content": ""
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
