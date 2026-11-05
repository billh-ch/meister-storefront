<?php
if(get_option('blogname')!=='Promotions-Test'){throw new RuntimeException('Test site only.');}
update_option('meister_promotions_rules',[]);update_option('woocommerce_calc_taxes','no');$items=[];$products=[];
for($i=0;$i<3;$i++){$p=new WC_Product_Simple();$p->set_name('Rounding fixture '.$i);$p->set_regular_price('0.05');$p->set_virtual(true);$p->set_status('publish');$p->save();$products[]=$p;$items[]=['productId'=>$p->get_id(),'quantity'=>1];}
$c=new WC_Coupon();$c->set_code('rounding-'.wp_generate_uuid4());$c->set_discount_type('percent');$c->set_amount(10);$c->save();
$q=Meister_Promotions_Cart::quote(['owner'=>'rounding-'.wp_generate_uuid4(),'email'=>'rounding@fixture.invalid','address'=>['country'=>'GR'],'items'=>$items,'coupon'=>$c->get_code()]);
if($q['discount']!==1){throw new RuntimeException('Native 10% rounding on three 5-cent lines should save 1 cent; got '.$q['discount']);}
foreach($products as $p){$p->delete(true);}$c->delete(true);echo "Woo native coupon remainder rounding preserved\n";
