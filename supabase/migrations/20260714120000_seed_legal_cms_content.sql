-- Seed legal CMS content from lib/cms/legal-defaults.ts

UPDATE cms_content
SET data = jsonb_set(data, '{content}', to_jsonb($impressum_html$<div class="space-y-8">
  <div class="rounded-lg border border-sage-200 bg-white shadow-lg">
    <div class="p-6 border-b border-sage-100">
      <h2 class="text-lg font-semibold text-sage-800">Unternehmensinformationen</h2>
    </div>
    <div class="p-6 space-y-4">
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Firmenname</h3>
        <p class="text-gray-700"><strong>tierisch gut betreut Gesellschaft mit beschränkter Haftung</strong></p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">vertretungsberechtigte Geschäftsführer</h3>
        <p class="text-gray-700">Tamara Pfaff &amp; Gabriel Haaga</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Anschrift</h3>
        <p class="text-gray-700">Iznangerstr. 32<br />78345 Moos</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Registereintrag</h3>
        <p class="text-gray-700">HRB 727466 / Amtsgericht Freiburg i. Br.</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">USt.-ID</h3>
        <p class="text-gray-700">DE355611953</p>
      </div>
    </div>
  </div>
  <div class="rounded-lg border border-sage-200 bg-white shadow-lg">
    <div class="p-6 border-b border-sage-100">
      <h2 class="text-lg font-semibold text-sage-800">Kontaktdaten</h2>
    </div>
    <div class="p-6 space-y-2">
      <p class="text-gray-700"><span class="font-medium">Festnetz:</span> <a href="tel:+4977329885091" class="text-sage-600 hover:text-sage-700">07732-988 50 91</a></p>
      <p class="text-gray-700"><span class="font-medium">Mobil (T. Pfaff):</span> <a href="tel:+4917672404561" class="text-sage-600 hover:text-sage-700">0176-724 045 61</a></p>
      <p class="text-gray-700"><span class="font-medium">Mobil (G. Haaga):</span> <a href="tel:+4917546859977" class="text-sage-600 hover:text-sage-700">0175-468 59 77</a></p>
      <p class="text-gray-700"><span class="font-medium">E-Mail:</span> <a href="mailto:info@tierischgutbetreut.de" class="text-sage-600 hover:text-sage-700">info@tierischgutbetreut.de</a></p>
    </div>
  </div>
  <div class="rounded-lg border border-sage-200 bg-white shadow-lg">
    <div class="p-6 border-b border-sage-100">
      <h2 class="text-lg font-semibold text-sage-800">Rechtliche Hinweise</h2>
    </div>
    <div class="p-6 space-y-4">
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Aufsichtsbehörden</h3>
        <div class="text-gray-700 text-sm space-y-2">
          <p><strong>Veterinäramt Konstanz:</strong><br />Otto-Blesch-Str. 51, 78315 Radolfzell am Bodensee</p>
          <p><strong>Städtisches Finanzamt:</strong><br />Alpenstraße 9, 78224 Singen a.Htwl.</p>
        </div>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Bildquellen</h3>
        <div class="text-gray-700 text-sm space-y-1">
          <p>Bildquelle Pixabay: StockSnap, PicsbyFran, pikabum</p>
          <p>Foto von Helena Lopes: <a href="https://www.pexels.com/de-de/foto/kurzbeschichteter-tan-dog-2253275/" class="text-sage-600 hover:text-sage-700 underline" target="_blank" rel="noopener noreferrer">https://www.pexels.com/de-de/foto/kurzbeschichteter-tan-dog-2253275/</a></p>
        </div>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Copyright</h3>
        <p class="text-gray-700 text-sm">© tierisch gut betreut 2025</p>
      </div>
    </div>
  </div>
</div>$impressum_html$::text)),
    updated_at = NOW()
WHERE key = 'impressum';

