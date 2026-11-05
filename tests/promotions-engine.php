<?php
require __DIR__ . '/../wordpress/meister-promotions/engine.php';
function expect($actual, $expected, $name) { if ($actual !== $expected) { throw new RuntimeException($name . ': ' . json_encode($actual) . ' != ' . json_encode($expected)); } }
$lines = [ ['key'=>'small','productId'=>10,'variationId'=>11,'quantity'=>2], ['key'=>'large','productId'=>10,'variationId'=>12,'quantity'=>3], ['key'=>'fin','productId'=>20,'variationId'=>0,'quantity'=>3] ];
$rule = ['requirements'=>[['productId'=>10,'quantity'=>1],['productId'=>10,'variationId'=>11,'quantity'=>1],['productId'=>20,'quantity'=>1]],'maxSets'=>0];
expect(Meister_Promotions_Engine::bundle_sets($lines,$rule), ['sets'=>2,'quantities'=>['small'=>2,'large'=>2,'fin'=>2]], 'specific variation allocated before parent without double counting');
$rule['maxSets']=1;
expect(Meister_Promotions_Engine::bundle_sets($lines,$rule)['sets'],1,'merchant set cap');
$rule['requirements'][1]['variationId']=99;
expect(Meister_Promotions_Engine::bundle_sets($lines,$rule)['sets'],0,'wrong variation cannot qualify');
expect(Meister_Promotions_Engine::bundle_sets([['key'=>'one','productId'=>10,'quantity'=>1]], ['requirements'=>[['productId'=>10,'quantity'=>1],['productId'=>10,'variationId'=>11,'quantity'=>1]]])['sets'],0,'one unit cannot satisfy two requirements');
expect(Meister_Promotions_Engine::allocate(5,['a'=>101,'b'=>100,'c'=>100]),['a'=>2,'b'=>2,'c'=>1],'odd cents deterministic allocation');
expect(Meister_Promotions_Engine::allocate(999,['a'=>10,'b'=>20]),['a'=>10,'b'=>20],'saving capped at merchandise');
expect(Meister_Promotions_Engine::allocate(0,['a'=>0]),['a'=>0],'zero base');
foreach ([['requirements'=>[]], ['requirements'=>[['productId'=>1,'quantity'=>0],['productId'=>2,'quantity'=>1]]], ['requirements'=>[['productId'=>1,'quantity'=>1],['productId'=>1,'quantity'=>1]]]] as $invalid) {
  try { Meister_Promotions_Engine::validate_rule($invalid); throw new RuntimeException('invalid rule accepted'); } catch (InvalidArgumentException $e) {}
}
echo "Promotion engine: 10 assertions passed\n";
