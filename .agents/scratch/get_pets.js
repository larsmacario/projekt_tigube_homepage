const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = '/Users/larsmacario/Desktop/tigube/tierischgutbetreut/.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Fehler: Supabase-Konfiguration nicht gefunden.', { supabaseUrl, hasKey: !!supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPets() {
  console.log('Hole Spalten der Tabelle pets...');
  const { data, error } = await supabase.from('pets').select('*').limit(1);
  if (error) {
    console.error('Fehler beim Abrufen der Pets:', error);
  } else {
    console.log('Beispiel-Pet / Struktur:');
    console.log(JSON.stringify(data[0] || {}, null, 2));
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
      }
    });
    const schema = await response.json();
    const petsSchema = schema.definitions ? schema.definitions.pets : null;
    if (petsSchema) {
      console.log('Pets Schema Columns:', Object.keys(petsSchema.properties));
    } else {
      console.log('Pets Schema konnte nicht über Swagger/OpenAPI bezogen werden');
    }
  }
}

checkPets();
