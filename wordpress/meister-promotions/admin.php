<?php
if (!defined('ABSPATH')) { exit; }
final class Meister_Promotions_Admin {
    public static function boot(): void {
        add_action('admin_menu', static function() { add_submenu_page('woocommerce','Meister Promotions','Meister Promotions','manage_woocommerce','meister-promotions',[self::class,'page']); });
        add_action('woocommerce_coupon_options', [self::class,'coupon_fields']);
        add_action('woocommerce_coupon_options_save', [self::class,'save_coupon']);
    }
    public static function coupon_fields(): void {
        woocommerce_wp_text_input(['id'=>'_meister_campaign','label'=>'Campaign identifier','description'=>'Optional identifier for campaign reporting.']);
        woocommerce_wp_text_input(['id'=>'_meister_influencer','label'=>'Influencer identifier','description'=>'Sales attribution only; no commissions.']);
    }
    public static function save_coupon(int $id): void {
        if (!current_user_can('manage_woocommerce')) { return; }
        $coupon = new WC_Coupon($id);
        foreach (['_meister_campaign','_meister_influencer'] as $key) { $coupon->update_meta_data($key,sanitize_text_field(wp_unslash($_POST[$key] ?? ''))); }
        $coupon->save();
    }
    private static function rules(): array { return get_option('meister_promotions_rules',[]); }
    private static function save(): string {
        check_admin_referer('meister_promotions_save');
        if (isset($_POST['delete_rule'])) {
            $rules=self::rules(); unset($rules[sanitize_key($_POST['delete_rule'])]); update_option('meister_promotions_rules',$rules,false); return 'Bundle deleted.';
        }
        if (isset($_POST['save_welcome'])) {
            $template=['enabled'=>!empty($_POST['welcome_enabled']), 'type'=>sanitize_key($_POST['welcome_type'] ?? ''),'amount'=>wc_format_decimal($_POST['welcome_amount'] ?? ''),'days'=>absint($_POST['welcome_days'] ?? 0)];
            if (!in_array($template['type'],['percent','fixed_cart'],true) || (float)$template['amount']<=0 || ($template['type']==='percent' && (float)$template['amount']>100) || $template['days']>3650) { throw new InvalidArgumentException('Set a positive welcome discount and valid duration.'); }
            update_option('meister_promotions_welcome',$template,false); return 'Welcome template saved. Newsletter signup and email delivery remain separate integrations.';
        }
        $requirements=[];
        foreach ((array)($_POST['products'] ?? []) as $i=>$id) {
            if (!$id) { continue; } $product=wc_get_product(absint($id));
            if (!$product) { throw new InvalidArgumentException('Select existing products.'); }
            $requirements[]=['productId'=>$product->is_type('variation') ? $product->get_parent_id() : $product->get_id(),'variationId'=>$product->is_type('variation') ? $product->get_id() : 0,'quantity'=>absint($_POST['quantities'][$i] ?? 1)];
        }
        $id=sanitize_key($_POST['rule_id'] ?? '') ?: wp_generate_uuid4();
        $rule=['id'=>$id,'name'=>sanitize_text_field(wp_unslash($_POST['rule_name'] ?? '')),'enabled'=>!empty($_POST['rule_enabled']),'requirements'=>$requirements,'type'=>sanitize_key($_POST['discount_type'] ?? ''),'amount'=>wc_format_decimal($_POST['discount_amount'] ?? ''),'maxSets'=>absint($_POST['max_sets'] ?? 0),'starts'=>sanitize_text_field($_POST['starts'] ?? ''),'ends'=>sanitize_text_field($_POST['ends'] ?? ''),'version'=>time()];
        if (!$rule['name'] || strlen($rule['name'])>120) { throw new InvalidArgumentException('Enter a bundle name of up to 120 characters.'); }
        foreach (['starts','ends'] as $field) { if ($rule[$field] && !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/',$rule[$field])) { throw new InvalidArgumentException('Invalid date.'); } }
        if ($rule['starts'] && $rule['ends'] && $rule['starts'] >= $rule['ends']) { throw new InvalidArgumentException('Bundle end must be after its start.'); }
        Meister_Promotions_Engine::validate_rule($rule);
        $rules=self::rules(); if (!isset($rules[$id]) && count($rules)>=50) { throw new InvalidArgumentException('Maximum 50 bundle rules.'); }
        $rules[$id]=$rule; update_option('meister_promotions_rules',$rules,false); return 'Bundle saved.';
    }
    public static function page(): void {
        if (!current_user_can('manage_woocommerce')) { return; }
        wp_enqueue_script('wc-enhanced-select'); wp_enqueue_style('woocommerce_admin_styles');
        $message=''; $error='';
        if ($_SERVER['REQUEST_METHOD']==='POST') { try { $message=self::save(); } catch (Throwable $e) { $error=$e->getMessage(); } }
        $rules=self::rules(); $edit=sanitize_key($_GET['edit'] ?? ''); $r=$rules[$edit] ?? ['requirements'=>[]];
        echo '<div class="wrap"><h1>Meister Promotions</h1><p>Discounts apply to merchandise. Delivery is charged separately. Coupon and automatic bundle savings never stack.</p>';
        if ($message) { echo '<div class="notice notice-success"><p>'.esc_html($message).'</p></div>'; }
        if ($error) { echo '<div class="notice notice-error"><p>'.esc_html($error).'</p></div>'; }
        echo '<h2>Selected-product bundles</h2><table class="widefat"><thead><tr><th>Name</th><th>Offer</th><th>State</th><th>Actions</th></tr></thead><tbody>';
        foreach ($rules as $id=>$rule) {
            echo '<tr><td>'.esc_html($rule['name']).'</td><td>'.esc_html($rule['amount'].($rule['type']==='percent'?'%':' EUR').' per set').'</td><td>'.($rule['enabled']?'Enabled':'Disabled').'</td><td><a href="'.esc_url(admin_url('admin.php?page=meister-promotions&edit='.$id)).'">Edit</a> <form method="post" style="display:inline">';
            wp_nonce_field('meister_promotions_save'); echo '<button class="button-link-delete" name="delete_rule" value="'.esc_attr($id).'">Delete</button></form></td></tr>';
        }
        echo '</tbody></table><h2>'.($edit?'Edit bundle':'Add bundle').'</h2><form method="post">'; wp_nonce_field('meister_promotions_save');
        echo '<input type="hidden" name="rule_id" value="'.esc_attr($edit).'">';
        echo '<p><label>Name <input name="rule_name" required maxlength="120" value="'.esc_attr($r['name']??'').'"></label> <label><input type="checkbox" name="rule_enabled" '.checked(!empty($r['enabled']),true,false).'> Enabled</label></p>';
        echo '<p>Each row is required in the set. Choose a parent product to accept its variations, or choose one exact variation. A unit can qualify only once.</p><table>';
        for ($i=0;$i<12;$i++) {
            $q=$r['requirements'][$i] ?? []; $id=$q['variationId']??0; if (!$id) { $id=$q['productId']??0; } $p=$id?wc_get_product($id):false;
            echo '<tr><td><select class="wc-product-search" style="width:360px" name="products['.$i.']" data-placeholder="Select a product or variation" data-action="woocommerce_json_search_products_and_variations" data-allow_clear="true"><option value=""></option>';
            if ($p) { echo '<option selected value="'.esc_attr($id).'">'.esc_html($p->get_formatted_name()).'</option>'; }
            echo '</select></td><td><label>Quantity <input type="number" min="1" max="99" name="quantities['.$i.']" value="'.esc_attr($q['quantity']??1).'" style="width:70px"></label></td></tr>';
        }
        echo '</table><p><select name="discount_type"><option value="percent" '.selected($r['type']??'','percent',false).'>Percentage of qualifying set</option><option value="fixed" '.selected($r['type']??'','fixed',false).'>Euro saving per qualifying set</option></select> <input type="number" name="discount_amount" min="0.01" step="0.01" required value="'.esc_attr($r['amount']??'').'"> <label>Maximum sets per order (0 = all) <input type="number" name="max_sets" min="0" max="99" value="'.esc_attr($r['maxSets']??0).'"></label></p>';
        echo '<p>Dates use '.esc_html(wp_timezone_string()).'. <label>Starts <input type="datetime-local" name="starts" value="'.esc_attr($r['starts']??'').'"></label> <label>Ends <input type="datetime-local" name="ends" value="'.esc_attr($r['ends']??'').'"></label></p>'; submit_button('Save bundle'); echo '</form>';
        $w=get_option('meister_promotions_welcome',[]);
        echo '<hr><h2>Newsletter welcome template</h2><p>One email-bound coupon per first confirmed newsletter subscription, including previous purchasers. Resubscribing does not issue another. No signup or email service is connected by this setting.</p><form method="post">'; wp_nonce_field('meister_promotions_save');
        echo '<p><label><input type="checkbox" name="welcome_enabled" '.checked(!empty($w['enabled']),true,false).'> Enable trusted issuance</label></p><select name="welcome_type"><option value="percent" '.selected($w['type']??'','percent',false).'>Percentage</option><option value="fixed_cart" '.selected($w['type']??'','fixed_cart',false).'>Euro discount</option></select> <input type="number" min="0.01" step="0.01" name="welcome_amount" required value="'.esc_attr($w['amount']??'').'"><p><label>Validity in days (0 = no expiry) <input type="number" min="0" max="3650" name="welcome_days" value="'.esc_attr($w['days']??0).'"></label></p>'; submit_button('Save welcome template','secondary','save_welcome'); echo '</form>';
        if (class_exists('Meister_Promotions_Attempts')) { echo '<hr><h2>Checkout health</h2><pre>'.esc_html(wp_json_encode(Meister_Promotions_Attempts::health(),JSON_PRETTY_PRINT)).'</pre>'; }
        echo '<hr><h2>Campaign and influencer tracking</h2><p>Set identifiers on native coupons under Marketing → Coupons. Only the promotion actually redeemed is attributed.</p>';
        if (class_exists('Meister_Promotions_Store')) { self::report(); }
        echo '</div>';
    }
    private static function report(): void {
        $rows=Meister_Promotions_Store::report();
        echo '<table class="widefat"><thead><tr><th>Campaign</th><th>Influencer</th><th>Paid orders</th><th>Net merchandise</th><th>Discounts at sale</th></tr></thead><tbody>';
        foreach ($rows as $r) { echo '<tr><td>'.esc_html($r['campaign']).'</td><td>'.esc_html($r['influencer']).'</td><td>'.esc_html($r['orders']).'</td><td>'.esc_html(number_format($r['net']/100,2).' EUR').'</td><td>'.esc_html(number_format($r['discount']/100,2).' EUR').'</td></tr>'; }
        echo '</tbody></table>';
    }
}
Meister_Promotions_Admin::boot();
