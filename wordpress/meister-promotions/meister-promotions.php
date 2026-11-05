<?php
/**
 * Plugin Name: Meister Promotions
 * Description: Woo-authoritative storefront coupons, selected-product bundles and newsletter welcome issuance.
 * Version: 1.0.0
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 * WC requires at least: 9.5.2
 * Text Domain: meister-promotions
 */
if (!defined('ABSPATH')) { exit; }
define('MEISTER_PROMOTIONS_VERSION', '1.0.0');
require_once __DIR__.'/engine.php';
foreach (['store','cart','newsletter','attempts','api','admin','cli'] as $file) {
    $path = __DIR__."/$file.php";
    if (is_file($path)) { require_once $path; }
}
add_action('before_woocommerce_init', static function() {
    if (class_exists('Automattic\\WooCommerce\\Utilities\\FeaturesUtil')) {
        Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});
register_activation_hook(__FILE__, static function() {
    if (!class_exists('WooCommerce') || version_compare(PHP_VERSION,'8.1','<')) { throw new RuntimeException('WooCommerce and PHP 8.1+ are required.'); }
    Meister_Promotions_Store::install();
});
