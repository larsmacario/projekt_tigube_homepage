-- Stornobedingungen v2: zentrale Textvarianten (wörtliche CMS/AGB-Übernahme)

UPDATE public.cancellation_policies
SET is_active = false,
    updated_at = timezone('utc'::text, now())
WHERE is_active = true;

INSERT INTO public.cancellation_policies (version, is_active, config, updated_at)
SELECT
  COALESCE((SELECT MAX(version) FROM public.cancellation_policies), 0) + 1,
  true,
  $$
{
  "title": "Stornierungsbedingungen",
  "displayTitles": {
    "landing": {
      "hundepension": "Stornierungsbedingungen",
      "katzenbetreuung": "Stornierungsbedingungen"
    },
    "portal": "Stornierung",
    "contract": "Stornierung"
  },
  "cutoffHour": 18,
  "generalNotes": [
    "Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.",
    "Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.",
    "Tagesgäste müssen spätestens bis Mittwochabend ihren nicht benötigten Platz für die kommende Woche absagen, damit wir am Donnerstag unseren Springern den Platz anbieten können. Wird der Platz später abgesagt, gelten die o.g. Stornobedingungen."
  ],
  "ruleSets": [
    {
      "id": "standard",
      "name": "Standard",
      "condition": { "type": "default" },
      "priority": 0,
      "serviceScopes": ["hundepension", "tagesbetreuung"],
      "sectionTitles": {
        "landing": "Stornierungsfristen außerhalb der Schulferien BW",
        "contract": "",
        "portal": ""
      },
      "tiers": [
        {
          "minDaysBefore": 15,
          "maxDaysBefore": null,
          "chargePercent": 0,
          "label": "15 Tage und mehr vor Check-In",
          "display": {
            "landing": { "period": "15 Tage und mehr vor Check-In", "refund": "100% Rückerstattung" },
            "contract": { "period": "15 Tage und mehr vor Check-In:", "refund": "100% Rückerstattung" },
            "portal": { "period": "15 Tage und mehr vor Check-In:", "refund": "kostenlos" }
          }
        },
        {
          "minDaysBefore": 7,
          "maxDaysBefore": 14,
          "chargePercent": 50,
          "label": "14 - 7 Tage vor Check-In",
          "display": {
            "landing": { "period": "14 - 7 Tage vor Check-In", "refund": "50% Rückerstattung" },
            "contract": { "period": "14 - 7 Tage vor Check-In:", "refund": "50% Rückerstattung" },
            "portal": { "period": "14 - 7 Tage vor Check-In:", "refund": "50% der Buchungssumme" }
          }
        },
        {
          "minDaysBefore": 0,
          "maxDaysBefore": 6,
          "chargePercent": 100,
          "label": "6 Tage und weniger vor Check-In",
          "display": {
            "landing": { "period": "6 Tage und weniger vor Check-In", "refund": "keine Rückerstattung" },
            "contract": { "period": "6 Tage und weniger vor Check-In:", "refund": "keine Rückerstattung" },
            "portal": { "period": "6 Tage und weniger vor Check-In:", "refund": "100% der Buchungssumme" }
          }
        }
      ],
      "notes": []
    },
    {
      "id": "school_holidays_bw",
      "name": "Schulferien Baden-Württemberg",
      "condition": { "type": "school_holidays_bw" },
      "priority": 10,
      "serviceScopes": ["hundepension", "tagesbetreuung"],
      "sectionTitles": {
        "landing": "Stornierungsfristen in den Schulferien BW",
        "contract": "ACHTUNG - Für die Stornierung von Aufenthalten die in die gesetzlichen Schulferien des Landes BW fallen, gelten folgende Stornofristen:",
        "portal": "ACHTUNG - Für die Stornierung von Aufenthalten die in die gesetzlichen Schulferien des Landes BW fallen, gelten folgende Stornofristen:"
      },
      "tiers": [
        {
          "minDaysBefore": 56,
          "maxDaysBefore": null,
          "chargePercent": 0,
          "label": "56 Tage und mehr vor Check-In",
          "display": {
            "landing": { "period": "56 Tage und mehr vor Check-In", "refund": "100% Rückerstattung" },
            "contract": { "period": "56 Tage und mehr vor Check-In:", "refund": "kostenlos" },
            "portal": { "period": "56 Tage und mehr vor Check-In:", "refund": "kostenlos" }
          }
        },
        {
          "minDaysBefore": 21,
          "maxDaysBefore": 55,
          "chargePercent": 50,
          "label": "55-21 Tage vor Check-In",
          "display": {
            "landing": { "period": "55-21 Tage vor Check-In", "refund": "50% Rückerstattung" },
            "contract": { "period": "55-21 Tage vor Check-In:", "refund": "50% der Buchungssumme" },
            "portal": { "period": "55-21 Tage vor Check-In:", "refund": "50% der Buchungssumme" }
          }
        },
        {
          "minDaysBefore": 0,
          "maxDaysBefore": 20,
          "chargePercent": 100,
          "label": "20 Tage und weniger vor Check-In",
          "display": {
            "landing": { "period": "20 Tage und weniger vor Check-In", "refund": "keine Rückerstattung" },
            "contract": { "period": "20 Tage und weniger vor Check-In:", "refund": "100% der Buchungssumme" },
            "portal": { "period": "20 Tage und weniger vor Check-In:", "refund": "100% der Buchungssumme" }
          }
        }
      ],
      "notes": []
    },
    {
      "id": "standard_katzen",
      "name": "Katzen Standard",
      "condition": { "type": "default" },
      "priority": 0,
      "serviceScopes": ["katzenbetreuung"],
      "sectionTitles": { "landing": "", "contract": "", "portal": "" },
      "tiers": [
        {
          "minDaysBefore": 15,
          "maxDaysBefore": null,
          "chargePercent": 0,
          "label": "15 Tage und mehr vor Betreuungsbeginn",
          "display": {
            "landing": { "period": "15 Tage und mehr vor Betreuungsbeginn", "refund": "100% Rückerstattung" },
            "contract": { "period": "15 Tage und mehr vor Betreuungsbeginn:", "refund": "100% Rückerstattung" },
            "portal": { "period": "15 Tage und mehr vor Betreuungsbeginn:", "refund": "100% Rückerstattung" }
          }
        },
        {
          "minDaysBefore": 7,
          "maxDaysBefore": 14,
          "chargePercent": 50,
          "label": "14-7 Tage vor Betreuungsbeginn",
          "display": {
            "landing": { "period": "14-7 Tage vor Betreuungsbeginn", "refund": "50% Rückerstattung" },
            "contract": { "period": "14-7 Tage vor Betreuungsbeginn:", "refund": "50% Rückerstattung" },
            "portal": { "period": "14-7 Tage vor Betreuungsbeginn:", "refund": "50% Rückerstattung" }
          }
        },
        {
          "minDaysBefore": 0,
          "maxDaysBefore": 6,
          "chargePercent": 100,
          "label": "6 Tage und weniger vor Betreuungsbeginn",
          "display": {
            "landing": { "period": "6 Tage und weniger vor Betreuungsbeginn", "refund": "keine Rückerstattung" },
            "contract": { "period": "6 Tage und weniger vor Betreuungsbeginn:", "refund": "keine Rückerstattung" },
            "portal": { "period": "6 Tage und weniger vor Betreuungsbeginn:", "refund": "keine Rückerstattung" }
          }
        }
      ],
      "notes": []
    }
  ]
}
$$::jsonb,
  timezone('utc'::text, now());
