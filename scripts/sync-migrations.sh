#!/usr/bin/env bash
# Synchronisiert lokale Migrationen mit der Remote-Historie.
# Voraussetzung: Supabase CLI mit ausreichenden Account-Rechten (supabase login).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Migration Status ==="
npx supabase migration list

echo ""
echo "=== Repair: Lokale Migrationen als angewendet markieren ==="
LOCAL_VERSIONS=(
  "00000000000000"
  "20260624120000"
  "20260624130000"
  "20260624140000"
  "20260624150000"
  "20260703160000"
  "20260703170000"
  "20260703180000"
  "20260708074000"
  "20260708075500"
  "20260708080000"
  "20260714143000"
  "20260714170000"
)

for version in "${LOCAL_VERSIONS[@]}"; do
  echo "Repairing $version ..."
  npx supabase migration repair --status applied "$version" || true
done

echo ""
echo "=== Final Status ==="
npx supabase migration list
