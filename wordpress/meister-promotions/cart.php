<?php
if (!defined('ABSPATH')) { exit; }
final class Meister_Promotions_Cart {
    private static string $internal_code='';
    private static array $internal_allocations=[];
    public static function boot(): void {
        add_filter('woocommerce_get_shop_coupon_data',static function($data,$code) { return self::$internal_code && $code===self::$internal_code ? ['discount_type'=>'fixed_product','amount'=>0,'individual_use'=>true] : $data; },10,2);
    }
    public static function discount_amount($discount,$amount,$item,$single,$coupon) {
        return self::$internal_code && $coupon->get_code()===self::$internal_code ? (self::$internal_allocations[$item['key']] ?? 0)/100 : $discount;
    }
    public static function quote(array $input): array {
        $result=self::evaluate($input,static fn($q)=>$q);
        $reference=wp_generate_uuid4();$expires=time()+300;
        $result['reference']=$reference;$result['expiresAt']=$expires;
        Meister_Promotions_Store::put('quote:'.$reference,['owner'=>Meister_Promotions_Store::owner($input['owner']),'input'=>$input,'quote'=>$result],$expires);
        return $result;
    }
    public static function stored_quote(array $r): array {
        $stored=Meister_Promotions_Store::get('quote:'.($r['reference']??''));if(!$stored || !hash_equals($stored['owner'],Meister_Promotions_Store::owner($r['owner']??''))){throw new InvalidArgumentException('Quote expired.');}return $stored['quote'];
    }
    public static function validate(array $input): array {
        Meister_Promotions_Store::owner($input['owner']??'');
        $items=$input['items']??[];
        if (!is_array($items) || !count($items) || count($items)>50) { throw new InvalidArgumentException('Please review your cart.'); }
        foreach ($items as $item) {
            if (!is_int($item['productId']??null) || $item['productId']<=0 || !is_int($item['quantity']??null) || $item['quantity']<1 || $item['quantity']>99 || (!empty($item['variationId']) && (!is_int($item['variationId']) || $item['variationId']<=0))) { throw new InvalidArgumentException('Invalid cart item.'); }
            $attrs=$item['attributes']??[];if (!is_array($attrs) || count($attrs)>12) { throw new InvalidArgumentException('Invalid product choices.'); }
            foreach ($attrs as $k=>$v) { if (!is_string($k) || !is_string($v) || strlen($k)>120 || strlen($v)>120) { throw new InvalidArgumentException('Invalid product choices.'); } }
        }
        if (get_woocommerce_currency()!=='EUR' || wc_get_price_decimals()!==2) { throw new RuntimeException('This checkout requires EUR with two decimals.'); }
        $coupon=$input['coupon']??'';
        if (!is_string($coupon) || strlen($coupon)>100 || preg_match('/[\x00-\x1f\x7f]/',$coupon) || str_starts_with(strtolower($coupon),'meister-internal-')) { throw new InvalidArgumentException('Invalid coupon code.'); }
        if (!empty($input['email']) && !is_email($input['email'])) { throw new InvalidArgumentException('Please check your email address.'); }
        return $input;
    }
    public static function evaluate(array $input,callable $callback) {
        self::validate($input);
        $base=self::scenario($input,null,'',static fn($q)=>$q);$best=$base;$selected=null;$selectedCode='';
        foreach (get_option('meister_promotions_rules',[]) as $rule) {
            if (empty($rule['enabled']) || (!empty($rule['starts']) && new DateTimeImmutable($rule['starts'],wp_timezone())>new DateTimeImmutable('now',wp_timezone())) || (!empty($rule['ends']) && new DateTimeImmutable($rule['ends'],wp_timezone())<=new DateTimeImmutable('now',wp_timezone()))) { continue; }
            $match=Meister_Promotions_Engine::bundle_sets($base['lines'],$rule); if (!$match['sets']) { continue; }
            $candidate=self::scenario($input,$rule,'',static fn($q)=>$q);
            if ($candidate['total']<$best['total']) { $best=$candidate;$selected=$rule; }
        }
        $code=wc_format_coupon_code(trim($input['coupon']??''));$status=$code?'invalid':'none';
        if ($code) {
            $coupon=new WC_Coupon($code);
            if ($coupon->get_id() && !$coupon->get_free_shipping() && $coupon->get_email_restrictions() && empty($input['email'])) { $status='email_required'; }
            elseif ($coupon->get_id() && !$coupon->get_free_shipping()) {
                try {
                    $candidate=self::scenario($input,null,$code,static fn($q)=>$q);
                    if ($candidate['total']<$best['total']) { $best=$candidate;$selected=null;$selectedCode=$code;$status='applied'; }
                    else { $status='not_better'; }
                } catch (Meister_Promotions_Coupon_Error $e) { $status='invalid'; }
            }
        }
        return self::scenario($input,$selected,$selectedCode,static function($q,$cart) use($callback,$code,$status) {
            $q['coupon']=['code'=>$code,'status'=>$status];return $callback($q,$cart);
        });
    }
    private static function scenario(array $input,?array $rule,string $code,callable $callback) {
        $old=[WC()->session,WC()->customer,WC()->cart];$oldUser=get_current_user_id();
        try {
            $customerId=absint($input['customerId']??0);if ($customerId && !get_user_by('id',$customerId)) { throw new InvalidArgumentException('Invalid customer.'); }
            wp_set_current_user($customerId);
            WC()->session=new class extends WC_Session { public function __construct() {$this->_customer_id='meister-'.wp_generate_uuid4();} public function has_session(){return false;} public function set_customer_session_cookie($set){} public function save_data(){} };
            WC()->customer=new WC_Customer($customerId);
            $address=$input['address']??[];$email=strtolower(trim($input['email']??''));
            if ($email) { WC()->customer->set_billing_email($email); }
            foreach (['country','state','city','postcode','address_1','address_2'] as $key) { $value=sanitize_text_field($address[$key]??($key==='country'?'GR':''));WC()->customer->{'set_shipping_'.$key}($value);WC()->customer->{'set_billing_'.$key}($value); }
            WC()->customer->set_calculated_shipping(true);
            WC()->shipping()->reset_shipping();WC()->cart=new WC_Cart();$cart=WC()->cart;
            foreach ($input['items'] as $i=>$item) {
                $product=wc_get_product($item['productId']); if (!$product || !$product->is_purchasable()) { throw new RuntimeException('A product is unavailable. Please review your cart.'); }
                $attributes=self::variation_attributes($product,$item['attributes']??[]);
                $variationId=$item['variationId']??0;
                if ($product->is_type('variable') && !$variationId) { $variationId=WC_Data_Store::load('product')->find_matching_product_variation($product,$attributes); }
                if ($product->is_type('variable') && !$variationId) { throw new RuntimeException('Please choose valid product options.'); }
                if ($variationId) { $variation=wc_get_product($variationId);if (!$variation || $variation->get_parent_id()!==$product->get_id()) { throw new InvalidArgumentException('Invalid product variation.'); }$attributes=array_replace($variation->get_variation_attributes(),$attributes); }
                $key=$cart->add_to_cart($product->get_id(),$item['quantity'],$variationId,$attributes,['meister_line'=>(string)$i,'meister_display'=>$input['labels'][$i]??null]);
                if (!$key) { throw new RuntimeException('A product is unavailable. Please review your cart.'); }
            }
            $cart->calculate_totals();
            if ($cart->get_fees()) { throw new RuntimeException('Additional fee pricing needs compatibility review before this checkout can be enabled.'); }
            $promotion=null;
            if ($rule) {
                $lines=self::export_lines($cart);$match=Meister_Promotions_Engine::bundle_sets($lines,$rule);$weights=[];
                foreach ($cart->get_cart() as $key=>$line) { $n=$match['quantities'][$key]??0;if ($n) {$weights[$key]=(int)round((float)$line['data']->get_price()*100*$n);} }
                $saving=$rule['type']==='percent'?(int)round(array_sum($weights)*(float)$rule['amount']/100):(int)round((float)$rule['amount']*100*$match['sets']);
                add_filter('woocommerce_coupon_get_discount_amount',[self::class,'discount_amount'],999,5);
                self::$internal_code='meister-internal-'.wp_generate_uuid4();self::$internal_allocations=Meister_Promotions_Engine::allocate($saving,$weights);
                $cart->apply_coupon(self::$internal_code);
                $promotion=['type'=>'bundle','id'=>$rule['id'],'label'=>$rule['name'],'version'=>(string)$rule['version'],'campaign'=>'bundle:'.$rule['id'],'influencer'=>''];
            } elseif ($code) {
                if (!$cart->apply_coupon($code)) { throw new Meister_Promotions_Coupon_Error('Coupon unavailable.'); }
                $coupon=new WC_Coupon($code);$promotion=['type'=>'coupon','id'=>(string)$coupon->get_id(),'code'=>$code,'label'=>$code,'version'=>(string)($coupon->get_date_modified()?->getTimestamp()??0),'campaign'=>(string)$coupon->get_meta('_meister_campaign'),'influencer'=>(string)$coupon->get_meta('_meister_influencer')];
            }
            $cart->calculate_totals();$packages=WC()->shipping()->get_packages();$methods=[];
            if (count($packages)>1) { throw new RuntimeException('Multiple shipping packages need compatibility review.'); }
            foreach (($packages[0]['rates']??[]) as $id=>$rate) { $methods[]=['id'=>(string)$id,'wcMethodId'=>$rate->get_method_id(),'title'=>wp_strip_all_tags($rate->get_label()),'cost'=>(int)round(((float)$rate->get_cost()+array_sum($rate->get_taxes()))*100),'isPickup'=>$rate->get_method_id()==='local_pickup']; }
            $shippingId=$input['shippingId']??'';
            if ($methods) {
                if (!$shippingId) { $courier=array_values(array_filter($methods,static fn($m)=>!$m['isPickup']));$shippingId=($courier[0]??$methods[0])['id']; }
                if (!in_array($shippingId,array_column($methods,'id'),true)) { throw new RuntimeException('Please choose an available delivery method.'); }
                WC()->session->set('chosen_shipping_methods',[$shippingId]);$cart->calculate_totals();
            } elseif ($cart->needs_shipping()) { throw new RuntimeException('No delivery methods are available for this address.'); }
            $lines=self::export_lines($cart);$total=(int)round((float)$cart->get_total('edit')*100);$shipping=(int)round(((float)$cart->get_shipping_total()+(float)$cart->get_shipping_tax())*100);
            $merchandise=$total-$shipping;$weights=array_column($lines,'total','key');$allocated=Meister_Promotions_Engine::allocate($merchandise,$weights);
            $difference=$merchandise-array_sum($allocated);
            if ($difference && $lines) { $allocated[$lines[0]['key']]+=$difference; }
            foreach ($lines as &$line) {$line['total']=$allocated[$line['key']];}unset($line);
            $subtotal=(int)round(((float)$cart->get_subtotal()+(float)$cart->get_subtotal_tax())*100);
            $q=['version'=>1,'currency'=>'EUR','minorUnit'=>2,'backendId'=>get_option('meister_promotions_backend_id'),'subtotal'=>$subtotal,'discount'=>$subtotal-$merchandise,'shipping'=>$shipping,'total'=>$total,'tax'=>(int)round((float)$cart->get_total_tax()*100),'lines'=>$lines,'methods'=>$methods,'shippingId'=>$shippingId,'promotion'=>$promotion,'provisional'=>empty($input['email'])];
            return $callback($q,$cart);
        } finally { remove_filter('woocommerce_coupon_get_discount_amount',[self::class,'discount_amount'],999);self::$internal_code='';self::$internal_allocations=[];if(WC()->session){wc_clear_notices();}[WC()->session,WC()->customer,WC()->cart]=$old;wp_set_current_user($oldUser); }
    }
    private static function variation_attributes(WC_Product $product,array $provided): array {
        $out=[];
        foreach($provided as $name=>$value){
            $name=preg_replace('/^attribute_/','',$name);$matched=false;
            foreach($product->get_attributes() as $attribute){
                if(!$attribute->get_variation()){continue;}$raw=$attribute->get_name();$label=wc_attribute_label($raw,$product);
                if(!in_array(sanitize_title($name),[sanitize_title($raw),sanitize_title($label)],true)){continue;}
                if($attribute->is_taxonomy()){
                    $term=get_term_by('slug',sanitize_title($value),$raw)?:get_term_by('name',$value,$raw);
                    if(!$term || !in_array((int)$term->term_id,array_map('intval',$attribute->get_options()),true)){throw new InvalidArgumentException('Invalid product option.');}$value=$term->slug;
                }else{
                    $options=array_values(array_filter($attribute->get_options(),static fn($option)=>sanitize_title($option)===sanitize_title($value)));
                    if(!$options){throw new InvalidArgumentException('Invalid product option.');}$value=$options[0];
                }
                $out['attribute_'.sanitize_title($raw)]=$value;$matched=true;break;
            }
            if(!$matched){throw new InvalidArgumentException('Unknown product option.');}
        }
        return $out;
    }
    private static function export_lines(WC_Cart $cart): array {
        $lines=[];
        foreach($cart->get_cart() as $key=>$l){
            $parent=wc_get_product($l['product_id']);$attributes=[];
            foreach($l['variation'] as $raw=>$value){if($value===''){continue;}$raw=preg_replace('/^attribute_/','',$raw);$term=taxonomy_exists($raw)?get_term_by('slug',$value,$raw):false;$attributes[wc_attribute_label($raw,$parent)]=$term?$term->name:$value;}
            $display=$l['meister_display']??null;if(is_array($display) && is_array($display['attributes']??null)){$attributes=$display['attributes'];}
            $name=is_array($display) && is_string($display['name']??null)?$display['name']:$parent->get_name();
            $lines[]=['key'=>$key,'productId'=>(int)$l['product_id'],'variationId'=>(int)$l['variation_id'],'quantity'=>(int)$l['quantity'],'name'=>wp_strip_all_tags($name),'attributes'=>$attributes,'subtotal'=>(int)round(((float)$l['line_subtotal']+(float)$l['line_subtotal_tax'])*100),'total'=>(int)round(((float)$l['line_total']+(float)$l['line_tax'])*100)];
        }
        return $lines;
    }
}
final class Meister_Promotions_Coupon_Error extends RuntimeException {}
Meister_Promotions_Cart::boot();
