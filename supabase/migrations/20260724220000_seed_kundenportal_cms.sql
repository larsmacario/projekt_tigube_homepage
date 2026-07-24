INSERT INTO cms_content (key, data)
VALUES (
  'kundenportal',
  '{
    "checklistTitle": "CHECKLISTE",
    "checklistSubtitle": "für den Hundeurlaub in der Pension",
    "checklistSectionTitle": "für den Aufenthalt mitbringen",
    "checklistItems": [
      "Leine - Halsband - Geschirr",
      "Steuermarke",
      "Fressnapf - Wassernapf",
      "Futter - Leckerlis",
      "Bettchen - Kissen - Kuscheldecke - Box/Hundezelt",
      "Medikamente - Nahrungsergänzung inkl. Verabreichungsplan",
      "Kopie der aktuellen Hundehalter-Haftpflicht"
    ],
    "checklistWarningTitle": "ACHTUNG:",
    "checklistWarningNotes": [
      "Erneuere rechtzeitig den benötigten Impfschutz, sorge für eine Entwurmung oder eine Kotuntersuchung und führe eine Ungeziefer-Prävention durch, um deinen Hund maximal zu schützen.",
      "Stelle unbedingt sicher, dass Dritte in der Hundehalter-Haftpflicht mit inbegriffen sind.",
      "Fress- und Wassernapf sowie ein Bettchen mit Kuscheldecke stellen wir auf Wunsch selbstverständlich zur Verfügung. Dennoch macht es durchaus Sinn, die gewohnten Sachen von zu Hause in den Urlaub mitzugeben, um etwas Vertrautes in der neuen Umgebung dabei zu haben."
    ],
    "infosTitle": "Die wichtigsten Infos auf einen Blick",
    "pickupTimesTitle": "Unsere Bring- und Holzeiten",
    "pickupTimesList": [
      { "days": "Montag - Freitag", "times": "7-8h / 12-14h (mit Termin) / 17-18h" },
      { "days": "Samstag, Sonntag, Feiertag", "times": "9-10h / 17-18h" }
    ],
    "pickupTimesNote": "Außerhalb der offiziellen Zeiten nur mit Termin und gegen Aufpreis.",
    "documentsTitle": "Nötige Unterlagen für den Hundeurlaub und die Tagesbetreuung",
    "documentsIntro": "Diese Unterlagen sind zwingend notwendig für den Aufenthalt in unserer Pension. Bitte überprüfe rechtzeitig vor dem Urlaubsantritt, ob sie auf dem aktuellen Stand sind. Ohne gültige Nachweise kann keine Betreuung stattfinden.",
    "documentsItems": [
      {
        "title": "Impfpass mit den erforderlichen Impfungen",
        "description": "Parvovirose, Leptospirose, Hepatitis, Staupe, Zwingerhusten"
      },
      {
        "title": "Entwurmung/Kot-Test",
        "description": "Wurmkur mit Nachweis vom Tierarzt (den Nachweis bitte im Impfpass vermerken lassen) bzw. Kot-Test beim Check-In. Am Besten ganz frisch, jedoch nicht älter als 3 Monate."
      },
      {
        "title": "",
        "description": "Bitte sorge im eigenen Interesse für einen ausreichenden Schutz gegen Parasiten wie Zecken und Flöhe."
      }
    ],
    "cancellationTitle": "Stornierung",
    "cancellationPolicy": [
      { "period": "15 Tage und mehr vor Check-In:", "refund": "kostenlos" },
      { "period": "14 - 7 Tage vor Check-In:", "refund": "50% der Buchungssumme" },
      { "period": "6 Tage und weniger vor Check-In:", "refund": "100% der Buchungssumme" }
    ],
    "cancellationNotes": [
      "Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.",
      "Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.",
      "Tagesgäste müssen spätestens bis Mittwochabend ihren nicht benötigten Platz für die kommende Woche absagen, damit wir am Donnerstag unseren Springern den Platz anbieten können. Wird der Platz später abgesagt, gelten die o.g. Stornobedingungen."
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
