# BOX NOW checkout

The headless checkout embeds BOX NOW's official Greek locker map only when
the destination is `GR` and WooCommerce offers the selected method type
`box_now_delivery`. Other delivery methods keep their existing flow and rates.

## Configuration

No BOX NOW API keys are needed to display the picker or verify a selection.
`BOX_NOW_PARTNER_ID` is an optional, public merchant identifier. Set it to the
ID supplied by BOX NOW when available; the widget works without it. The map
is restricted to Greece and uses English to match the storefront. It seeds
the search from the customer's postcode without automatically requesting GPS.

Shipping availability and prices still come from the existing WooCommerce
shipping zones. This feature neither enables a method that WooCommerce has
disabled nor overrides product/zone shipping restrictions.

## Payment and order handoff

The browser accepts locker messages only from the displayed iframe's window
and the exact `https://widget-v5.boxnow.gr` origin. Checkout posts only its
numeric locker ID. Before creating a Stripe session, the server resolves the
canonical name/address/postcode from the public Greek directory used by the
BOX NOW v5 widget:

`https://globallockersprod.z28.web.core.windows.net/PROD/greece/lockers/{id}.json`

The fixed host and Greece path prevent arbitrary URL requests and foreign
destinations. A failed lookup stops payment with a retryable customer message;
the customer can retry or choose another delivery method. This public source
is part of the widget implementation, rather than a versioned partner API,
so recheck it when BOX NOW changes its widget.

Canonical details travel in Stripe session metadata and are copied by the
verified paid webhook into WooCommerce's order-level metadata:

- `_boxnow_locker_id`
- `_boxnow_locker_name`
- `_boxnow_locker_address`
- `_boxnow_locker_postal_code`

These fields were checked against the official BOX NOW Delivery plugin 3.4.0
source. The order's shipping method remains `box_now_delivery`. Billing,
recipient phone/email and existing Stripe fulfillment/retry handling remain
unchanged. Existing paid sessions created before this feature, which have
no locker metadata, can still be fulfilled; new BOX NOW checkouts require a
verified locker before payment. Network/payment-preparation retries retain
the current locker selection; changing country or delivery method clears it.

## Shipment handling

Choosing a locker does not book a shipment or create a label. Configure your
merchant credentials and warehouse in the official WooCommerce plugin for
that separate operation. Do not put BOX NOW API secrets into public variables
or the iframe URL. When reviewing a test order, verify the locker shown in
WooCommerce and the destination used by the plugin's voucher action before
dispatching any parcel. No automatic BOX NOW booking is introduced here.

## Verification

`npm test` covers selection validation, canonical lookup, Stripe metadata and
the signed webhook's WooCommerce payload. `CHROMIUM_PATH=/usr/bin/chromium npm
run test:checkout-live` builds the real application against a local WooCommerce
fixture and tests selection, changing lockers, country/method changes,
missing-selection server rejection and payment retries at 320, 390 and 1440px.
The browser harness supplies an iframe fixture; it does not book shipments,
charge customers or create production orders.

Official references:

- <https://widget-v5.boxnow.gr/devs?countryCode=gr&language=gr>
- <https://boxnow.gr/en/diy/eshops/plugins/woocommerce>
- <https://wordpress.org/plugins/box-now-delivery/>
