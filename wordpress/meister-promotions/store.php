<?php
if (!defined('ABSPATH')) { exit; }
final class Meister_Promotions_Store {
    public static function table(): string { global $wpdb; return $wpdb->prefix.'meister_promotions'; }
    public static function install(): void {
        global $wpdb; require_once ABSPATH.'wp-admin/includes/upgrade.php';
        dbDelta('CREATE TABLE '.self::table()." (entry_key varchar(191) NOT NULL, payload longtext NOT NULL, expires bigint unsigned NOT NULL DEFAULT 0, updated bigint unsigned NOT NULL, PRIMARY KEY (entry_key), KEY expires (expires)) ".$wpdb->get_charset_collate().';');
        if (!get_option('meister_promotions_backend_id')) { add_option('meister_promotions_backend_id',wp_generate_uuid4(),'','no'); }
    }
    public static function get(string $key): ?array {
        global $wpdb; $row=$wpdb->get_row($wpdb->prepare('SELECT payload,expires FROM '.self::table().' WHERE entry_key=%s',$key),ARRAY_A);
        if (!$row || ($row['expires'] && (int)$row['expires']<time())) { return null; }
        $v=json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR); return is_array($v)?$v:null;
    }
    public static function put(string $key,array $value,int $expires=0): void {
        global $wpdb;
        if (false===$wpdb->replace(self::table(),['entry_key'=>$key,'payload'=>wp_json_encode($value,JSON_THROW_ON_ERROR),'expires'=>$expires,'updated'=>time()],['%s','%s','%d','%d'])) { throw new RuntimeException('Promotion state could not be saved.'); }
    }
    public static function locked(string $scope,callable $fn) {
        global $wpdb; $name='meister:'.substr(hash('sha256',self::table().$scope),0,48);
        if ((int)$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s,5)',$name))!==1) { throw new RuntimeException('Promotion processing is busy. Please retry.'); }
        try { return $fn(); } finally { $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)',$name)); }
    }
    public static function owner(string $owner): string {
        if (!preg_match('/^[a-zA-Z0-9_-]{16,100}$/',$owner)) { throw new InvalidArgumentException('Invalid checkout owner.'); }
        return hash_hmac('sha256',$owner,wp_salt('auth'));
    }
    public static function report(): array {
        global $wpdb;
        $values=$wpdb->get_col("SELECT payload FROM ".self::table()." WHERE entry_key LIKE 'attribution:%'"); $groups=[];
        foreach ($values as $json) {
            $r=json_decode($json,true); $order=wc_get_order($r['orderId']); if (!$order || !$order->get_date_paid()) { continue; }
            $key=$r['campaign'].':'.$r['influencer'];
            if (!isset($groups[$key])) { $groups[$key]=['campaign'=>$r['campaign'],'influencer'=>$r['influencer'],'orders'=>0,'net'=>0,'discount'=>0]; }
            $net=0; foreach ($order->get_items() as $item) { $net+=(float)$item->get_total()+(float)$item->get_total_tax(); }
            foreach ($order->get_refunds() as $refund) { foreach ($refund->get_items() as $item) { $net+=(float)$item->get_total()+(float)$item->get_total_tax(); } }
            $groups[$key]['orders']++;$groups[$key]['net']+=max(0,(int)round($net*100));$groups[$key]['discount']+=$r['discount'];
        }
        return array_values($groups);
    }
}
