<?php
if (!defined('ABSPATH')) { exit; }
if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('meister promotions health',static function(){WP_CLI::line(wp_json_encode(Meister_Promotions_Attempts::health(),JSON_PRETTY_PRINT));});
    WP_CLI::add_command('meister promotions welcome',static function($args,$assoc) {
        if(empty($assoc['confirmed'])) {WP_CLI::error('Use --confirmed only for a trusted, confirmed first newsletter subscription.');}
        try {$v=Meister_Promotions_Newsletter::issue($args[0]??'',true);WP_CLI::line(wp_json_encode($v));}catch(Throwable $e){WP_CLI::error($e->getMessage());}
    });
    WP_CLI::add_command('meister promotions pending',static function(){WP_CLI::line(wp_json_encode(Meister_Promotions_Attempts::pending(),JSON_PRETTY_PRINT));});
}
