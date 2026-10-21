<?php
/** WordPress and authenticated Woo REST integration. */
final class MT_WordPress {
    public static function rest_product($response, $product, $request) {
        $data = $response->get_data();
        $data['meta_data'] = array_values(array_filter($data['meta_data'] ?? [], static function($meta) {
            // Woo prepares WC_Meta_Data objects before REST serialization; retain their identity.
            $key = is_array($meta) ? ($meta['key'] ?? '') : (is_object($meta) ? ($meta->key ?? '') : '');
            return $key !== 'meister_translations';
        }));
        unset($data['meister_translation_source'], $data['meister_translations']);
        if (current_user_can('manage_woocommerce')) {
            $data['meister_translation_source'] = MT_Service::source($product);
            $data['meister_translations'] = $product->get_meta('meister_translations', true, 'edit');
        }
        $response->set_data($data);
        return $response;
    }
    public static function rest_write($product, $request) {
        if (is_wp_error($product)) return $product;
        $metas = $request->get_param('meta_data');
        foreach (is_array($metas) ? $metas : [] as $meta) {
            if (!is_array($meta)) continue;
            // Woo has already prepared (and may have renamed/deleted) in-memory metadata.
            // Resolve incoming IDs against persisted ownership/key, never that mutated view.
            $id = (int)($meta['id'] ?? 0);
            $stored = $id > 0 ? get_metadata_by_mid('post', $id) : false;
            if (($meta['key'] ?? '') === 'meister_translations' || ($stored && (int)$stored->post_id === (int)$product->get_id() && $stored->meta_key === 'meister_translations')) return new WP_Error('meister_read_only', 'Use the guarded translation editor/import endpoint', ['status'=>400]);
        }
        foreach (['meister_translation_source','meister_translations'] as $key) if ($request->get_param($key)!==null) return new WP_Error('meister_read_only','Translation REST fields are read-only',['status'=>400]);
        return $product;
    }
    public static function permission() {
        try { MT_Service::access(); return true; }
        catch (Throwable $e) { return new WP_Error('meister_forbidden','Product translation access denied',['status'=>403]); }
    }
    public static function routes(): void {
        foreach (['export','import','generate'] as $operation) register_rest_route('meister-translations/v1', '/'.$operation, [
            'methods'=>'POST', 'permission_callback'=>[self::class,'permission'],
            'callback'=>static function($request) use ($operation) { return self::endpoint($operation, $request); },
        ]);
    }
    public static function endpoint(string $operation, $request) {
        try {
            MT_Service::access();
            if (method_exists($request,'get_body') && strlen($request->get_body())>MT_Core::MAX_JOB) throw new InvalidArgumentException('Request exceeds 2 MiB');
            $data = $request->get_json_params();
            if (!is_array($data)) throw new InvalidArgumentException('JSON object required');
            $allowed = $operation==='import' ? ['job','apply','publish','overwrite'] : ['ids','locale','apply','confirm_cost'];
            if (array_diff(array_keys($data), $allowed)) throw new InvalidArgumentException('Unknown request fields');
            if ($operation==='export') return MT_Service::export($data['ids'] ?? [], $data['locale'] ?? 'el');
            if ($operation==='import') return MT_Service::import($data['job'] ?? [], array_intersect_key($data,array_flip(['apply','publish','overwrite'])));
            if ($operation!=='generate') throw new InvalidArgumentException('Unknown operation');
            $apply = $data['apply'] ?? false;
            if (!is_bool($apply) || (isset($data['confirm_cost']) && !is_bool($data['confirm_cost']))) throw new InvalidArgumentException('Generate flags must be boolean');
            if ($apply && ($data['confirm_cost'] ?? false)!==true) throw new InvalidArgumentException('Explicit confirm_cost:true required before calling paid provider');
            return MT_Generate::run($data['ids'] ?? [], $data['locale'] ?? 'el', $apply);
        } catch (InvalidArgumentException $e) { return new WP_Error('meister_invalid', $e->getMessage(), ['status'=>400]); }
        catch (Throwable $e) { return new WP_Error('meister_failed', 'Translation operation failed; inspect private server diagnostics', ['status'=>500]); }
    }
    public static function save_editor($id): void {
        if (empty($_POST['mt']) || !isset($_POST['mt_nonce']) || !is_string($_POST['mt_nonce']) || !wp_verify_nonce($_POST['mt_nonce'],'meister_product_translations')) return;
        try {
            MT_Service::access((int)$id);
            $entries = wp_unslash($_POST['mt']);
            if (!is_array($entries) || array_diff(array_keys($entries), ['en','el'])) throw new InvalidArgumentException('Invalid editor locale');
            foreach ($entries as $locale=>$entry) {
                if (!is_array($entry)) throw new InvalidArgumentException('Invalid editor entry');
                if (($entry['save'] ?? '')!=='1') continue;
                $status = $entry['status'] ?? 'draft';
                if (!in_array($status,['draft','published'],true)) throw new InvalidArgumentException('Invalid translation status');
                $texts = array_intersect_key($entry, array_flip(MT_Core::FIELDS));
                $row = ['id'=>(int)$id,'source_hash'=>$entry['source_hash'] ?? '', 'translation'=>$texts];
                MT_Service::import(['version'=>1,'locale'=>$locale,'products'=>[$row]], ['apply'=>true,'overwrite'=>true,'publish'=>$status==='published']);
            }
        } catch (Throwable $e) { WC_Admin_Meta_Boxes::add_error('Translation not saved: '.$e->getMessage()); }
    }
}
