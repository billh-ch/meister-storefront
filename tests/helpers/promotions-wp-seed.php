<?php
if(get_option('blogname')!=='Promotions-Test'){throw new RuntimeException('Disposable test site only.');}
Meister_Promotions_Store::install();
$products=[];foreach([['Test Suit','100'],['Test Fins','50'],['Test Accessory','10']] as [$name,$price]){$p=new WC_Product_Simple();$p->set_name($name);$p->set_regular_price($price);$p->set_virtual(true);$p->set_status('publish');$p->save();$products[]=$p->get_id();}
update_option('woocommerce_currency','EUR');update_option('woocommerce_calc_taxes','no');update_option('woocommerce_enable_coupons','yes');
update_option('meister_promotions_rules',['browser-pair'=>['id'=>'browser-pair','name'=>'Suit + fins','enabled'=>true,'requirements'=>[['productId'=>$products[0],'quantity'=>1],['productId'=>$products[1],'quantity'=>1]],'type'=>'percent','amount'=>'20','maxSets'=>0,'version'=>1]]);
foreach([['browser-save',30],['browser-small',10]] as [$code,$amount]){$c=new WC_Coupon($code);$c->set_code($code);$c->set_discount_type('percent');$c->set_amount($amount);$c->save();}
$key='ck_'.wc_rand_hash();$secret='cs_'.wc_rand_hash();global $wpdb;$wpdb->insert($wpdb->prefix.'woocommerce_api_keys',['user_id'=>1,'description'=>'Disposable promotions browser tests','permissions'=>'read_write','consumer_key'=>wc_api_hash($key),'consumer_secret'=>$secret,'truncated_key'=>substr($key,-7)]);
file_put_contents('/tmp/promotions-fixtures.json',wp_json_encode(['products'=>$products,'key'=>$key,'secret'=>$secret,'backendId'=>get_option('meister_promotions_backend_id')]));
chmod('/tmp/promotions-fixtures.json',0600);echo "Disposable browser fixtures created.\n";
