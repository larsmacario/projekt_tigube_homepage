-- AGB / Betreuungsvertrag: Aktualisierung der Stornierungsbedingungen im CMS (Schlüssel 'agb')
UPDATE public.cms_content
SET data = jsonb_set(
  data,
  '{content}',
  to_jsonb(
    regexp_replace(
      coalesce(data->>'content', ''),
      '<h2>Stornierung</h2>[\s\S]*?(<h2>Datenschutz</h2>)',
      '<h2>Stornierung</h2>
<ul>
<li><strong>15 Tage und mehr vor Check-In:</strong> kostenlos</li>
<li><strong>14 - 7 Tage vor Check-In:</strong> 50% der Buchungssumme</li>
<li><strong>6 Tage und weniger vor Check-In:</strong> 100% der Buchungssumme</li>
</ul>
<p><strong>ACHTUNG - Für die Stornierung von Aufenthalten die in die gesetzlichen Schulferien des Landes BW fallen, gelten folgende Stornofristen:</strong></p>
<ul>
<li><strong>56 Tage und mehr vor Check-In:</strong> kostenlos</li>
<li><strong>55-21 Tage vor Check-In:</strong> 50% der Buchungssumme</li>
<li><strong>20 Tage und weniger vor Check-In:</strong> 100% der Buchungssumme</li>
</ul>
<p>Absagen werden jeweils bis 18 Uhr berücksichtigt – auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form über das Kundenportal bzw. per Mail erfolgen.</p>
<p>Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Tier später als zum vereinbarten Datum in Betreuung gebracht wird.</p>
\1'
    )
  )
)
WHERE key = 'agb'
  AND coalesce(data->>'content', '') LIKE '%<h2>Stornierung</h2>%';
