<?php
// Runs via tests/product-addons-php-run.py: $bundle (plugin files, base64) and $fixture are prepended.
// Stubs WordPress/WooCommerce at their boundary; production classes run unmodified.
error_reporting(E_ALL);
set_error_handler(function ($no, $str, $file, $line) { throw new ErrorException($str, 0, $no, $file, $line); });
define('ABSPATH', '/stub/');
$GLOBALS['hooks'] = []; $GLOBALS['meta'] = []; $GLOBALS['transients'] = []; $GLOBALS['can'] = true; $GLOBALS['nonce_ok'] = true;
function add_action($name, $cb, $p = 10, $a = 1) { $GLOBALS['hooks'][$name][] = $cb; }
function add_filter($name, $cb, $p = 10, $a = 1) { $GLOBALS['hooks'][$name][] = $cb; }
function add_meta_box(...$args) { $GLOBALS['boxes'][] = $args; }
function get_post_meta($id, $key, $single) { return $GLOBALS['meta'][$id][$key] ?? ''; }
function update_post_meta($id, $key, $value) { $GLOBALS['meta'][$id][$key] = wp_unslash($value); return true; }
function delete_post_meta($id, $key) { unset($GLOBALS['meta'][$id][$key]); return true; }
function wp_slash($v) { return is_string($v) ? addslashes($v) : $v; }
function wp_unslash($v) { return is_string($v) ? stripslashes($v) : (is_array($v) ? array_map('wp_unslash', $v) : $v); }
function sanitize_title($s) { return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-'); }
function sanitize_text_field($s) { return trim((string)$s); }
function wp_verify_nonce($n, $a) { return $GLOBALS['nonce_ok'] && $n === 'good-nonce' && $a === 'meister_product_addons'; }
function wp_nonce_field($a, $n) { echo '<input type="hidden" name="' . $n . '" value="good-nonce">'; }
function current_user_can($cap, $id = null) { return $GLOBALS['can'] && $cap === 'edit_product'; }
function get_current_user_id() { return 7; }
function set_transient($k, $v, $t) { $GLOBALS['transients'][$k] = $v; }
function get_transient($k) { return $GLOBALS['transients'][$k] ?? false; }
function delete_transient($k) { unset($GLOBALS['transients'][$k]); }
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function get_the_ID() { return 0; }
function wc_format_decimal($v) { return (string)$v; }
// WooCommerce with prices including 24% VAT: removes VAT from the VAT-inclusive line price at full precision.
function wc_get_price_excluding_tax($product, $args) { $GLOBALS['price_calls'][] = $args; return round(((float)$args['price']) * $args['qty'] / 1.24, 6); }
class WP_Error { public $code; public $message; public $data; function __construct($c, $m, $d = []) { $this->code = $c; $this->message = $m; $this->data = $d; } }
class FakeProduct {
    public $meta = []; public $saved = 0;
    function __construct(public string $price = '320', public int $parent = 0, public string $type = 'variation') {}
    function get_price() { return $this->price; }
    function get_parent_id() { return $this->parent; }
    function get_type() { return $this->type; }
    function get_meta($k, $single = true) { return $this->meta[$k] ?? ''; }
    function update_meta_data($k, $v) { $this->meta[$k] = $v; }
    function delete_meta_data($k) { unset($this->meta[$k]); }
    function save() { $this->saved++; }
}
class FakeItem {
    public $meta = []; public $subtotal = 'woo-product-price'; public $total = 'woo-product-price';
    function __construct(public $product, public int $productId, public int $qty, string $refs = '') { if ($refs !== '') $this->meta[] = ['_meister_addons', $refs]; }
    function get_product() { return $this->product; }
    function get_product_id() { return $this->productId; }
    function get_quantity() { return $this->qty; }
    function get_meta($k, $single = true) { foreach ($this->meta as [$key, $v]) if ($key === $k) return $v; return ''; }
    function add_meta_data($k, $v, $unique = false) { $this->meta[] = [$k, $v]; }
    function update_meta_data($k, $v) { foreach ($this->meta as $i => [$key]) if ($key === $k) { $this->meta[$i] = [$k, $v]; return; } $this->meta[] = [$k, $v]; }
    function set_subtotal($v) { $this->subtotal = $v; }
    function set_total($v) { $this->total = $v; }
    function visible() { return array_values(array_filter($this->meta, fn($m) => $m[0][0] !== '_')); }
}
class FakeOrder { function __construct(public array $items) {} function get_items($type) { return $this->items; } }

foreach (['core.php', 'woocommerce.php', 'admin.php'] as $file) eval('?>' . base64_decode($bundle[$file]));
eval('?>' . base64_decode($bundle['meister-product-addons.php']));

$passed = 0;
function check($label, callable $fn) { global $passed; try { $fn(); $passed++; echo "PASS $label\n"; } catch (Throwable $e) { echo "FAIL $label: " . $e->getMessage() . ' @' . $e->getLine() . "\n"; exit(1); } }
function same($a, $b, $m = '') { if ($a !== $b) throw new Exception(($m ? "$m: " : '') . var_export($a, true) . ' !== ' . var_export($b, true)); }
function throws(callable $fn, $pattern = '/./') { try { $fn(); } catch (InvalidArgumentException $e) { if (!preg_match($pattern, $e->getMessage())) throw new Exception('wrong message: ' . $e->getMessage()); return; } throw new Exception('expected an exception'); }

$valid = $fixture['cases'][0]['raw'];

check('bootstrap registers every hook', function () {
    foreach (['woocommerce_rest_prepare_product_object', 'woocommerce_rest_pre_insert_product_object', 'woocommerce_rest_pre_insert_shop_order_object', 'woocommerce_product_duplicate', 'add_meta_boxes', 'woocommerce_process_product_meta', 'admin_notices'] as $hook) {
        if (empty($GLOBALS['hooks'][$hook])) throw new Exception("missing $hook");
    }
});

check('PHP validator agrees with every case of the shared fixture', function () use ($fixture) {
    if (count($fixture['cases']) < 30) throw new Exception('fixture too small');
    foreach ($fixture['cases'] as $case) same(MPA_Core::parse($case['raw']) !== null, $case['valid'], $case['label']);
});

check('canonical encoding round-trips and keeps Greek readable', function () use ($valid) {
    $json = MPA_Core::encode(MPA_Core::validate($valid));
    same(MPA_Core::validate($json), MPA_Core::validate($valid));
    if (strpos($json, 'Μοτίβο') === false) throw new Exception('Greek escaped');
});

check('editor form: blanks ignored, ids from English names, friendly prices, removals', function () {
    $form = ['groups' => [
        ['id' => '', 'type' => 'single', 'name_en' => 'Camo pattern', 'name_el' => 'Μοτίβο', 'options' => [
            ['id' => '', 'name_en' => 'Split camo pattern', 'name_el' => 'Μερικό', 'price' => '30'],
            ['id' => '', 'name_en' => 'Full camo pattern', 'name_el' => 'Πλήρες', 'price' => '40,5'],
            ['id' => '', 'name_en' => '', 'name_el' => '', 'price' => ''],
        ]],
        ['id' => 'extras', 'type' => 'multi', 'name_en' => ' Extras  ', 'name_el' => 'Επιπλέον', 'options' => [
            ['id' => 'velcro', 'name_en' => 'Velcro', 'name_el' => 'Velcro', 'price' => '20.00', 'remove' => '1'],
            ['id' => 'knee-pads', 'name_en' => 'Knee pads', 'name_el' => 'Επιγονατίδες', 'price' => '25.00'],
        ]],
        ['id' => '', 'type' => 'multi', 'name_en' => '', 'name_el' => '', 'options' => [['name_en' => '', 'name_el' => '', 'price' => '']]],
    ]];
    $config = MPA_Core::validate(MPA_Core::encode(MPA_Core::from_form($form, 'sanitize_title')));
    same(array_column($config['groups'], 'id'), ['camo-pattern', 'extras']);
    same(array_column($config['groups'][0]['options'], 'id'), ['split-camo-pattern', 'full-camo-pattern']);
    same(array_column($config['groups'][0]['options'], 'price'), ['30.00', '40.50']);
    same($config['groups'][1]['name']['en'], 'Extras');
    same(array_column($config['groups'][1]['options'], 'id'), ['knee-pads']);
    same(MPA_Core::from_form(['groups' => [['id' => 'extras', 'remove' => '1', 'name_en' => 'X', 'name_el' => 'Y', 'options' => []]]], 'sanitize_title'), null);
});

check('invalid editor input is refused as a whole with a clear message', function () use ($valid) {
    $GLOBALS['meta'][50]['meister_addons'] = $valid;
    $cases = [
        'above zero' => ['price' => '0', 'name_en' => 'Free', 'name_el' => 'Δωρεάν'],
        'Greek name is required' => ['price' => '10', 'name_en' => 'No Greek', 'name_el' => ''],
        'price must be' => ['price' => 'ten', 'name_en' => 'Bad', 'name_el' => 'Κακό'],
        'without < or >' => ['price' => '10', 'name_en' => '<script>', 'name_el' => 'x'],
    ];
    foreach ($cases as $expect => $option) {
        $message = MPA_Admin::apply(50, ['groups' => [['id' => '', 'type' => 'multi', 'name_en' => 'Group', 'name_el' => 'Ομάδα', 'options' => [$option]]]]);
        if (!is_string($message) || stripos($message, 'NOT saved') === false || stripos($message, $expect) === false) throw new Exception("$expect: " . var_export($message, true));
        same($GLOBALS['meta'][50]['meister_addons'], $valid, 'stored add-ons unchanged');
    }
    $type = MPA_Admin::apply(50, ['groups' => [['id' => '', 'type' => 'required', 'name_en' => 'G', 'name_el' => 'Γ', 'options' => [['name_en' => 'A', 'name_el' => 'Α', 'price' => '1']]]]]);
    if (stripos($type, 'type must be') === false) throw new Exception($type);
    $dup = MPA_Admin::apply(50, ['groups' => [['id' => '', 'type' => 'multi', 'name_en' => 'G', 'name_el' => 'Γ', 'options' => [['name_en' => 'Pads', 'name_el' => 'Α', 'price' => '1'], ['name_en' => 'Pads', 'name_el' => 'Β', 'price' => '2']]]]]);
    if (stripos($dup, 'already used') === false) throw new Exception($dup);
});

check('an option id cannot move to another group', function () use ($valid) {
    $GLOBALS['meta'][51]['meister_addons'] = $valid;
    $form = ['groups' => [
        ['id' => 'camo', 'type' => 'single', 'name_en' => 'Camo pattern', 'name_el' => 'Μοτίβο', 'options' => [['id' => 'split', 'name_en' => 'Split', 'name_el' => 'Μ', 'price' => '30.00']]],
        ['id' => 'extras', 'type' => 'multi', 'name_en' => 'Extras', 'name_el' => 'Ε', 'options' => [['id' => 'full', 'name_en' => 'Full', 'name_el' => 'Π', 'price' => '40.00']]],
    ]];
    if (stripos((string)MPA_Admin::apply(51, $form), 'another group') === false) throw new Exception('moved id accepted');
    same($GLOBALS['meta'][51]['meister_addons'], $valid);
});

check('save requires a valid nonce and edit rights; removing everything deletes the field', function () use ($valid) {
    $form = ['groups' => [['id' => '', 'type' => 'multi', 'name_en' => 'Extras', 'name_el' => 'Επιπλέον', 'options' => [['name_en' => 'Velcro', 'name_el' => 'Velcro', 'price' => '20']]]]];
    $GLOBALS['meta'][52] = [];
    $_POST = ['mpa' => $form];
    MPA_Admin::save(52); same($GLOBALS['meta'][52], [], 'no nonce');
    $_POST = ['mpa' => $form, 'mpa_nonce' => 'forged'];
    MPA_Admin::save(52); same($GLOBALS['meta'][52], [], 'bad nonce');
    $_POST = ['mpa' => $form, 'mpa_nonce' => 'good-nonce']; $GLOBALS['can'] = false;
    MPA_Admin::save(52); same($GLOBALS['meta'][52], [], 'no capability');
    $GLOBALS['can'] = true;
    MPA_Admin::save(52);
    same(MPA_Core::validate($GLOBALS['meta'][52]['meister_addons'])['groups'][0]['options'][0]['price'], '20.00');
    $_POST = ['mpa' => ['groups' => [['id' => 'extras', 'remove' => '1']]], 'mpa_nonce' => 'good-nonce'];
    MPA_Admin::save(52); same(isset($GLOBALS['meta'][52]['meister_addons']), false);
    $_POST = ['mpa' => ['groups' => [['id' => '', 'type' => 'multi', 'name_en' => 'G', 'name_el' => '', 'options' => [['name_en' => 'A', 'name_el' => 'Α', 'price' => '1']]]]], 'mpa_nonce' => 'good-nonce'];
    MPA_Admin::save(52);
    if (stripos((string)get_transient('meister_addons_notice_7'), 'NOT saved') === false) throw new Exception('no notice');
    ob_start(); MPA_Admin::notices(); $html = ob_get_clean();
    if (strpos($html, 'notice-error') === false || get_transient('meister_addons_notice_7') !== false) throw new Exception('notice not shown once');
    $_POST = [];
});

check('editor box escapes stored names and flags invalid stored data', function () use ($valid) {
    $config = MPA_Core::validate($valid); $config['groups'][0]['name']['en'] = 'Camo "pattern" & co';
    $GLOBALS['meta'][53]['meister_addons'] = MPA_Core::encode($config);
    ob_start(); MPA_Admin::editor((object)['ID' => 53]); $html = ob_get_clean();
    if (strpos($html, 'Camo &quot;pattern&quot; &amp; co') === false || strpos($html, 'Camo "pattern"') !== false) throw new Exception('not escaped');
    if (strpos($html, 'good-nonce') === false) throw new Exception('no nonce field');
    $GLOBALS['meta'][54]['meister_addons'] = '{"version":2}';
    ob_start(); MPA_Admin::editor((object)['ID' => 54]); $html = ob_get_clean();
    if (strpos($html, 'stored add-ons are invalid') === false) throw new Exception('invalid not flagged');
});

check('selection resolution refuses tampering', function () use ($valid) {
    $config = MPA_Core::validate($valid);
    same(array_column(MPA_Core::resolve($config, ['extras:velcro', 'camo:full']), 'ref'), ['camo:full', 'extras:velcro']);
    throws(fn() => MPA_Core::resolve($config, ['camo:split', 'camo:full']), '/Only one/');
    throws(fn() => MPA_Core::resolve($config, ['extras:velcro', 'extras:velcro']), '/Duplicate/');
    throws(fn() => MPA_Core::resolve($config, ['camo:gold']), '/not offered/');
    throws(fn() => MPA_Core::resolve($config, ['camo:velcro']), '/not offered/');
    throws(fn() => MPA_Core::resolve($config, ['CAMO:full']), '/Malformed/');
    throws(fn() => MPA_Core::resolve($config, []));
});

check('new REST orders price add-on lines with WooCommerce VAT logic and record them visibly', function () use ($valid) {
    $GLOBALS['meta'][60]['meister_addons'] = $valid;
    $GLOBALS['price_calls'] = [];
    $addonLine = new FakeItem(new FakeProduct('320', 60), 60, 2, 'camo:full,extras:knee-pads');
    $plainLine = new FakeItem(new FakeProduct('290', 61), 61, 1);
    $order = new FakeOrder([$addonLine, $plainLine]);
    same(MPA_WooCommerce::price_rest_order($order, [], true), $order);
    same($GLOBALS['price_calls'], [['qty' => 2, 'price' => '385.00']], 'unit = product price + add-ons, VAT included');
    same($addonLine->subtotal, round(770 / 1.24, 6));
    same($addonLine->total, $addonLine->subtotal);
    same($addonLine->visible(), [['Camo pattern', 'Full camo pattern (+€40.00)'], ['Extras', 'Knee pads (+€25.00)']]);
    same($addonLine->get_meta('_meister_addons_total'), '65.00');
    same($plainLine->subtotal, 'woo-product-price', 'lines without add-ons are untouched');
    // VAT re-added per line, rounded to cents, gives back exactly the charged amount.
    same((int)round(($addonLine->total + round($addonLine->total * 0.24, 2)) * 100), 77000);
});

check('a line that cannot be priced keeps WooCommerce pricing, never blocks, and is marked', function () use ($valid) {
    $GLOBALS['meta'][62]['meister_addons'] = $valid;
    $GLOBALS['meta'][63] = [];
    $GLOBALS['meta'][64]['meister_addons'] = '{"version":2}';
    foreach ([[62, 'camo:gold'], [62, 'camo:split,camo:full'], [63, 'camo:full'], [64, 'camo:full']] as [$pid, $refs]) {
        $line = new FakeItem(new FakeProduct('320', $pid), $pid, 1, $refs);
        MPA_WooCommerce::price_rest_order(new FakeOrder([$line]), [], true);
        same($line->subtotal, 'woo-product-price', "$pid $refs");
        if ($line->get_meta('_meister_addons_error') === '') throw new Exception('no error meta');
        same($line->visible(), []);
    }
    $line = new FakeItem(new FakeProduct('320', 62), 62, 1, 'camo:full');
    MPA_WooCommerce::price_rest_order(new FakeOrder([$line]), [], false);
    same($line->subtotal, 'woo-product-price', 'order updates are never re-priced');
});

check('REST: products advertise the pricing marker; invalid add-on writes are refused', function () use ($valid) {
    $response = (object)['data' => ['id' => 1]];
    same(MPA_WooCommerce::rest_product($response, null, null)->data['meister_addons_pricing'], 1);
    $parent = new FakeProduct('1', 0, 'variable');
    same(MPA_WooCommerce::rest_product_write($parent, ['meta_data' => [['key' => 'meister_addons', 'value' => $valid]]]), $parent);
    same(MPA_WooCommerce::rest_product_write($parent, ['meta_data' => [['key' => 'meister_addons', 'value' => '']]]), $parent);
    same(MPA_WooCommerce::rest_product_write($parent, ['meta_data' => [['key' => 'other', 'value' => 'x']]]), $parent);
    $error = MPA_WooCommerce::rest_product_write($parent, ['meta_data' => [['key' => 'meister_addons', 'value' => '{"version":2}']]]);
    if (!($error instanceof WP_Error) || $error->data['status'] !== 400) throw new Exception('invalid write accepted');
    if (!(MPA_WooCommerce::rest_product_write(new FakeProduct('1', 9), ['meta_data' => [['key' => 'meister_addons', 'value' => $valid]]]) instanceof WP_Error)) throw new Exception('variation write accepted');
});

check('duplicating a product keeps valid add-ons and drops invalid ones', function () use ($valid) {
    $original = new FakeProduct('1', 0, 'variable'); $original->meta['meister_addons'] = $valid;
    $copy = new FakeProduct('1', 0, 'variable');
    MPA_WooCommerce::duplicate($copy, $original);
    same($copy->meta['meister_addons'], $valid); same($copy->saved, 1);
    $original->meta['meister_addons'] = 'junk'; $copy->meta['meister_addons'] = 'junk';
    MPA_WooCommerce::duplicate($copy, $original);
    same(isset($copy->meta['meister_addons']), false);
});

echo "ALL $passed PHP checks passed\n";
