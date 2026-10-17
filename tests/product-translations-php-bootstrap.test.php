<?php
error_reporting(E_ALL);
define('WP_CLI',true);
class WP_CLI {
    static $hooks=[]; static $commands=[];
    static function add_hook($name,$callback) { self::$hooks[$name]=$callback; }
    static function add_command($name,$class) { self::$commands[$name]=$class; }
}
register_shutdown_function(function() { if (empty($GLOBALS['bootstrap_verified'])) { fwrite(STDERR,"FAIL early --require bootstrap exited before command registration\n"); exit(1); } });
foreach (['core.php','service.php','provider.php','wordpress.php','admin.php','cli.php'] as $file) eval('?>'.base64_decode($bundle[$file]));
eval('?>'.base64_decode($bundle['meister-product-translations.php']));
if (!isset(WP_CLI::$commands['meister-translations']) || !isset(WP_CLI::$hooks['after_wp_load'])) throw new Exception('Missing early CLI registration / deferred WP hooks');
$GLOBALS['bootstrap_verified']=true;
echo "PASS early WP CLI --require without ABSPATH defers WordPress hooks\n";
