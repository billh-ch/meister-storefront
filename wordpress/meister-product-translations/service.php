<?php
/** Woo CRUD boundary. Never modifies original product fields. */
final class MT_Service {
    public static function access(int $id = 0, bool $publish = false): void {
        if (!current_user_can('manage_woocommerce') || ($id && !current_user_can('edit_post', $id)) || ($publish && !current_user_can('publish_products'))) throw new InvalidArgumentException('Insufficient product translation permissions');
    }
    public static function product(int $id) {
        self::access($id);
        $product = wc_get_product($id);
        if (!$product || $product->is_type('variation')) throw new InvalidArgumentException('Unknown product or variation ID: ' . $id);
        return $product;
    }
    public static function source($product): array {
        return ['name'=>(string)$product->get_name('edit'), 'short_description'=>(string)$product->get_short_description('edit'), 'description'=>(string)$product->get_description('edit')];
    }
    public static function metadata($product): array {
        $meta = $product->get_meta('meister_translations', true, 'edit');
        if ($meta === '' || $meta === null) return ['version'=>1];
        if (!is_array($meta) || ($meta['version'] ?? null) !== 1) throw new InvalidArgumentException('Existing translation metadata is malformed or unknown version');
        return $meta;
    }
    public static function export(array $ids, string $locale): array {
        self::access(); MT_Core::locale($locale);
        if (!array_is_list($ids) || count($ids)<1 || count($ids)>MT_Core::MAX_ROWS || count(array_unique($ids))!==count($ids)) throw new InvalidArgumentException('Select 1..50 unique IDs');
        $rows = [];
        foreach ($ids as $id) {
            if (!is_int($id) || $id < 1) throw new InvalidArgumentException('IDs must be positive integers');
            $product = self::product($id); $source = self::source($product);
            $rows[] = ['id'=>$id,'source_hash'=>MT_Core::hash($source),'source'=>$source,'translation'=>array_fill_keys(MT_Core::FIELDS, '')];
        }
        return MT_Core::job(['version'=>1,'locale'=>$locale,'products'=>$rows]);
    }
    public static function options(array $options): array {
        if (array_diff(array_keys($options), ['apply','publish','overwrite'])) throw new InvalidArgumentException('Unknown import option');
        foreach ($options as $value) if (!is_bool($value)) throw new InvalidArgumentException('Options must be boolean');
        return array_replace(['apply'=>false,'publish'=>false,'overwrite'=>false], $options);
    }
    public static function import(array $job, array $options = []): array {
        $job = MT_Core::job($job); $options = self::options($options);
        self::access(0, $options['publish']);
        $locks = []; $plans = []; $results = [];
        try {
            // All mutations through this plugin serialize per product. Crash locks fail closed.
            foreach ($job['products'] as $row) {
                self::access($row['id'], $options['publish']);
                if ($options['apply']) {
                    $key = 'meister_translation_lock_' . $row['id'];
                    if (!add_option($key, time(), '', false)) throw new InvalidArgumentException('Product translation operation in progress: '.$row['id']);
                    $locks[] = $key;
                }
            }
            foreach ($job['products'] as $row) {
                $product = self::product($row['id']);
                if (!hash_equals(MT_Core::hash(self::source($product)), $row['source_hash'])) throw new InvalidArgumentException('Source changed: '.$row['id']);
                $meta = self::metadata($product);
                $entry = ['status'=>$options['publish'] ? 'published' : 'draft', 'source_hash'=>$row['source_hash']];
                foreach ($row['translation'] as $key=>$text) $entry[$key] = $key==='name' ? wp_strip_all_tags($text) : wp_kses_post($text);
                $old = $meta[$job['locale']] ?? null;
                $same = is_array($old) && $old == $entry;
                if (!$same && array_key_exists($job['locale'], $meta) && !$options['overwrite']) throw new InvalidArgumentException('Existing translation protected: '.$row['id']);
                $original_meta = $meta;
                $meta[$job['locale']] = $entry;
                $plans[] = [$product, $meta, $same, $original_meta, $row['source_hash']];
                $results[] = ['id'=>$row['id'],'action'=>$same ? 'unchanged' : ($options['apply'] ? 'saved' : 'would_save'),'status'=>$entry['status']];
            }
            // Full validation completes before the first write. DB failures can still partially apply;
            // rerun safely after addressing the failure (no fabricated transaction guarantee).
            if ($options['apply']) foreach ($plans as [$product, $meta, $same, $original_meta, $source_hash]) if (!$same) {
                $product = self::product($product->get_id());
                if (!hash_equals($source_hash, MT_Core::hash(self::source($product))) || self::metadata($product) !== $original_meta) throw new InvalidArgumentException('Product changed during translation operation: '.$product->get_id());
                $product->update_meta_data('meister_translations', $meta);
                if (!$product->save()) throw new RuntimeException('WooCommerce save failed: '.$product->get_id());
                $product->read_meta_data(true);
                if ($product->get_meta('meister_translations', true, 'edit') !== $meta) throw new RuntimeException('Translation persistence verification failed: '.$product->get_id());
            }
            return ['dry_run'=>!$options['apply'],'products'=>$results];
        } finally {
            foreach ($locks as $key) delete_option($key);
        }
    }
}
