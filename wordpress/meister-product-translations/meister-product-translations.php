<?php
/**
 * Plugin Name: Meister Product Translations
 * Description: Reviewable bilingual Woo product text, bounded draft generation and safe import/export.
 * Version: 1.0.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH') && !(defined('WP_CLI') && WP_CLI)) exit;
foreach (['MT_Core'=>'core.php','MT_Service'=>'service.php','MT_Provider'=>'provider.php','MT_WordPress'=>'wordpress.php','MT_Admin'=>'admin.php'] as $class=>$file) if (!class_exists($class)) require_once __DIR__.'/'.$file;
$meister_register_hooks = static function(): void {
    add_filter('woocommerce_rest_prepare_product_object', [MT_WordPress::class,'rest_product'], 20, 3);
    add_filter('woocommerce_rest_pre_insert_product_object', [MT_WordPress::class,'rest_write'], 20, 2);
    add_action('woocommerce_process_product_meta', [MT_WordPress::class,'save_editor'], 30, 1);
    add_action('rest_api_init', [MT_WordPress::class,'routes']);
    add_action('add_meta_boxes', [MT_Admin::class,'box']);
    add_action('admin_menu', [MT_Admin::class,'menu']);
};
if (function_exists('add_action')) $meister_register_hooks();
elseif (defined('WP_CLI') && WP_CLI) WP_CLI::add_hook('after_wp_load', $meister_register_hooks);
if (defined('WP_CLI') && WP_CLI) {
    if (!class_exists('MT_CLI')) require_once __DIR__.'/cli.php';
    WP_CLI::add_command('meister-translations', MT_CLI::class);
}