UPDATE cms_content
SET data = jsonb_set(data, '{content}', to_jsonb($datenschutz_html$<div class="space-y-8">
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">1. Datenschutz auf einen Blick</h2>
    <div class="space-y-4 text-gray-700">
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Allgemeine Hinweise</h3>
        <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Datenerfassung auf dieser Website</h3>
        <p class="mb-2"><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
        <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Wie erfassen wir Ihre Daten?</h3>
        <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Wofür nutzen wir Ihre Daten?</h3>
        <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.</p>
      </div>
      <div>
        <h3 class="font-semibold text-sage-800 mb-2">Welche Rechte haben Sie bezüglich Ihrer Daten?</h3>
        <p>Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.</p>
      </div>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">2. Verantwortliche Stelle</h2>
    <div class="space-y-3 text-gray-700">
      <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
      <div class="bg-sage-50 p-4 rounded-lg space-y-2">
        <p class="font-semibold text-sage-900">tierisch gut betreut Gesellschaft mit beschränkter Haftung</p>
        <p>Iznangerstr. 32, 78345 Moos</p>
        <p>07732-988 50 91</p>
        <p>info@tierischgutbetreut.de</p>
      </div>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">3. Speicherdauer</h2>
    <p class="text-gray-700">Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach Fortfall dieser Gründe.</p>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">4. Allgemeine Hinweise zu Pflichtangaben</h2>
    <p class="text-gray-700">Die Bereitstellung Ihrer personenbezogenen Daten erfolgt teilweise freiwillig, teilweise zur Erfüllung eines Vertrags oder zur Durchführung vorvertraglicher Maßnahmen. Welche Daten erforderlich sind, erkennen Sie daran, dass die Eingabefelder als Pflichtfelder markiert sind. Ohne die Bereitstellung der erforderlichen Daten können wir unsere Leistungen nicht erbringen.</p>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">5. Kontaktformular</h2>
    <div class="space-y-4 text-gray-700">
      <p>Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.</p>
      <p>Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), sofern diese abgefragt wurde.</p>
      <p>Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach abgeschlossener Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen – insbesondere Aufbewahrungsfristen – bleiben unberührt.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">6. Hosting</h2>
    <div class="space-y-4 text-gray-700">
      <p>Diese Website wird bei Vercel Inc. gehostet. Anbieter ist Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA (nachfolgend „Vercel").</p>
      <p>Wenn Sie diese Website besuchen, erfasst Vercel Logfiles inklusive Ihrer IP-Adressen. Details entnehmen Sie der Datenschutzerklärung von Vercel: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" class="text-sage-600 hover:text-sage-700 underline">https://vercel.com/legal/privacy-policy</a></p>
      <p>Die Verwendung von Vercel erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG, soweit die Einwilligung die Speicherung von Cookies oder den Zugriff auf Informationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des TTDSG umfasst. Die Einwilligung is jederzeit widerrufbar.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">7. Ihre Rechte</h2>
    <div class="space-y-4 text-gray-700">
      <p>Sie haben folgende Rechte:</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li><strong>Recht auf Auskunft</strong> gemäß Art. 15 DSGVO über Ihre von uns verarbeiteten personenbezogenen Daten</li>
        <li><strong>Recht auf Berichtigung</strong> gemäß Art. 16 DSGVO unrichtiger oder unvollständiger Daten</li>
        <li><strong>Recht auf Löschung</strong> gemäß Art. 17 DSGVO Ihrer bei uns gespeicherten Daten</li>
        <li><strong>Recht auf Einschränkung der Verarbeitung</strong> gemäß Art. 18 DSGVO</li>
        <li><strong>Recht auf Datenübertragbarkeit</strong> gemäß Art. 20 DSGVO</li>
        <li><strong>Widerspruchsrecht</strong> gemäß Art. 21 DSGVO</li>
        <li><strong>Widerrufsrecht</strong> einer einmal erteilten Einwilligung gemäß Art. 7 Abs. 3 DSGVO</li>
        <li><strong>Beschwerderecht</strong> bei einer Aufsichtsbehörde gemäß Art. 77 DSGVO</li>
      </ul>
      <p>Bei Fragen zum Datenschutz können Sie sich jederzeit an uns wenden.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">8. Änderungen dieser Datenschutzerklärung</h2>
    <p class="text-gray-700">Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.</p>
  </div>
</div>$datenschutz_html$::text)),
    updated_at = NOW()
WHERE key = 'datenschutz';

