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
$nextQuote=Meister_Promotions_Cart::quote(array_merge($in,['coupon'=>'']));
$next=Meister_Promotions_Attempts::prepare(array_merge($request,['reference'=>$nextQuote['reference'],'attemptKey'=>wp_generate_uuid4()]));
a_assert($next['orderId']!==$a['orderId'],true,'a paid attempt cannot trap a subsequent purchase');

Meister_Promotions_Attempts::bind(['attemptId'=>$next['attemptId'],'owner'=>$owner,'sessionId'=>'cs_test_failure']);
$failEvent=['attemptId'=>$next['attemptId'],'sessionId'=>'cs_test_failure','amount'=>1000,'currency'=>'eur','paymentStatus'=>'paid','paymentIntent'=>'pi_failure','state'=>'paid','mode'=>'test'];
$injected=static function(){throw new RuntimeException('Injected payment completion failure');};add_action('woocommerce_pre_payment_complete',$injected);
$threw=false;try{Meister_Promotions_Attempts::event($failEvent);}catch(Throwable $e){$threw=true;}remove_action('woocommerce_pre_payment_complete',$injected);
a_assert($threw,true,'payment_complete false remains retryable');a_assert(Meister_Promotions_Store::get('attempt:'.$next['attemptId'])['state'],'open','completion failure cannot mark ledger paid');
$review=Meister_Promotions_Attempts::event(array_merge($failEvent,['amount'=>999]));a_assert($review['state'],'review','mismatch persists operational review');a_assert(Meister_Promotions_Store::get('attempt:'.$next['attemptId'])['state'],'review','review survives transaction boundary');

$terminalOwner='terminal-'.wp_generate_uuid4();$terminalInput=array_merge($in,['owner'=>$terminalOwner,'coupon'=>'']);$tq=Meister_Promotions_Cart::quote($terminalInput);$ta=Meister_Promotions_Attempts::prepare(array_merge($request,['owner'=>$terminalOwner,'reference'=>$tq['reference'],'attemptKey'=>wp_generate_uuid4()]));Meister_Promotions_Attempts::bind(['attemptId'=>$ta['attemptId'],'owner'=>$terminalOwner,'sessionId'=>'cs_test_terminal']);
$tf=['attemptId'=>$ta['attemptId'],'sessionId'=>'cs_test_terminal','amount'=>1000,'currency'=>'eur','paymentStatus'=>'unpaid','paymentIntent'=>'pi_terminal','state'=>'failed','mode'=>'test','terminalConfirmed'=>true];Meister_Promotions_Attempts::event($tf);
$late=Meister_Promotions_Attempts::event(array_merge($tf,['state'=>'processing']));a_assert($late['state'],'failed','late unpaid completion cannot resurrect failed attempt');
$latePaid=Meister_Promotions_Attempts::event(array_merge($tf,['state'=>'paid','paymentStatus'=>'paid']));a_assert($latePaid['state'],'review','paid after capacity release requires review');a_assert(Meister_Promotions_Store::get('attempt:'.$ta['attemptId'])['state'],'review','late paid review durable');

$zero=new WC_Product_Simple();$zero->set_name('Zero fixture');$zero->set_regular_price('0');$zero->set_virtual(true);$zero->set_status('publish');$zero->save();$zeroOwner='zero-'.wp_generate_uuid4();$zq=Meister_Promotions_Cart::quote(['owner'=>$zeroOwner,'email'=>'zero@fixture.invalid','address'=>['country'=>'GR'],'items'=>[['productId'=>$zero->get_id(),'quantity'=>1]]]);$za=Meister_Promotions_Attempts::prepare(['owner'=>$zeroOwner,'reference'=>$zq['reference'],'attemptKey'=>wp_generate_uuid4(),'address'=>['country'=>'GR'],'origin'=>'https://zero.fixture.invalid','mode'=>'test']);
Meister_Promotions_Attempts::event(['attemptId'=>$za['attemptId'],'sessionId'=>'zero_'.$za['attemptId'],'amount'=>0,'currency'=>'eur','paymentStatus'=>'no_payment_required','paymentIntent'=>'','state'=>'paid','mode'=>'test']);$zo=wc_get_order($za['orderId']);a_assert($zo->get_payment_method_title(),'No payment required','zero order does not claim a Stripe charge');a_assert($zo->get_transaction_id(),'','zero order has no invented transaction');a_assert((bool)$zo->get_date_paid(),true,'zero order reaches paid fulfillment state');$zero->delete(true);
$p->delete(true);$c->delete(true);echo "Woo attempt lifecycle integration assertions passed\n";
