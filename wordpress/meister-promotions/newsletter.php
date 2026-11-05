<?php
if (!defined('ABSPATH')) { exit; }
final class Meister_Promotions_Newsletter {
    /** Trusted adapters/CLI only. A submitted browser email is not confirmation. */
    public static function issue(string $email,bool $confirmed): array {
        $email=strtolower(trim($email));
        if (!$confirmed || !is_email($email)) { throw new InvalidArgumentException('A confirmed newsletter subscription is required.'); }
        $identity=hash_hmac('sha256','newsletter-v1:'.$email,wp_salt('auth'));
        return Meister_Promotions_Store::locked('welcome:'.$identity,static function() use($identity,$email) {
            $key='welcome:'.$identity; $existing=Meister_Promotions_Store::get($key); if ($existing) { return $existing; }
            $template=get_option('meister_promotions_welcome',[]);
            if (empty($template['enabled']) || !in_array($template['type']??'',['percent','fixed_cart'],true) || (float)($template['amount']??0)<=0 || ($template['type']==='percent' && (float)$template['amount']>100)) { throw new RuntimeException('Welcome issuance is not configured.'); }
            // Stable private identifier also recovers a coupon save with a lost ledger acknowledgment.
            $code='welcome-'.substr($identity,0,28); $coupon=new WC_Coupon($code);
            if (!$coupon->get_id()) {
                $coupon->set_code($code);$coupon->set_discount_type($template['type']);$coupon->set_amount($template['amount']);$coupon->set_individual_use(true);$coupon->set_usage_limit(1);$coupon->set_usage_limit_per_user(1);$coupon->set_email_restrictions([$email]);
                if (!empty($template['days'])) { $coupon->set_date_expires(time()+DAY_IN_SECONDS*(int)$template['days']); }
                $coupon->update_meta_data('_meister_welcome_identity',$identity);$coupon->update_meta_data('_meister_campaign','newsletter-welcome');$coupon->save();
            } elseif (!hash_equals((string)$coupon->get_meta('_meister_welcome_identity'),$identity)) { throw new RuntimeException('Welcome issuance conflict.'); }
            $result=['code'=>$coupon->get_code(),'couponId'=>$coupon->get_id(),'issuedAt'=>$coupon->get_date_created()->getTimestamp()];
            Meister_Promotions_Store::put($key,$result); return $result;
        });
    }
}
