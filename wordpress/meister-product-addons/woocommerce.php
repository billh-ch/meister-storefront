<?php
/** WooCommerce integration: REST product marker and write guard, order pricing, duplication. */
final class MPA_WooCommerce {
    /** Tells the storefront the pricing side of the contract is active. Without it the storefront offers no add-ons. */
    public static function rest_product($response, $product, $request) {
        if (is_object($response) && isset($response->data) && is_array($response->data)) $response->data['meister_addons_pricing'] = MPA_Core::VERSION;
        return $response;
    }

    /** A generic REST write of meister_addons must satisfy the contract too. */
    public static function rest_product_write($product, $request, $creating = false) {
        $meta = is_object($request) || is_array($request) ? ($request['meta_data'] ?? null) : null;
        if (!is_array($meta)) return $product;
        foreach ($meta as $entry) {
            if (!is_array($entry) || ($entry['key'] ?? null) !== MPA_Core::META_KEY) continue;
            $value = $entry['value'] ?? null;
            if ($value === '' || $value === null) continue; // deleting add-ons is allowed
            try { MPA_Core::validate($value); }
            catch (InvalidArgumentException $e) {
                return new WP_Error('meister_addons_invalid', 'meister_addons: ' . $e->getMessage(), ['status' => 400]);
            }
            if (is_object($product) && method_exists($product, 'get_parent_id') && $product->get_parent_id()) {
                return new WP_Error('meister_addons_invalid', 'meister_addons belongs on the parent product, not a variation.', ['status' => 400]);
            }
        }
        return $product;
    }

    /**
     * Runs on a new REST order after its line items exist and before
     * WooCommerce calculates taxes, totals and coupons. A line carrying the
     * hidden `_meister_addons` meta (ids only, from the storefront's verified
     * Stripe webhook) is re-priced from this product's own add-ons:
     * the VAT-inclusive unit price is the product's current price plus the
     * chosen add-ons, and WooCommerce's own wc_get_price_excluding_tax turns it
     * into the line's net subtotal/total, exactly as it does for the product
     * price alone. WooCommerce then adds VAT itself.
     *
     * Never blocks an order (the customer has already paid): a line that
     * cannot be priced keeps WooCommerce's product price and gets an error
     * meta, and the storefront's total check flags the difference.
     */
    public static function price_rest_order($order, $request = null, $creating = false) {
        if (!$creating || !is_object($order) || !method_exists($order, 'get_items')) return $order;
        foreach ($order->get_items('line_item') as $item) {
            $refs = $item->get_meta(MPA_Core::LINE_META_KEY, true);
            if (!is_string($refs) || $refs === '') continue;
            try {
                self::price_item($item, $refs);
            } catch (Throwable $e) {
                // Hidden on the line; the storefront's total check adds the visible order note.
                $item->update_meta_data(MPA_Core::LINE_ERROR_META_KEY, substr($e->getMessage(), 0, 200));
            }
        }
        return $order;
    }

    public static function price_item($item, string $refs): void {
        $product = $item->get_product();
        if (!$product) throw new RuntimeException('Product not found for add-ons.');
        $config = MPA_Core::parse(get_post_meta((int)$item->get_product_id(), MPA_Core::META_KEY, true));
        if ($config === null) throw new RuntimeException('This product has no valid add-ons.');
        $chosen = MPA_Core::resolve($config, explode(',', $refs));
        $addonCents = array_sum(array_column($chosen, 'cents'));
        $unit = MPA_Core::euros(MPA_Core::cents(wc_format_decimal($product->get_price())) + $addonCents);
        $net = wc_get_price_excluding_tax($product, ['qty' => $item->get_quantity(), 'price' => $unit]);
        $item->set_subtotal($net);
        $item->set_total($net);
        foreach ($chosen as $addon) {
            // Visible on the order, the packing view and every order email:
            // "Camo pattern: Full camo pattern (+€40.00)".
            $item->add_meta_data($addon['group']['en'], $addon['option']['en'] . ' (+€' . MPA_Core::euros($addon['cents']) . ')', false);
        }
        $item->update_meta_data(MPA_Core::LINE_TOTAL_META_KEY, MPA_Core::euros($addonCents));
    }

    /** WooCommerce already clones meta on duplicate; this keeps the field even if that changes, and drops an invalid one. */
    public static function duplicate($duplicate, $product): void {
        if (!is_object($duplicate) || !is_object($product)) return;
        $raw = $product->get_meta(MPA_Core::META_KEY, true);
        if (MPA_Core::parse($raw) === null) { $duplicate->delete_meta_data(MPA_Core::META_KEY); }
        else { $duplicate->update_meta_data(MPA_Core::META_KEY, $raw); }
        $duplicate->save();
    }
}
