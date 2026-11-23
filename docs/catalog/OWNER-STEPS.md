# New catalog: owner checklist

What you do, in order. Your agent follows `docs/catalog/AGENT-INSTRUCTIONS.md`.

## A. Prepare (about 15 minutes)

1. **On the test server**, make sure WordPress is installed and you can log in to `/wp-admin`. Note:
   - the site URL (e.g. `https://test.example.com`);
   - the install path (e.g. `/var/www/html`);
   - your admin user ID (WP Admin → Users → hover your user; the URL shows `user_id=`).
2. **On the Pi**, create a read-only API key:
   - WP Admin → WooCommerce → Settings → Advanced → REST API → **Add key**.
   - Description `catalog export (read-only)`, User: your admin, Permissions: **Read**.
   - Copy the Consumer key and secret now. They are shown only once.
3. **On the test server**, store the credentials in a private file. Type them yourself, not through the agent's chat:

   ```bash
   mkdir -p ~/.config/meister && chmod 700 ~/.config/meister
   nano ~/.config/meister/pi-export.env
   ```

   Put these four lines in the file, with your real values:

   ```
   PI_WC_URL=https://wordrepss.kudu-ulmer.ts.net:8443
   PI_WC_KEY=ck_...
   PI_WC_SECRET=cs_...
   PI_PROXY_TOKEN=<the same value as WC_PROXY_TOKEN in Vercel>
   ```

   Then lock the file:

   ```bash
   chmod 600 ~/.config/meister/pi-export.env
   ```

4. **Give the agent this repository**, on the branch where these instructions live (or `main` once merged):

   ```bash
   git clone https://github.com/billh-ch/meister-storefront.git && cd meister-storefront && git checkout claude/gifted-hamilton-986hlw
   ```

## B. Start the agent (Phases 0–3)

Paste this to your agent, filling in the three values:

> Read `docs/catalog/AGENT-INSTRUCTIONS.md` in the meister-storefront repository and follow it exactly. TEST_SITE_URL is `<your test site URL>`, the WordPress path is `<path>`, and the admin user ID is `<id>`. Pi credentials are in `~/.config/meister/pi-export.env`. Run Phases 0, 1, 2 and 3, then stop and show me the proposal. Do not run Phase 4 until I approve.

## C. Review the proposal

Read `~/catalog-migration/proposal.md`. Decide every item marked "needs owner decision", in particular:

- unmapped categories;
- the attribute merges;
- products to exclude;
- broken variations.

You can paste the proposal to me (Claude in this repo) and I'll review it with you.

## D. Approve the import (Phases 4–6)

Tell the agent:

> Proposal approved with these decisions: <your decisions>. Run Phases 4, 5 and 6 and show me the report.

## E. Review and publish

In WP Admin → Products (all drafts):

1. Start with the 16 gear-finder products (custom field `meister_gear_finder`), then your best sellers.
2. Check the English text, prices, stock, images and variations. Open **Product translations** to check the Greek.
3. Publish products when they're right. Publish each Greek translation once it's reviewed (tick "Save/review this language", status Published).
4. Ask your accountant to confirm the VAT setup (currently a 24% placeholder).

## F. Connect the storefront to the test server (with Claude)

When enough products are published, tell me and we'll set this up together. It needs:

- a public HTTPS URL for the test server;
- a **Read/Write** API key for the storefront;
- the BOX NOW plugin with your BOX NOW credentials;
- the `WELCOME5` coupon;
- the product and order webhooks.

I'll point a Vercel **preview** at it, not production, and run test checkouts. Switching production comes later, together with the move to managed hosting.
