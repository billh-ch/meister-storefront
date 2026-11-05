<?php
// Run only in the disposable local Woo instance, never against owner catalog.
if (get_option('blogname') !== 'Promotions-Test') { throw new RuntimeException('Refusing integration fixtures on a non-test site.'); }
require_once '/code/wordpress/meister-promotions/meister-promotions.php';
function p_assert($actual,$expected,$name) { if ($actual !== $expected) { throw new RuntimeException($name.': '.wp_json_encode($actual).' != '.wp_json_encode($expected)); } }
function p_product($name,$price) { $p=new WC_Product_Simple(); $p->set_name($name);$p->set_regular_price($price);$p->set_status('publish');$p->set_virtual(true);$p->save();return $p; }
update_option('woocommerce_currency','EUR'); update_option('woocommerce_calc_taxes','no'); update_option('woocommerce_enable_coupons','yes');
Meister_Promotions_Store::install();
$a=p_product('Suit','100');$b=p_product('Fins','50');$c=p_product('Unrelated','10');
$rule=['id'=>'test-pair','name'=>'Suit + fins','enabled'=>true,'requirements'=>[['productId'=>$a->get_id(),'quantity'=>1],['productId'=>$b->get_id(),'quantity'=>1]],'type'=>'percent','amount'=>'20','maxSets'=>0,'version'=>1];
update_option('meister_promotions_rules',['test-pair'=>$rule]);
$coupon=new WC_Coupon();$coupon->set_code('test-'.wp_generate_uuid4());$coupon->set_discount_type('percent');$coupon->set_amount(10);$coupon->set_usage_limit(1);$coupon->save();
$input=['owner'=>'test-owner-'.wp_generate_uuid4(),'items'=>[['productId'=>$a->get_id(),'quantity'=>1],['productId'=>$b->get_id(),'quantity'=>1],['productId'=>$c->get_id(),'quantity'=>1]],'email'=>'test@example.invalid','address'=>['country'=>'GR'],'coupon'=>$coupon->get_code()];
$previousSession=WC()->session;WC()->session=null;
$q=Meister_Promotions_Cart::quote($input);
p_assert(WC()->session,null,'REST quote restores an absent native Woo session');WC()->session=$previousSession;
p_assert($q['subtotal'],16000,'canonical subtotal');p_assert($q['discount'],3000,'only matching set discounted');p_assert($q['total'],13000,'bundle wins');p_assert($q['promotion']['type'],'bundle','no stacking');p_assert($q['coupon']['status'],'not_better','code not redeemed');
$coupon->set_amount(30);$coupon->save();$q=Meister_Promotions_Cart::quote($input);
p_assert($q['total'],11200,'better native coupon wins');p_assert($q['promotion']['type'],'coupon','coupon applied alone');p_assert($coupon->get_usage_count(),0,'quotes do not consume coupon');
$coupon->set_email_restrictions(['different@example.invalid']);$coupon->save();$q=Meister_Promotions_Cart::quote($input);
p_assert($q['coupon']['status'],'invalid','wrong email rejected');p_assert($q['total'],13000,'valid bundle remains');
update_option('meister_promotions_welcome',['enabled'=>true,'type'=>'percent','amount'=>'15','days'=>30]);
$welcome=Meister_Promotions_Newsletter::issue('new@example.invalid',true);
$again=Meister_Promotions_Newsletter::issue(' NEW@example.invalid ',true);
p_assert($again['code'],$welcome['code'],'confirmed signup retry returns original code');
$wc=new WC_Coupon($welcome['code']);p_assert($wc->get_usage_limit(),1,'one use');p_assert($wc->get_email_restrictions(),['new@example.invalid'],'email bound');
try { Meister_Promotions_Newsletter::issue('unknown@example.invalid',false);throw new RuntimeException('unconfirmed issued'); } catch (InvalidArgumentException $e) {}

$interruptedEmail='interrupted-'.wp_generate_uuid4().'@example.invalid';$broken=static function(){throw new RuntimeException('Injected interrupted coupon post save');};add_action('save_post_shop_coupon',$broken);
$interrupted=false;try{Meister_Promotions_Newsletter::issue($interruptedEmail,true);}catch(Throwable $e){$interrupted=true;}remove_action('save_post_shop_coupon',$broken);p_assert($interrupted,true,'fault injection reaches coupon post write');
$recovered=Meister_Promotions_Newsletter::issue($interruptedEmail,true);$rc=new WC_Coupon($recovered['code']);p_assert($rc->get_email_restrictions(),[$interruptedEmail],'interrupted issuance retries without partial coupon');
update_option('meister_promotions_rules',[]);
$coupon->delete(true);foreach ([$a,$b,$c] as $p) {$p->delete(true);}
echo "Woo promotion integration assertions passed\n";
