# Meister product translations — operations

Version **1.0.0**; WordPress ≥6.5, WooCommerce active, PHP ≥8.1. Uses the classic Woo product editor. The newer Woo block product editor is not integrated; use the classic editor or the bulk tools/CLI. This document describes repeatable operations; actual installation, live sample and deployment results are recorded separately in `PI-CONNECTION-AND-TRANSLATIONS-REPORT.md`.

## Contract and bounds

See [HASH-CONTRACT.md](HASH-CONTRACT.md). Same product IDs; only `meister_translations` meta changes. No name/description/slug/price/stock/attribute/variation setters. Supported locales `en`, `el`; version `1`; statuses `draft`, `published`. Other language and unrelated metadata are preserved. Unknown existing versions/malformed metadata stop writes rather than being replaced.

Canonical SHA256 is lower-case hex over UTF-8 bytes of **raw CRUD edit-context name + NUL + short_description + NUL + description**. No formatting/normalization. Authenticated Woo REST returns `meister_translation_source` and `meister_translations` as top-level, read-only fields for users with `manage_woocommerce`. Original display fields remain untouched. Standard Woo `meta_data` translation entries are stripped; generic Woo REST writes targeting that key or its existing metadata ID are refused. Storefront must use the explicit raw field to validate published translations and fail closed when absent. Shared cross-language fixture: `wordpress/fixtures/product-translations-canonical.json`.

- Export/import: explicit **1–50 unique parent product IDs**, never an unbounded catalog scan; variations rejected. Paginate ID lists outside the plugin deliberately.
- Job/request ≤2 MiB; titles (`name`) ≤1000 UTF-8 bytes; short/full descriptions ≤100000 UTF-8 bytes each (byte limits, not character counts, for both submitted source and translation). No NULs or invalid UTF-8 in submitted fields. Description HTML uses `wp_kses_post`; titles use `wp_strip_all_tags`. Rendering still needs the storefront sanitizer.
- Generate: **≤3 products**, ≤20000 JSON-encoded source bytes/product, ≤6000 output tokens/product, HTTP timeout 90s/product, response limit 2 MiB. Consider PHP/proxy request timeouts; one-product batches are safest. No cron/background enqueue/retry and no per-shopper generation.
- Dry-run is default and never calls the provider. Application, overwrite and publication require separate explicit flags. Generated results are **always drafts**, never overwrite an existing locale, and reruns skip existing translations without another provider call. Bulk import identical sanitized entries are no-ops.
- Every product ID/hash/capability/schema is preflighted before the first write. Generate apply first reserves **all requested product IDs** using atomic per-product `add_option` calls with `meister_translation_generate_lock_<ID>` option keys, before inspecting existing locales or making any provider call. Overlapping Generate requests fail closed before provider usage; reservations cover both locales and stay held through guarded import. Dry runs acquire no locks. Import/editor writes use the separate `meister_translation_lock_<ID>` namespace, recheck source/metadata before each save and verify persisted metadata by forced readback. Both paths release only their own acquired locks in `finally`, on success or error. Existing/manual translations and safe reruns remain protected; a manual save during generation is not overwritten. These locks coordinate this plugin, **not every third-party writer**. There is no cross-product transaction guarantee: DB errors or intervening edits can leave earlier products saved. Resolve conflicts then safely rerun.
- **Crash lock recovery:** a terminated PHP process can leave either `meister_translation_generate_lock_<ID>` or `meister_translation_lock_<ID>` options. Inspect the exact product/operation and verify no matching request or worker remains running before an authorized administrator removes that specific option. Do not infer safety from lock age alone (multi-product requests/custom providers can run longer), automatically expire locks, or bulk-delete matching keys. Deleting an active generation reservation can cause duplicate paid provider calls. A failed provider call may already have incurred charges; no automatic retry is attempted.

## Build and tests

From the repository root:

```sh
python3 tests/product-translations-php-run.py                         # local PHP
python3 tests/product-translations-php-run.py --ssh pi@100.101.255.74 # stdin only; no remote files or WP load
python3 tests/product-translations-php-package.test.py
python3 wordpress/build-zip.py
```

