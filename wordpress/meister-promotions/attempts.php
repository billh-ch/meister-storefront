<?php
if (!defined('ABSPATH')) { exit; }
final class Meister_Promotions_Attempts {
    private static bool $closing=false;
    public static function boot(): void {
        add_filter('woocommerce_cancel_unpaid_order',static fn($cancel,$order)=>$order->get_meta('_meister_attempt')?false:$cancel,10,2);
        add_action('woocommerce_before_order_object_save',static function($order) {
            if (!self::$closing && $order instanceof WC_Order && $order->get_meta('_meister_attempt') && !$order->get_date_paid() && in_array($order->get_changes()['status']??'',['cancelled','failed'],true)) { throw new RuntimeException('Reconcile this storefront payment session before cancelling its order.'); }
        });
    }
    public static function health(): array {
        global $wpdb;
        $tables=$wpdb->get_results($wpdb->prepare('SHOW TABLE STATUS WHERE Name LIKE %s',$wpdb->esc_like($wpdb->prefix).'%'),ARRAY_A);$transactional=true;foreach($tables as $t){if(in_array($t['Name'],[$wpdb->posts,$wpdb->postmeta,$wpdb->options,$wpdb->prefix.'woocommerce_order_items',$wpdb->prefix.'woocommerce_order_itemmeta',$wpdb->prefix.'wc_orders',$wpdb->prefix.'wc_order_addresses',$wpdb->prefix.'wc_order_operational_data',$wpdb->prefix.'wc_orders_meta',$wpdb->prefix.'wc_reserved_stock',Meister_Promotions_Store::table()],true) && strtoupper($t['Engine']??'')!=='INNODB'){$transactional=false;}}
        return ['transactionalTables'=>$transactional,'couponReservations'=>method_exists(WC_Order::class,'hold_applied_coupons') && function_exists('wc_release_coupons_for_order'),'stockReservations'=>function_exists('wc_reserve_stock_for_order'),'ledgerInstalled'=>$wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',Meister_Promotions_Store::table()))===Meister_Promotions_Store::table(),'reconciledAt'=>(int)get_option('meister_promotions_reconciled_at',0),'activated'=>defined('MEISTER_PROMOTIONS_CHECKOUT_READY') && MEISTER_PROMOTIONS_CHECKOUT_READY===true];
    }
    private static function transaction(callable $fn) {
        return Meister_Promotions_Store::transaction($fn);
    }
    private static function attempt(string $id): array {
        if (!preg_match('/^[a-f0-9]{64}$/',$id)) {throw new InvalidArgumentException('Invalid attempt.');}
        $a=Meister_Promotions_Store::get('attempt:'.$id);if(!$a){throw new InvalidArgumentException('Attempt not found.');}return $a;
    }
    private static function owned(array $a,string $owner): void {if(!hash_equals($a['owner'],Meister_Promotions_Store::owner($owner))){throw new InvalidArgumentException('Attempt ownership mismatch.');}}
    public static function prepare(array $r): array {
        $owner=Meister_Promotions_Store::owner($r['owner']??'');$key=$r['attemptKey']??'';
        if (!is_string($key) || !preg_match('/^[a-zA-Z0-9_-]{16,100}$/',$key)) {throw new InvalidArgumentException('Invalid attempt key.');}
        $id=hash('sha256',$owner.':'.$key);
        return Meister_Promotions_Store::locked('prepare',static function() use($r,$owner,$id) {
            $existing=Meister_Promotions_Store::get('attempt:'.$id);
            if ($existing) {self::owned($existing,$r['owner']);if(in_array($existing['state'],['review'],true)){throw new RuntimeException('Start a new checkout attempt.');}return self::public_attempt($existing);}
            $active=Meister_Promotions_Store::get('active:'.$owner);
            if ($active && $active['attemptId']!==$id) {
                $previous=self::attempt($active['attemptId']);
                if(!in_array($previous['state'],['expired','failed','paid'],true)){return array_merge(self::public_attempt($previous),['supersede'=>true]);}
            }
            $stored=Meister_Promotions_Store::get('quote:'.($r['reference']??''));
            if (!$stored || !hash_equals($stored['owner'],$owner)) {throw new InvalidArgumentException('Quote expired. Refresh checkout.');}
            if (isset($r['currentShippingId']) && $r['currentShippingId']!==$stored['quote']['shippingId']) {throw new InvalidArgumentException('Delivery changed. Refresh checkout.');}
            if (isset($r['currentItems']) && wp_json_encode($r['currentItems'])!==wp_json_encode($stored['input']['items'])) {throw new InvalidArgumentException('Your cart changed. Refresh checkout.');}
            if (isset($r['currentCustomerId']) && (int)$r['currentCustomerId']!==(int)($stored['input']['customerId']??0)) {throw new InvalidArgumentException('Your account changed. Refresh checkout.');}
            if (isset($r['currentEmail']) && strtolower(trim($r['currentEmail']))!==strtolower(trim($stored['input']['email']??''))) {throw new InvalidArgumentException('Your email changed. Refresh checkout.');}
            if (isset($r['currentCoupon']) && wc_format_coupon_code($r['currentCoupon'])!==wc_format_coupon_code($stored['input']['coupon']??'')) {throw new InvalidArgumentException('Your coupon changed. Refresh checkout.');}
            if (empty($stored['input']['email'])) {throw new InvalidArgumentException('Email is required before payment.');}
            if (!in_array($r['mode']??'',['test','live'],true) || !filter_var($r['origin']??'',FILTER_VALIDATE_URL) || parse_url($r['origin'],PHP_URL_SCHEME)!=='https') {throw new InvalidArgumentException('Invalid checkout environment.');}
            return self::transaction(static function() use($stored,$r,$owner,$id) {
                return Meister_Promotions_Cart::evaluate($stored['input'],static function($quote,$cart) use($stored,$r,$owner,$id) {
                    foreach (['subtotal','discount','shipping','total','tax','shippingId','promotion','lines'] as $field) {
                        if ($quote[$field]!==$stored['quote'][$field]) {throw new RuntimeException('Checkout changed. Refresh your quote.');}
                    }
                    if (in_array($quote['coupon']['status'],['invalid','email_required'],true)) {throw new InvalidArgumentException('Review or remove the coupon before payment.');}
                    $quote['reference']=$stored['quote']['reference'];$quote['expiresAt']=$stored['quote']['expiresAt'];
                    $order=new WC_Order();$order->set_created_via('meister_promotions_v1');$order->set_customer_id(absint($stored['input']['customerId']??0));$order->set_currency('EUR');$order->set_payment_method($quote['total']>0?'stripe':'');$order->set_payment_method_title($quote['total']>0?'Stripe':'No payment required');
                    $address=$r['address']??[];$contextAddress=$stored['input']['address']??[];
                    foreach(['country','state','postcode','city','address_1','address_2'] as $field) {if((string)($address[$field]??'')!==(string)($contextAddress[$field]??'')){throw new InvalidArgumentException('Address changed. Refresh checkout.');}}
                    $address['email']=$stored['input']['email'];$order->set_address($address,'billing');$order->set_address($address,'shipping');
                    $order->update_meta_data('_meister_attempt',$id);$order->update_meta_data('_meister_promotion',$quote['promotion']);$order->update_meta_data('_meister_mode',$r['mode']);
                    $selectedMethod=null;foreach($quote['methods'] as $method){if($method['id']===$quote['shippingId']){$selectedMethod=$method;}}
                    if(($stored['input']['address']['country']??'')==='GR' && ($selectedMethod['wcMethodId']??'')==='box_now_delivery' && empty(array_column($r['locker']??[],'value','key')['_boxnow_locker_id'])){throw new InvalidArgumentException('BOX NOW locker is required.');}
                    if (!empty($r['locker'])) {foreach($r['locker'] as $meta){$order->update_meta_data($meta['key'],$meta['value']);}}
                    $checkout=WC_Checkout::instance();$checkout->create_order_line_items($order,$cart);$checkout->create_order_shipping_lines($order,WC()->session->get('chosen_shipping_methods'),WC()->shipping()->get_packages());$checkout->create_order_tax_lines($order,$cart);
                    if (($quote['promotion']['type']??'')==='coupon') {$checkout->create_order_coupon_lines($order,$cart);}
                    $order->set_discount_total($cart->get_discount_total());$order->set_discount_tax($cart->get_discount_tax());$order->set_shipping_total($cart->get_shipping_total());$order->set_shipping_tax($cart->get_shipping_tax());$order->set_cart_tax($cart->get_cart_contents_tax());$order->set_total($cart->get_total('edit'));
                    if ((int)round((float)$order->get_total()*100)!==$quote['total']) {throw new RuntimeException('Checkout total mismatch.');}
                    $order->save();
                    // Do not let clock expiry silently make capacity available while Stripe is still processing.
                    $hold=static fn()=>5256000;$stockHold=static fn($minutes,$o)=>$o->get_id()===$order->get_id()?5256000:$minutes;
                    add_filter('woocommerce_coupon_hold_minutes',$hold);add_filter('woocommerce_order_hold_stock_minutes',$stockHold,10,2);
                    try {$order->hold_applied_coupons($stored['input']['email']);wc_reserve_stock_for_order($order);}
                    finally {remove_filter('woocommerce_coupon_hold_minutes',$hold);remove_filter('woocommerce_order_hold_stock_minutes',$stockHold,10);}
                    $attempt=['attemptId'=>$id,'owner'=>$owner,'email'=>$stored['input']['email'],'orderId'=>$order->get_id(),'number'=>$order->get_order_number(),'quote'=>$quote,'origin'=>rtrim($r['origin'],'/'),'locale'=>$r['locale']??'en','mode'=>$r['mode'],'state'=>'prepared','sessionId'=>'','expiresAt'=>time()+3600,'createdAt'=>time()];
                    Meister_Promotions_Store::put('attempt:'.$id,$attempt);Meister_Promotions_Store::put('active:'.$owner,['attemptId'=>$id]);return self::public_attempt($attempt);
                });
            });
        });
    }
    private static function public_attempt(array $a): array {return array_intersect_key($a,array_flip(['attemptId','email','orderId','number','quote','origin','locale','mode','state','sessionId','expiresAt','createdAt','reviewReason']));}
    public static function bind(array $r): array {
        return Meister_Promotions_Store::locked('attempt:'.($r['attemptId']??''),static function() use($r) {
            $a=self::attempt($r['attemptId']??'');self::owned($a,$r['owner']??'');$session=$r['sessionId']??'';
            if(!preg_match('/^cs_(test_|live_)?[a-zA-Z0-9_]{5,200}$/',$session) || ($a['sessionId'] && !hash_equals($a['sessionId'],$session)) || !in_array($a['state'],['prepared','open','processing','paid'],true)){throw new InvalidArgumentException('Session binding mismatch.');}
            $a['sessionId']=$session;if($a['state']==='prepared'){$a['state']='open';}
            Meister_Promotions_Store::put('attempt:'.$a['attemptId'],$a);return self::public_attempt($a);
        });
    }
    public static function event(array $r): array {
        return Meister_Promotions_Store::locked('attempt:'.($r['attemptId']??''),static function() use($r) {
            return self::transaction(static function() use($r) {
            $a=self::attempt($r['attemptId']??'');$order=wc_get_order($a['orderId']);if(!$order){throw new RuntimeException('Order missing.');}
            if (($r['mode']??'')!==$a['mode'] || strtolower($r['currency']??'')!=='eur' || ($r['amount']??null)!==$a['quote']['total'] || empty($r['sessionId']) || ($a['sessionId'] && !hash_equals($a['sessionId'],$r['sessionId']))) {return self::review($a,'payment_facts_mismatch');}
            // A verified event can recover a session create whose bind acknowledgment was lost.
            if (!$a['sessionId']) {$a['sessionId']=$r['sessionId'];Meister_Promotions_Store::put('attempt:'.$a['attemptId'],$a);}
            if($order->is_paid() || $order->get_date_paid()){
                $a['state']='paid';Meister_Promotions_Store::put('attempt:'.$a['attemptId'],$a);
                $promotion=$a['quote']['promotion'];if($promotion){Meister_Promotions_Store::put('attribution:'.$a['attemptId'],['orderId'=>$order->get_id(),'campaign'=>$promotion['campaign'],'influencer'=>$promotion['influencer'],'discount'=>$a['quote']['discount']]);}
                return ['id'=>$order->get_id(),'number'=>$order->get_order_number(),'state'=>'paid'];
            }
            if($a['state']==='paid'){return self::review($a,'paid_ledger_without_paid_order');}
            if($a['state']==='review'){return ['id'=>$a['orderId'],'number'=>$a['number'],'state'=>'review'];}
            $state=$r['state']??'';
            if(in_array($a['state'],['expired','failed'],true) && $state!=='paid'){return ['id'=>$a['orderId'],'number'=>$a['number'],'state'=>$a['state']];}
            if ($state==='paid') {
                if (!in_array($r['paymentStatus']??'',['paid','no_payment_required'],true) || ($a['quote']['total']>0 && !preg_match('/^pi_[a-zA-Z0-9_]+$/',$r['paymentIntent']??'')) || in_array($a['state'],['expired','failed'],true)) { return self::review($a,'paid_after_terminal_or_invalid_transaction'); }
                $completed=$order->payment_complete($r['paymentIntent']??'');$persisted=new WC_Order($order->get_id());if(!$completed || !$persisted->get_date_paid() || (!$persisted->is_paid() && $persisted->get_status()!=='refunded')){throw new RuntimeException('Woo payment completion must be retried.');}$a['state']='paid';
                $promotion=$a['quote']['promotion'];if($promotion){Meister_Promotions_Store::put('attribution:'.$a['attemptId'],['orderId'=>$order->get_id(),'campaign'=>$promotion['campaign'],'influencer'=>$promotion['influencer'],'discount'=>$a['quote']['discount']]);}
            } elseif($state==='processing') {$a['state']='processing';}
            elseif(in_array($state,['expired','failed'],true)) {
                if($a['state']==='processing' && empty($r['terminalConfirmed'])){return ['state'=>'processing'];}
                self::$closing=true;try {$order->update_status($state==='failed'?'failed':'cancelled','Payment session confirmed terminal.');wc_release_coupons_for_order($order);wc_release_stock_for_order($order);}finally{self::$closing=false;}$a['state']=$state;
            } else {throw new InvalidArgumentException('Unknown payment event.');}
            Meister_Promotions_Store::put('attempt:'.$a['attemptId'],$a);return ['id'=>$order->get_id(),'number'=>$order->get_order_number(),'state'=>$a['state']];
            });
        });
    }
    private static function review(array $a,string $reason): array {
        if($a['state']!=='review'){$a['reviewFrom']=$a['state'];}$a['state']='review';$a['reviewReason']=$reason;Meister_Promotions_Store::put('attempt:'.$a['attemptId'],$a);return ['id'=>$a['orderId'],'number'=>$a['number'],'state'=>'review'];
    }
    public static function receipt(string $id,string $owner): array {
        $a=self::attempt($id);self::owned($a,$owner);$order=wc_get_order($a['orderId']);
        return $order && ($order->is_paid() || $order->get_date_paid())?['id'=>$order->get_id(),'number'=>$order->get_order_number(),'state'=>'paid']:['state'=>$a['state']];
    }
    public static function heartbeat(array $r=[]): array {
        global $wpdb;$wpdb->query($wpdb->prepare('DELETE FROM '.Meister_Promotions_Store::table().' WHERE expires>0 AND expires<%d LIMIT 1000',time()));foreach(array_slice($r['attemptIds']??[],0,50) as $id){if(preg_match('/^[a-f0-9]{64}$/',$id)){$wpdb->update(Meister_Promotions_Store::table(),['updated'=>time()],['entry_key'=>'attempt:'.$id],['%d'],['%s']);}}
        if(($r['healthy']??true)===true){update_option('meister_promotions_reconciled_at',time(),false);}return ['ok'=>true];
    }
    public static function pending(array $r=[]): array {
        global $wpdb;$values=$wpdb->get_col("SELECT payload FROM ".Meister_Promotions_Store::table()." WHERE entry_key LIKE 'attempt:%' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.state')) NOT IN ('paid','expired','failed') ORDER BY updated ASC LIMIT 50");$out=[];
        foreach($values as $json){$a=json_decode($json,true);if(!in_array($a['state'],['paid','expired','failed'],true)){$out[]=self::public_attempt($a);}}
        return $out;
    }
}
Meister_Promotions_Attempts::boot();
