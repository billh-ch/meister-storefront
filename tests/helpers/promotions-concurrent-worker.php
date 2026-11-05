<?php
if(get_option('blogname')!=='Promotions-Test'){throw new RuntimeException('Test site only.');}
$fixture=json_decode(file_get_contents('/tmp/promotions-concurrent.json'),true);
try{$a=Meister_Promotions_Attempts::prepare($fixture['requests'][$args[0]]);echo wp_json_encode(['ok'=>true,'orderId'=>$a['orderId'],'attemptId'=>$a['attemptId']]);}catch(Throwable $e){echo wp_json_encode(['ok'=>false,'type'=>get_class($e)]);}