UPDATE cms_content
SET data = jsonb_set(data, '{content}', to_jsonb($agb_html$<div class="space-y-8">
  <div class="border-b border-sage-200 pb-6">
    <div class="space-y-2 text-gray-700">
      <p class="font-semibold text-sage-900">tierisch gut betreut Gesellschaft mit beschränkter Haftung</p>
      <p>Geschäftsführer: Tamara Pfaff &amp; Gabriel Haaga</p>
      <p>Iznangerstr. 32 | 78345 Moos</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Zusicherungen und Pflichten beider Parteien</h2>
    <div class="space-y-4 text-gray-700">
      <div>
        <p class="font-semibold text-sage-800 mb-2">(1) Der Tierbesitzer sichert zu, dass</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>der Hund sein Eigentum ist und über diesen frei verfügen kann</li>
          <li>der Hund stubenrein ist, nicht inkontinent ist oder in geschlossenen Räumen markiert</li>
          <li>das Tier über eine gültige Impfung gegen Hepatitis, Parvovirose, Leptospirose, Staupe und Zwingerhusten hat. Der Impfpass wird vor jedem Aufenthalt zur Durchsicht an tierisch gut betreut Gesellschaft mit beschränkter Haftung per Mail zugesandt</li>
          <li>der Hund Wurm frei (Entwurmung oder negativer Kot-Test) und frei von ansteckenden Krankheiten und Ungeziefer ist, wobei die letzte Entwurmung/Kotuntersuchung nicht länger als drei Monate zurückliegt. Die jeweiligen Nachweise werden vor jedem Aufenthalt per Mail an tierisch gut betreut Gesellschaft mit beschränkter Haftung geschickt</li>
          <li>Mittel zur Floh- und Zeckenprophylaxe vorher verabreicht wurden und noch Schutz besteht</li>
          <li>der Hund gesund ist. Falls Krankheiten/Gebrechen bekannt sind, sind diese anzugeben</li>
          <li>eine ordentliche Tierhalter-Haftpflichtversicherung besteht und die Folgeprämien bezahlt sind, sodass ein aktueller Versicherungsschutz besteht (Versicherungsnachweis ist der Betreuungsperson auf Wunsch vorzulegen)</li>
          <li>der Hund steuerlich gemeldet ist</li>
          <li>alle Angaben vollständig und wahrheitsgetreu gemacht zu haben. Der Tierhalter verpflichtet sich, etwaige nach Vertragsabschluss eintretende seine Person oder den Hund betreffende Änderungen unverzüglich mitzuteilen</li>
        </ul>
      </div>
      <p class="font-semibold text-sage-800 mb-2">(2) Je nach Schwere der Erkrankung des Hundes ist tierisch gut betreut Gesellschaft mit beschränkter Haftung berechtigt, sowohl am Abgabetag als auch bei nachträglicher Feststellung sofort vom Vertrag zurück zu treten bzw. das Tier in tierärztlicher Betreuung zu geben. Hier ist auf das Wohl des Tieres von beiden Vertragsparteien zu achten. Eventuell anfallende Mehrkosten sind vom Tierbesitzer zu tragen.</p>
      <p class="font-semibold text-sage-800 mb-2">(3) Der Tierbesitzer haftet für anfallende Kosten, falls durch eine polizeiliche Kontrolle der Hund nicht oder unzureichend gekennzeichnet ist.</p>
      <p class="font-semibold text-sage-800 mb-2">(4) tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, das Tier art- und verhaltensgerecht laut Tierschutzgesetz, sowie dessen Nebenbestimmungen zu betreuen.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Vertraulichkeit und Sorgfalt beider Parteien</h2>
    <div class="space-y-4 text-gray-700">
      <p><strong>(1)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, über alle ihr im Rahmen ihrer Tätigkeit für den Tierbesitzer auf Grundlage dieses Vertrages bekannt gewordenen Informationen auch nach Ablauf der Vertragsdauer Stillschweigen zu bewahren. Gleiches gilt umgekehrt.</p>
      <p><strong>(2)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich auch, die anvertrauten Tiere nur mit größter Sorgfalt zu behandeln.</p>
      <p><strong>(3)</strong> Der Tierbesitzer erklärt sich mit der Aufnahme und (elektronischen) Speicherung der in diesem Vertrag und ggf. in der Zusatzvereinbarung erhobenen Daten einverstanden. Die Daten dürfen im Rahmen der Vertragsabwicklung bspw. im Krankheitsfall an den Tierarzt weitergegeben werden.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Haftung beider Parteien</h2>
    <div class="space-y-4 text-gray-700">
      <p><strong>(1)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung bestätigt, dass eine Betriebshaftpflichtversicherung besteht.</p>
      <p><strong>(2)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet für Sachschäden und Schäden an den in Obhut gegebenen Hunden nur soweit, als diese Schäden auf Vorsatz oder grob fahrlässiges Handeln der Betreuungsperson oder deren Erfüllungsgehilfen zurückzuführen sind.</p>
      <p><strong>(3)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet nicht für durch die Tiere verursachte Schäden oder Kosten. Sie ist von sämtlichen mit dem Betreuungstier in Verbindung stehenden Ansprüchen Dritter seitens des Tierbesitzers freizustellen. Trotz größter Sorgfalt kann das Risiko eines Entlaufens oder Erkrankung nicht gänzlich ausgeschlossen werden. Eine Haftung seitens tierisch gut betreut Gesellschaft mit beschränkter Haftung besteht jedoch nicht.</p>
      <p><strong>(4)</strong> Für Schäden, welche ein Hund verursacht, die nicht oder nicht ausreichend durch die Hundehaftpflichtversicherung oder private Haftpflichtversicherung abgedeckt sind, haftet allein der Tierbesitzer.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Information</h2>
    <div class="space-y-4 text-gray-700">
      <p><strong>(1)</strong> tierisch gut betreut verpflichtet sich, bei Auftreten von schwerwiegenden Problemen (plötzliche Krankheit des Tieres, auffällige Verhaltensänderung, etc.) den Tierbesitzer oder dessen Kontaktperson umgehend zu benachrichtigen.</p>
      <p><strong>(2)</strong> Der Tierbesitzer hat das Recht, sich während der Betreuungszeit bei der Betreuungsperson nach dem Wohl des Tieres zu erkundigen. tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich wahrheitsgemäße Aussagen hierüber zu machen.</p>
      <p><strong>(3)</strong> Der Tierbesitzer hat eine Vertrauensperson zu benennen, welche tierisch gut betreut Gesellschaft mit beschränkter Haftung kontaktieren kann falls eine Situation eintritt, welche schnelles Handeln erfordert und der Tierbesitzer nicht erreichbar ist.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Notfall</h2>
    <div class="space-y-4 text-gray-700">
      <p><strong>(1)</strong> Der Tierhalter erklärt sich damit einverstanden, dass in Notfällen und bei akuten Erkrankungen oder Verletzungen die erforderliche Behandlung bei einem Tierarzt erfolgt, der von tierisch gut betreut Gesellschaft mit beschränkter Haftung bestimmt wird. Für diesen Fall ist tierisch gut betreut Gesellschaft mit beschränkter Haftung ausdrücklich ermächtigt, im Namen und auf Rechnung des Kunden eine Tierarztpraxis/-klinik mit der tierärztlichen Versorgung und Behandlung des Tieres zu beauftragen. Die Kosten übernimmt der Tierhalter.</p>
      <p><strong>(2)</strong> Die Kostenübernahme seitens des Halters gilt auch für einen nötigen Transport mit der Tierrettung Südbaden e.V..</p>
      <p><strong>(3)</strong> Im Falle einer tierärztlichen Behandlung übernimmt die entscheidungsermächtigte Person die Bezahlung der Tierarztkosten, sollte dieser nicht auf Rechnung arbeiten.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Stornierung</h2>
    <div class="space-y-4 text-gray-700">
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li><strong>15 Tage und mehr vor Check-In:</strong> 100% Rückerstattung</li>
        <li><strong>14 - 7 Tage vor Check-In:</strong> 50% Rückerstattung</li>
        <li><strong>6 Tage und weniger vor Check-In:</strong> keine Rückerstattung</li>
      </ul>
      <p>Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp erfolgen.</p>
      <p>Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund später als zum vereinbarten Datum in Betreuung gebracht wird.</p>
    </div>
  </div>
  <div>
    <h2 class="text-2xl font-bold text-sage-900 mb-4">Datenschutz</h2>
    <div class="space-y-4 text-gray-700">
      <p class="font-semibold text-sage-800 mb-2">Nutzung personenbezogener Daten, Fotos und Videos</p>
      <p>Der Tierbesitzer ist damit einverstanden,</p>
      <p><strong>(1)</strong> dass tierisch gut betreut Gesellschaft mit beschränkter Haftung personenbezogene Daten speichern und verarbeiten darf. Die Daten dürfen nicht an dritte Personen weitergegeben werden, und sind auf Aufforderung unverzüglich zu löschen.</p>
      <p><strong>(2)</strong> dass Fotos und Videos von dem betreuten Tier/den betreuten Tieren in die Homepage, etc. von tierisch gut betreut Gesellschaft mit beschränkter Haftung eingestellt werden dürfen. Der Tierbesitzer bleibt hierbei anonym und es wird ausschließlich der Name des Tieres, Tierart, Rasse sowie Datum/Zeitraum veröffentlicht.</p>
      <p class="text-sm text-gray-600 mt-4">Nähere Informationen finden Sie in unserer <a href="/datenschutz" class="text-sage-600 hover:text-sage-700 underline">Datenschutzerklärung</a>.</p>
    </div>
  </div>
  <div class="bg-sage-50 p-6 rounded-lg border-l-4 border-sage-600">
    <p class="text-gray-700"><strong>Wichtiger Hinweis:</strong> Der Hundehalter verpflichtet sich dazu, uns darüber zu informieren, wenn sich zwischen 2 Betreuungen etwas an den o.g. Angaben ändert. Die Änderung greift ab der darauffolgenden Betreuung.</p>
  </div>
  <div class="pt-4 border-t text-center text-sm text-gray-500">
    <p>© tierisch gut betreut Gesellschaft mit beschränkter Haftung 2022</p>
  </div>
</div>$agb_html$::text)),
    updated_at = NOW()
WHERE key = 'agb';