Artifact: `wordpress/dist/meister-product-translations-1.0.0.zip`. Deterministic sorted allowlisted files, fixed timestamps/permissions, stored ZIP without compression-library variation. Build twice and compare SHA256; packaging test does this. No credentials, tests, fixtures or exports enter the ZIP. Unit tests execute production classes but stub WordPress/Woo I/O, HTTP and sanitizers at their boundary. They do not replace a staging Woo integration/role/REST/browser smoke test. The parent agent owns real-product smoke checks and Greek review.

## Install / update — user or authorized administrator only

1. Confirm the actual site/database and take a current private database backup before touching it. Back up the existing plugin directory and affected products' current translation meta separately. Record exact backup paths in the connection/translations report. Keep all snapshots/exports outside the web root, mode 600, and never in Git.
2. Rebuild and check the ZIP hash; inspect its eight files. WordPress Admin → Plugins → Add New → Upload Plugin, select the ZIP and install, then activate **only on the correct Woo site**. The plugin directory is not writable by `pi`, and sudo requires the owner's password. Do not weaken permissions or place that password in commands/chat. An authorized administrator may instead install the ZIP with WP CLI under the appropriate filesystem identity:

   ```sh
   wp --path=/var/www/html plugin install /private/path/meister-product-translations-1.0.0.zip --activate
   ```

   For deliberate updates, back up the installed directory first and use the WP upload replace flow or authorized `plugin install ... --force`; verify version after replacement. No activation hook mutates product data. No rewrite flush needed.
3. Configure provider credentials **on the server**, only if future Generate is desired. Do not copy the laptop Hermes secret to the Pi without secure authorization/configuration. Supply `OPENAI_API_KEY` through the PHP runtime environment or a private `wp-config.php` constant. Never store it in this repository, plugin settings, product meta or browser. Optional non-secret constant:

   ```php
   define('MEISTER_TRANSLATION_MODEL', 'gpt-5-mini-2025-08-07');
   // OPENAI_API_KEY must come from your private secret configuration, not this example.
   ```

   Default OpenAI Responses API model is `gpt-5-mini-2025-08-07`, `reasoning.effort: low`, strict JSON schema, fixed HTTPS endpoint, TLS verified, no redirects, `store:false`. Override only with a model supporting these parameters. Official model pricing checked October 17, 2026: gpt-5-mini $0.25 input/$2 output per 1M tokens; parent's existing-account 3-product sample completed. Human Greek/spec review remains mandatory. `store:false` is not a promise of zero retention; review provider data policy. No paid enrollment or automatic retry. Higher-cost `gpt-5.4-mini` ($0.75/$4.50) is a configurable evaluation alternative.

   A different provider can be configured in **trusted server code**, with no key in the browser:

   ```php
   add_filter('meister_translation_provider', static function () {
       return static function (array $source, string $locale): array {
           // Call your configured server provider; fail by throwing.
           // Return name/short_description/description strings, not status/hash/IDs.
           return my_private_translation_provider($source, $locale);
       };
   });
   ```

4. Read a known product via authenticated Woo REST. Confirm raw source/hash against an export and that draft metadata is not shown to anonymous visitors. Test a **staging** fin, wetsuit and variable-parent product. Verify original product fields/variation options/prices/IDs and source hashes remain byte-for-byte unchanged after draft apply. Then review all terminology/materials/dimensions/HTML before explicit publishing. No production purchases.

## Editor and bounded bulk UI

Classic product editor → Product translations: English/Greek titles and short/full descriptions, per-language status and source-changed warning. Check **Save/review this language** to change that language; unchecked languages remain untouched. Saving original content and translations simultaneously intentionally fails the old hash: reopen and review first. Invalid/missing nonce or missing edit capabilities cannot mutate translation metadata. Published status also needs `publish_products`.

WooCommerce → Product translations: supply IDs and locale. Export is read-only. Copy the resulting job JSON privately, translate only `translation` fields, retain IDs/source/hash, and paste into Import JSON. First run with no checkboxes to inspect the dry-run; check Apply for draft persistence. Check Overwrite only to deliberately replace an existing language; check Publish only after review. Generate requires Apply plus Confirm provider usage/cost to make actual network calls. Outputs/errors are escaped; no credential input exists.

Job format (the hash below is a placeholder, not a runnable fixture):

