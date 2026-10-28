# Cloudflare storefront performance

The user explicitly delegated implementing catalog caching and image optimization without further check-ins, and asked whether this setup can support commercial selling. Work only on the isolated Cloudflare preview branch; production Vercel, DNS, WordPress configuration and billing stay unchanged. Payments remain off.

Use the supported vinext KV data adapter in a new classic free KV namespace for the existing explicit public fetch caches. Keep all private/customer/order/cart/shipping and fresh checkout lookups uncached. Preserve existing 30/60-second freshness and signed webhook invalidation; explain KV eventual consistency and free quota failures honestly. Avoid sharing personalized HTML.

Generate responsive WebP files ahead of time, served as Worker static assets. Use an allowlisted public media manifest derived only from published product photos. Unknown/new photos fall back to their original public URLs; include attachment modification dates so replaced media cannot silently retain stale generated images. Compress local homepage photos too. Preserve sizes, galleries, styling, Greek/English typography and full-size originals. No paid image transformation service.

Measure the same homepage and photo requests before/after; re-run real cart, price, country/shipping and payment-off checks. Commercial use of Cloudflare Free is distinct from launch readiness: free limits, backend uptime and end-to-end Stripe→WooCommerce order fulfillment remain launch conditions. Do not promise that the current preview can accept payments.
