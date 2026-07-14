# Supabase Migrationen

## Status

Die **Remote-Produktions-DB** hat 41 angewendete Migrationen. Die lokalen Dateien in `migrations/` sind **Inkrement-Migrationen** für Schema-Erweiterungen und Seeds – nicht 1:1 identisch mit der Remote-Versionshistorie.

`00000000000000_baseline.sql` markiert den dokumentierten Ausgangspunkt. Ein vollständiger Schema-Dump erfordert CLI-Zugriff:

```bash
npx supabase db dump --linked -f supabase/migrations/00000000000000_baseline.sql
npx supabase migration list
```

## Remote-Migrationen (angewendet)

| Version | Name |
|---------|------|
| 20251222061954 | create_contact_requests_table |
| 20251222062011 | enable_rls_and_policies_contact_requests |
| 20251222064238 | create_users_table |
| 20251222064241 | create_customers_table |
| 20251222064243 | create_pets_table |
| 20251222064245 | create_documents_table |
| 20251222064247 | create_onboarding_tokens_table |
| 20251222064248 | create_lead_notes_table |
| 20251222064249 | extend_contact_requests_table |
| 20251222071207 | update_foreign_keys_cascade |
| 20251222071309 | create_auth_user_trigger |
| 20251222071318 | create_auth_user_update_trigger |
| 20251222071645 | add_users_insert_policy |
| 20251222072033 | fix_users_rls_recursion |
| 20251222073152 | create_testimonials_table |
| 20251222073836 | create_newsbar_settings_table |
| 20251222081437 | create_property_system_tables |
| 20251222090957 | add_public_onboarding_token_policy |
| 20251222091613 | add_customer_status_field |
| 20251222091622 | restrict_lead_status_to_new_contacted_v2 |
| 20251222091636 | change_onboarding_token_to_customer_id |
| 20251222092358 | create_customer_notes_table |
| 20251222092643 | make_customer_user_id_nullable |
| 20251222093120 | make_onboarding_token_contact_request_id_nullable |
| 20260105071818 | fix_rls_policies_for_pending_customers |
| 20260105072258 | make_onboarding_token_expires_at_nullable |
| 20260105073443 | add_onboarding_customer_read_policy |
| 20260105080534 | add_pet_info_fields |
| 20260105083650 | create_prices_table |
| 20260105085639 | create_bookings_and_capacity_tables |
| 20260428061527 | consolidate_contacts_and_notes_fix |
| 20260428061539 | drop_onboarding_contact_request_id |
| 20260428061552 | consolidate_contacts_and_notes_v2 |
| 20260428061609 | fix_orphan_property_values |
| 20260428061622 | contacts_rename_columns_to_match_app |
| 20260624044842 | newsletter_system |
| 20260624050234 | contact_emails |
| 20260714161533 | seed_legal_cms_content |
| 20260714161603 | seed_legal_cms_content_datenschutz |
| 20260714161616 | seed_legal_cms_content_agb |
| 20260714163237 | normalize_legal_cms_content_datenschutz |
| 20260714163250 | normalize_legal_cms_content_agb |

## Lokale Inkrement-Migrationen

| Datei | Zweck |
|-------|-------|
| `20260624120000_add_lead_email_delivery_status.sql` | E-Mail-Versandstatus auf contacts |
| `20260624130000_secure_onboarding_tokens.sql` | 7-Tage-Ablauf für Onboarding-Tokens |
| `20260624140000_newsletter_system.sql` | Newsletter-Tabellen (idempotent) |
| `20260624150000_contact_emails.sql` | E-Mail-Verlauf-Tabelle |
| `20260703160000_create_cms_content.sql` | CMS-Tabelle + Storage + Seeds |
| `20260703170000_customer_groups_and_prices.sql` | Kundengruppen + Preise |
| `20260703180000_price_categories.sql` | Preiskategorien |
| `20260708074000_add_letzte_stuhlprobe_to_pets.sql` | Stuhlproben-Datum auf pets |
| `20260708075500_add_signature_and_contract_to_db.sql` | Vertragsunterschrift |
| `20260708080000_create_admin_invitations.sql` | Admin-Einladungen |
| `20260714143000_normalize_legal_cms_content.sql` | Rechtsseiten-CMS (kanonische Version) |
| `20260714170000_enable_rls_newsletter_and_contact_emails.sql` | RLS für Newsletter + contact_emails |

## Migration Repair (wenn CLI-Zugriff verfügbar)

Wenn `supabase migration list` lokale Dateien als „nicht angewendet“ zeigt, obwohl das Schema remote existiert:

```bash
npx supabase migration repair --status applied 20260624120000
npx supabase migration repair --status applied 20260624130000
# … für jede lokale Datei, deren SQL bereits remote ausgeführt wurde
```

## Entfernt bei Aufräumung

- `testimonials_rows.sql` – nicht versioniert, 0 Zeilen in Prod; Pflege über `/admin/testimonials`
- `20260428120000_consolidate_contacts_and_notes.sql` – No-Op-Platzhalter, ersetzt durch `00000000000000_baseline.sql`
- `20260714120000_seed_legal_cms_content.sql` – von normalize-Version überschrieben