```json
{
  "version": 1,
  "locale": "el",
  "products": [{
    "id": 123,
    "source_hash": "<64 lowercase hex characters from export>",
    "source": {"name": "original", "short_description": "", "description": ""},
    "translation": {"name": "μετάφραση", "short_description": "", "description": ""}
  }]
}
```

`source` is optional on import; when supplied it must hash correctly and contain all three fields (JSON key order irrelevant). `translation` needs at least one field; only the three text keys are allowed. Status/publication is controlled outside the job so an exported/foreign file cannot silently publish itself. Wrong IDs/hashes, duplicate IDs, unknown keys/locales/version and oversized input are rejected.

## WP CLI

Must select a real authorized user (`manage_woocommerce`, per-product `edit_post`; `publish_products` when publishing). Do not guess an admin ID. Use normal installed plugin or the temporary `--require` path below. Commands print JSON; keep shell redirections private (`umask 077`).

```sh
wp --path=/var/www/html --user=<authorized-user-id> meister-translations export --ids=123,456,789 --locale=el
wp --path=/var/www/html --user=<authorized-user-id> meister-translations import /private/path/job.json
wp --path=/var/www/html --user=<authorized-user-id> meister-translations import /private/path/job.json --apply
# Only after review, and only if deliberately replacing an existing draft:
wp --path=/var/www/html --user=<authorized-user-id> meister-translations import /private/path/job.json --apply --overwrite --publish
wp --path=/var/www/html --user=<authorized-user-id> meister-translations generate --ids=123 --locale=el
# Real provider call and draft write (cost confirmation):
wp --path=/var/www/html --user=<authorized-user-id> meister-translations generate --ids=123 --locale=el --apply --confirm-cost
```

To smoke-test staged code **without installation/activation**, prepend `--require=/private/staged/path/meister-product-translations/meister-product-translations.php` to the same command. WP CLI processes `--require` early, before WordPress defines `ABSPATH`; the bootstrap allows its real WP_CLI context and registers commands/hooks without using Woo until command execution. Alternatively use `wp ... eval-file /private/path/smoke.php`, with the script `require_once`-ing the staged bootstrap **after WP has loaded**. A pure dry-run is safe for product metadata; actual draft CRUD still writes the real database and requires the owner's explicit scope and verified backup. Do not copy a plugin into a writable directory inside the public web root for this workaround.

## REST tooling

POST `/wp-json/meister-translations/v1/export` with `{"ids":[123],"locale":"el"}`.
POST `/wp-json/meister-translations/v1/import` with `{"job":{...},"apply":false,"overwrite":false,"publish":false}`.
POST `/wp-json/meister-translations/v1/generate` with `{"ids":[123],"locale":"el","apply":false}`. Real generation needs **both** `apply:true` and `confirm_cost:true`.

Use WordPress application-password authentication over verified HTTPS or a logged-in privileged admin with a valid `X-WP-Nonce` for cookie authentication. WordPress core validates REST cookie nonces; missing nonce makes the request anonymous and permission checks fail. Do not assume Woo consumer-key authentication extends to this custom namespace; Woo GET product fields still use Woo auth. Do not place secrets in query strings. Respect the Pi's independent proxy gate. Boolean flags must be JSON booleans, not strings. Never expose these endpoints in the storefront browser.

## Rollback

Deactivate this plugin first; this retains all metadata. Restore the previous plugin directory for code rollback and reactivate only after compatibility checks. No uninstall data deletion exists. Drafts remain invisible in the accompanying storefront. To remove/revert selected translations, use a reviewed backup-driven script restoring **only the exact pre-change `meister_translations` meta for affected IDs** through Woo CRUD; preserve other current product data. Verify readback and storefront fallback. Avoid a full database restore on a trading store: it can erase orders/stock changes since backup. Full DB restore is last-resort maintenance with a current backup and owner's approval. No rollback was executed here.

## Official provider references

```text
https://developers.openai.com/api/docs/models/gpt-5-mini
https://developers.openai.com/api/docs/models/gpt-5.4-mini
https://developers.openai.com/api/reference/resources/responses/methods/create
https://developers.openai.com/api/docs/guides/structured-outputs
```
