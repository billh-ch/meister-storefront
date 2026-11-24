<?php
/**
 * Plugin Name: Meister Product Add-ons
 * Description: Optional paid add-ons per product (e.g. wetsuit extras), edited in the classic product editor and priced on WooCommerce orders created by the Meister storefront.
 * Version: 1.0.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH') && !(defined('WP_CLI') && WP_CLI)) exit;
foreach (['MPA_Core' => 'core.php', 'MPA_WooCommerce' => 'woocommerce.php', 'MPA_Admin' => 'admin.php'] as $class => $file) if (!class_exists($class)) require_once __DIR__ . '/' . $file;
$meister_addons_register_hooks = static function (): void {
    // Storefront contract: products say the pricing side is active; invalid
    // REST writes of the field are refused; add-ons are priced on new orders.
    add_filter('woocommerce_rest_prepare_product_object', [MPA_WooCommerce::class, 'rest_product'], 20, 3);
    add_filter('woocommerce_rest_pre_insert_product_object', [MPA_WooCommerce::class, 'rest_product_write'], 20, 3);
    add_filter('woocommerce_rest_pre_insert_shop_order_object', [MPA_WooCommerce::class, 'price_rest_order'], 20, 3);
    add_action('woocommerce_product_duplicate', [MPA_WooCommerce::class, 'duplicate'], 20, 2);
    // Classic product editor.
    add_action('add_meta_boxes', [MPA_Admin::class, 'box']);
    add_action('woocommerce_process_product_meta', [MPA_Admin::class, 'save'], 30, 1);
    add_action('admin_notices', [MPA_Admin::class, 'notices']);
};
if (function_exists('add_action')) $meister_addons_register_hooks();
elseif (defined('WP_CLI') && WP_CLI) WP_CLI::add_hook('after_wp_load', $meister_addons_register_hooks);
if (defined('WP_CLI') && WP_CLI) {
    if (!class_exists('MPA_CLI')) require_once __DIR__ . '/cli.php';
    WP_CLI::add_command('meister-addons', MPA_CLI::class);
}
