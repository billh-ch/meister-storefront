# Meister agent-readiness release

## Public resources

- `/` negotiates HTML versus Markdown using the Accept header. Markdown
  advertises `Vary: Accept`. Unsupported public paths and missing products retain
  HTTP 404 and return useful Markdown errors for Markdown clients.
  HTML has Vary rules in both the proxy and deployment routing manifest, keeping
  Next.js's RSC/router cache variations alongside Accept locally. Live Vercel
  still replaces HTML Vary with framework tokens, omitting Accept; adding the
  deployment rules did not fix that platform behavior. Dynamic product HTML
  shows the same omission. Treat this as an unresolved HTML cache-header warning,
  even though direct HTML/Markdown requests return the correct representations.
- `/about`, `/contact`, `/privacy`, `/docs`, `/docs/agents`, `/docs/mcp`, `/docs/auth`
  provide server-rendered HTML and negotiated Markdown. All have substantial
  factual content and are listed in the sitemap. Contact details come from
  dive-meister.com, whose published footer and privacy text identify dive-meister.gr.
  Privacy combines that source with current storefront behavior.
- `/llms.txt` follows the current llms.txt Markdown structure: one H1, a short
  blockquote, introductory guidance, then H2 linked lists. When-to-use guidance
  describes catalog research, comparison, variation review and product citations.
- `/.well-known/mcp` is the live first-party MCP Streamable HTTP endpoint, not an
  invented discovery-manifest format. The official MCP SDK 1.32.1 handles JSON-RPC
  initialization, notifications, tools/list and tools/call. POST accepts JSON
  with `Accept: application/json, text/event-stream`. This stateless deployment
  returns JSON, has no session IDs and answers GET/DELETE 405. Invalid Origins
  return 403 and bodies above 64 KiB return 413. Only anonymous public catalog reads
  are available: `search_products` and `get_product`.

Public agents never receive demo/outage fallback products, customer records,
orders, account sessions, shipping addresses or payment tools. Customer routes,
API routes and Server Action POST requests retain their existing behavior.
Product descriptions are untrusted source material, not agent instructions.
No WooCommerce or Stripe credentials belong in agent requests.

## Homepage and identity

Added meaningful server-rendered equipment guidance without changing card/gallery
fitting, fonts or commerce controls. The category carousel receives only products
it already displays, reducing unnecessary serialized client data. Organization
and WebSite JSON-LD describe the verified storefront name, URL and equipment
purpose. Published customer-service email, phone and PostalAddress are included.
Social profiles are omitted. The existing brand metadata remains descriptive; search ranking is
not guaranteed by schema, content changes or sitemap inclusion.

Live pre-change observation: 5,736 visible/text characters divided by 136,114
non-script HTML characters = 4.21%; raw HTML 219,787 bytes. The local regression
production-mode fixture after changes produced 6,794 text characters
and a 10.24% content ratio without scripts. These datasets differ; they are not a production before/after benchmark
or a new Ora score. The test verifies meaningful content, semantic headings and
an above 5% ratio for its representative fixture with JavaScript disabled.

Live verification after publication on 8 October 2026 measured 7,519 text
characters and a 5.42% content ratio excluding scripts/styles. The sitemap had
104 URLs including 90 products. Official MCP initialization/search/product calls
and all new documentation resources worked against production. HTML Vary
warnings are separate from the passing Markdown requirements; no new Ora score
or brand ranking is claimed.

## Verification

Stop other Next servers in the checkout:

```sh
npm test
AGENTS_PRODUCTION=true CHROMIUM_PATH=/usr/bin/chromium npm run test:agents
CHROMIUM_PATH=/usr/bin/chromium npm run test:seo
```

`test:agents` runs its own app on port 3004 and a local WooCommerce fixture, verifies
all new endpoints and llms links, negotiates both homepage representations,
checks Markdown/HTML 404s, no-JS content, headings, identity schema, canonical Greek
product links, private route boundaries, and uses the official MCP client to
initialize, list tools and call both catalog tools. It creates no real orders.

After an owner-authorized deployment, repeat with the production domain:

```sh
curl -sS -L -i -H 'Accept: text/markdown' https://meister-storefront.vercel.app/
curl -sS -L -i -H 'Accept: text/html' https://meister-storefront.vercel.app/
curl -sS -L -i -H 'Accept: text/markdown' https://meister-storefront.vercel.app/__ora-agent-404-check
curl -sS -i https://meister-storefront.vercel.app/llms.txt
curl -sS -i -X POST -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"readiness-check","version":"1.0.0"}}}' https://meister-storefront.vercel.app/.well-known/mcp
```

Check bodies as well as final statuses, Content-Type and Vary. A valid MCP
initialization returns negotiated protocol version, server identity and tools
capability. A plain GET is not an MCP initialization handshake.

## Owner decisions and follow-up

1. Business details currently use info@dive-meister.com, +30 210 5317549 and
   Leoforos Athinon 387, Aigaleo 12243, Greece. The owner authorized sourcing
   dive-meister.gr; that domain returned 403. The accessible dive-meister.com
   explicitly identifies dive-meister.gr in its footer and policies, supplying
   the corroborating first-party source. Keep these details current in
   BUSINESS_CONTACT in lib/agents/content.ts.
2. Review the full privacy notice. The source at
   https://dive-meister.com/23876-2/ uses older legal references and describes a
   cookie popup absent from this app. This release links that source and adapts
   its business data-use information, adding accurate cart/account/Stripe/MCP
   details rather than copying unsupported implementation claims. Controller
   legal identity, legal bases, provider retention and current rights procedures
   still merit an updated owner-approved notice.
3. Choose the primary brand domain, verify it in Search Console, submit the
   sitemap and request indexing. Obtain relevant first-party/press links to that
   domain. Vercel hosting or a code change cannot guarantee a top-ten ranking.
4. Run Ora again after deployment. No readiness score increase is claimed before
   independent measurement. Actual backend/MCP delivery requires a functioning
   WooCommerce connection in the deployed environment.
5. Agent purchasing, OAuth, customer access and write tools require a separate
   product/security design; this release offers public catalog research only.
6. Prioritize a separate framework/dependency security update. The production
   dependency scan reported 24 version advisories (3 critical, 12 high,
   7 moderate, 2 low), including existing Next.js 16.2.12 and transitive packages.
   The highest patched Next.js minimum in that scan was 16.3.8. These are scanner
   matches rather than proof of exploitation; assess applicability and verify
   commerce/images/caching/agent behavior before deploying dependency changes.

Protocol references inspected: https://llmstxt.org/, https://acceptmarkdown.com/,
https://modelcontextprotocol.io/specification/2025-11-25/basic/transports and the
installed official MCP SDK transport interfaces/examples.
