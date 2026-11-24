<?php
/** wp meister-addons get <product-id> | wp meister-addons set <product-id> --file=<json> [--dry-run] */
final class MPA_CLI {
    /** Prints the stored add-ons (canonical JSON) or reports that they are missing/invalid. */
    public function get($args) {
        $id = $this->product_id($args);
        $raw = get_post_meta($id, MPA_Core::META_KEY, true);
        if ($raw === '' || $raw === false) { WP_CLI::log('No add-ons.'); return; }
        try { WP_CLI::log(MPA_Core::encode(MPA_Core::validate($raw))); }
        catch (InvalidArgumentException $e) { WP_CLI::error('Stored add-ons are invalid: ' . $e->getMessage()); }
    }

    /** Validates a JSON file and stores it. --dry-run validates and prints, without writing. */
    public function set($args, $assoc) {
        $id = $this->product_id($args);
        $file = (string)($assoc['file'] ?? '');
        if ($file === '' || !is_readable($file)) WP_CLI::error('Pass --file=<readable JSON file>.');
        try { $json = MPA_Core::encode(MPA_Core::validate((string)file_get_contents($file))); }
        catch (InvalidArgumentException $e) { WP_CLI::error($e->getMessage()); }
        if (!empty($assoc['dry-run'])) { WP_CLI::log('[dry-run] would store on product ' . $id . ': ' . $json); return; }
        update_post_meta($id, MPA_Core::META_KEY, wp_slash($json));
        WP_CLI::success('Stored add-ons on product ' . $id . '.');
    }

    private function product_id($args): int {
        $id = (int)($args[0] ?? 0);
        $product = $id > 0 && function_exists('wc_get_product') ? wc_get_product($id) : null;
        if (!$product || $product->get_type() === 'variation') WP_CLI::error('Pass a parent product id.');
        return $id;
    }
}
