<?php
if (!defined('ABSPATH')) { exit; }
add_action('rest_api_init', static function() {
    $routes=['pending'=>[Meister_Promotions_Attempts::class,'pending'],'heartbeat'=>[Meister_Promotions_Attempts::class,'heartbeat'],'quote'=>[Meister_Promotions_Cart::class,'quote'],'prepare'=>[Meister_Promotions_Attempts::class,'prepare'],'bind'=>[Meister_Promotions_Attempts::class,'bind'],'event'=>[Meister_Promotions_Attempts::class,'event']];
    foreach ($routes as $name=>$callback) {
        register_rest_route('wc/v3','/meister-promotions/'.$name,['methods'=>'POST','permission_callback'=>static fn()=>current_user_can('manage_woocommerce'),'callback'=>static function(WP_REST_Request $request) use($callback) {
            if (strlen($request->get_body())>32768 || !is_array($request->get_json_params())) {return new WP_Error('meister_invalid','Please review your cart and details.',['status'=>400]);}
            try {if($callback[1]==='prepare'){ $h=Meister_Promotions_Attempts::health();if(!$h['activated'] || !$h['transactionalTables'] || !$h['couponReservations'] || !$h['stockReservations'] || $h['reconciledAt']<time()-900){throw new RuntimeException('Checkout activation checks incomplete.');}}$response=new WP_REST_Response(call_user_func($callback,$request->get_json_params()));$response->header('Cache-Control','private, no-store');return $response;}
            catch (InvalidArgumentException $e) {return new WP_Error('meister_invalid','Please review your cart and details.',['status'=>400]);}
            catch (Throwable $e) {return new WP_Error('meister_unavailable','Could not verify checkout. Please refresh and try again.',['status'=>503]);}
        }]);
    }
    register_rest_route('wc/v3','/meister-promotions/receipt',['methods'=>'POST','permission_callback'=>static fn()=>current_user_can('manage_woocommerce'),'callback'=>static function(WP_REST_Request $r) {
        try {$v=Meister_Promotions_Attempts::receipt((string)$r->get_param('attemptId'),(string)$r->get_param('owner'));$response=new WP_REST_Response($v);$response->header('Cache-Control','private, no-store');return $response;}
        catch(Throwable $e){return new WP_Error('meister_receipt','Order confirmation unavailable.',['status'=>404]);}
    }]);
    register_rest_route('wc/v3','/meister-promotions/health',['methods'=>'GET','permission_callback'=>static fn()=>current_user_can('manage_woocommerce'),'callback'=>static fn()=>new WP_REST_Response(['version'=>1,'backendId'=>get_option('meister_promotions_backend_id'),'health'=>Meister_Promotions_Attempts::health()],200,['Cache-Control'=>'private, no-store'])]);
});
