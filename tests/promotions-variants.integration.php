<?php
if(get_option('blogname')!=='Promotions-Test'){throw new RuntimeException('Test site only.');}
function v_assert($a,$b,$label){if($a!==$b){throw new RuntimeException($label.': '.wp_json_encode($a));}}
$attributeId=wc_attribute_taxonomy_id_by_name('size');if(!$attributeId){$attributeId=wc_create_attribute(['name'=>'Size','slug'=>'size','type'=>'select']);}if(!taxonomy_exists('pa_size')){register_taxonomy('pa_size','product');}
$term=get_term_by('slug','39-40','pa_size');if(!$term){$id=wp_insert_term('39–40','pa_size',['slug'=>'39-40']);$term=get_term($id['term_id'],'pa_size');}
$size=new WC_Product_Attribute();$size->set_id($attributeId);$size->set_name('pa_size');$size->set_options([$term->term_id]);$size->set_variation(true);
$hardness=new WC_Product_Attribute();$hardness->set_name('Hardness');$hardness->set_options(['Soft','Medium']);$hardness->set_variation(true);
$p=new WC_Product_Variable();$p->set_name('Variation fixture');$p->set_status('publish');$p->set_attributes([$size,$hardness]);$p->save();wp_set_object_terms($p->get_id(),[$term->term_id],'pa_size');
$v=new WC_Product_Variation();$v->set_parent_id($p->get_id());$v->set_attributes(['pa_size'=>'39-40','hardness'=>'']);$v->set_regular_price('80');$v->set_virtual(true);$v->set_status('publish');$v->save();WC_Product_Variable::sync($p->get_id());wc_delete_product_transients($p->get_id());
update_option('meister_promotions_rules',[]);update_option('woocommerce_calc_taxes','no');
$q=Meister_Promotions_Cart::quote(['owner'=>'variants-'.wp_generate_uuid4(),'email'=>'variants@fixture.invalid','labels'=>[['name'=>'Τοπικοποιημένο προϊόν','attributes'=>['Μέγεθος'=>'39–40','Σκληρότητα'=>'Medium']]],'address'=>['country'=>'GR'],'items'=>[['productId'=>$p->get_id(),'variationId'=>$v->get_id(),'quantity'=>1,'attributes'=>['Size'=>'39–40','Hardness'=>'Medium']]]]);
v_assert($q['total'],8000,'taxonomy labels resolve to canonical variation slugs');v_assert($q['lines'][0]['attributes']['Σκληρότητα'],'Medium','Any-axis choice remains visible');
v_assert($q['lines'][0]['name'],'Τοπικοποιημένο προϊόν','validated storefront localization preserved without changing price');
$v->delete(true);$p->delete(true);echo "Woo variation/taxonomy/Any-axis integration passed\n";
