<?php
if (get_option('blogname')!=='Promotions-Test') {throw new RuntimeException('Test site only.');}
require_once '/code/wordpress/meister-promotions/meister-promotions.php';
function a_assert($a,$b,$name){if($a!==$b){throw new RuntimeException($name.': '.wp_json_encode($a).' != '.wp_json_encode($b));}}
Meister_Promotions_Store::install();update_option('meister_promotions_rules',[]);update_option('woocommerce_currency','EUR');update_option('woocommerce_calc_taxes','no');update_option('woocommerce_enable_coupons','yes');
$p=new WC_Product_Simple();$p->set_name('Attempt fixture');$p->set_regular_price('10');$p->set_virtual(true);$p->save();
$c=new WC_Coupon();$c->set_code('attempt-'.wp_generate_uuid4());$c->set_discount_type('percent');$c->set_amount(10);$c->set_usage_limit(1);$c->save();
$owner='owner-'.wp_generate_uuid4();$in=['owner'=>$owner,'email'=>'attempt@example.invalid','items'=>[['productId'=>$p->get_id(),'quantity'=>1]],'address'=>['country'=>'GR','city'=>'Athens','address_1'=>'Fixture','postcode'=>'10000'],'coupon'=>$c->get_code()];
$q=Meister_Promotions_Cart::quote($in);$request=['owner'=>$owner,'reference'=>$q['reference'],'attemptKey'=>wp_generate_uuid4(),'address'=>['first_name'=>'TEST','last_name'=>'DO NOT FULFIL','country'=>'GR','city'=>'Athens','address_1'=>'Fixture','postcode'=>'10000'],'origin'=>'https://preview.example.invalid','mode'=>'test'];
$a=Meister_Promotions_Attempts::prepare($request);
a_assert($a['quote']['total'],900,'pending discount preserved');a_assert(Meister_Promotions_Attempts::prepare($request)['orderId'],$a['orderId'],'prepare retry same order');
$q2=Meister_Promotions_Cart::quote(array_merge($in,['owner'=>'other-'.wp_generate_uuid4()]));a_assert($q2['coupon']['status'],'invalid','native checkout sees reserved last use');
Meister_Promotions_Attempts::bind(['attemptId'=>$a['attemptId'],'owner'=>$owner,'sessionId'=>'cs_test_fixture','expiresAt'=>time()+1800]);
$event=['attemptId'=>$a['attemptId'],'sessionId'=>'cs_test_fixture','amount'=>900,'currency'=>'eur','paymentStatus'=>'paid','paymentIntent'=>'pi_fixture','state'=>'paid','mode'=>'test'];
$r=Meister_Promotions_Attempts::event($event);a_assert($r['id'],$a['orderId'],'event completes existing order');
a_assert(Meister_Promotions_Attempts::event($event)['id'],$r['id'],'duplicate event same receipt');
$c=new WC_Coupon($c->get_id());a_assert($c->get_usage_count(),1,'coupon used exactly once');
Meister_Promotions_Attempts::event(array_merge($event,['state'=>'expired','paymentStatus'=>'unpaid']));a_assert(wc_get_order($r['id'])->is_paid(),true,'late expiry cannot cancel paid order');
try {Meister_Promotions_Attempts::receipt($a['attemptId'],'stranger-'.wp_generate_uuid4());throw new RuntimeException('wrong owner accepted');}catch(InvalidArgumentException $e){}
$p->delete(true);$c->delete(true);echo "Woo attempts integration: 8 assertions passed\n";
