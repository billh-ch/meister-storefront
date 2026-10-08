# Meister agent-readiness release

## Public resources

- `/` negotiates HTML versus Markdown using the Accept header. Both variants
  advertise `Vary: Accept`. Unsupported public paths and missing products retain
  HTTP 404 and return useful Markdown errors for Markdown clients.
- `/about`, `/contact`, `/privacy`, `/docs`, `/docs/agents`, `/docs/mcp`, `/docs/auth`
  provide server-rendered HTML and negotiated Markdown. All have substantial
  factual content and are listed in the sitemap. Contact details are explicitly
  pending; privacy is a technical summary, not an approved complete legal notice.
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
purpose. Phone, email, postal address and social profiles are omitted until
confirmed. The existing brand metadata remains descriptive; search ranking is
not guaranteed by schema, content changes or sitemap inclusion.

Live pre-change observation: 5,736 visible/text characters divided by 136,114
non-script HTML characters = 4.21%; raw HTML 219,787 bytes. The local regression
production-mode fixture after changes produced 6,767 text characters
and a 10.22% content ratio without scripts. These datasets differ; they are not a production before/after benchmark
or a new Ora score. The test verifies meaningful content, semantic headings and
an above 5% ratio for its representative fixture with JavaScript disabled.

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

1. Confirm whether dive-meister.com's business contact/address and legal privacy
   terms apply to this storefront. Publish approved details, then add real
   contactPoint and PostalAddress schema; do not fill them from guesses.
2. Replace the technical privacy summary with the approved complete notice,
   including controller identity, privacy contact, retention and rights process.
3. Choose the primary brand domain, verify it in Search Console, submit the
   sitemap and request indexing. Obtain relevant first-party/press links to that
   domain. Vercel hosting or a code change cannot guarantee a top-ten ranking.
4. Run Ora again after deployment. No readiness score increase is claimed before
   independent measurement. Actual backend/MCP delivery requires a functioning
   WooCommerce connection in the deployed environment.
5. Agent purchasing, OAuth, customer access and write tools require a separate
   product/security design; this release offers public catalog research only.

Protocol references inspected: https://llmstxt.org/, https://acceptmarkdown.com/,
https://modelcontextprotocol.io/specification/2025-11-25/basic/transports and the
installed official MCP SDK transport interfaces/examples.
