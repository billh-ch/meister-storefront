<?php
/** Classic Woo product editor and bounded bulk review screen. */
final class MT_Admin {
    public static function menu(): void {
        add_submenu_page('woocommerce','Product translations','Product translations','manage_woocommerce','meister-translations',[self::class,'tools']);
    }
    public static function box(): void {
        add_meta_box('meister-translations','Product translations',[self::class,'editor'],'product','normal','default');
    }
    public static function editor(): void {
        try {
            $product = MT_Service::product((int)get_the_ID());
            $meta = MT_Service::metadata($product); $hash = MT_Core::hash(MT_Service::source($product));
            wp_nonce_field('meister_product_translations','mt_nonce');
            echo '<p>Original product fields are never changed. Save translations only after review; blank fields fall back to original content. If original fields change in this save, reopen the editor before updating translations.</p>';
            foreach (['en'=>'English','el'=>'Greek'] as $locale=>$label) {
                $entry = is_array($meta[$locale] ?? null) ? $meta[$locale] : [];
                echo '<fieldset style="border:1px solid #ccc;padding:12px;margin:12px 0"><legend>'.esc_html($label).'</legend>';
                if ($entry && ($entry['source_hash'] ?? '')!==$hash) echo '<p><strong>Source changed — stale translations are hidden from shoppers. Review every field before saving.</strong></p>';
                echo '<input type="hidden" name="mt['.$locale.'][source_hash]" value="'.esc_attr($hash).'">';
                echo '<p><label><input type="checkbox" name="mt['.$locale.'][save]" value="1"> Save/review this language (explicitly replaces this language only)</label></p>';
                echo '<p><label>Status <select name="mt['.$locale.'][status]">';
                foreach (['draft','published'] as $status) echo '<option value="'.$status.'"'.(($entry['status'] ?? 'draft')===$status ? ' selected' : '').'>'.$status.'</option>';
                echo '</select></label></p>';
                foreach (MT_Core::FIELDS as $field) {
                    $value = is_string($entry[$field] ?? null) ? $entry[$field] : '';
                    echo '<p><label>'.esc_html($field).'<br><textarea style="width:100%" rows="'.($field==='name' ? '2':'5').'" name="mt['.$locale.']['.$field.']">'.esc_textarea($value).'</textarea></label></p>';
                }
                echo '</fieldset>';
            }
        } catch (Throwable $e) { echo '<p>'.esc_html($e->getMessage()).'</p>'; }
    }
    public static function ids($text): array {
        if (!is_string($text) || strlen($text)>1000 || !preg_match('/^[1-9][0-9]*(?:\s*,\s*[1-9][0-9]*)*$/D',trim($text))) throw new InvalidArgumentException('Use comma-separated positive product IDs');
        $ids = array_map('intval',preg_split('/\s*,\s*/',trim($text)));
        if (count($ids)>MT_Core::MAX_ROWS || count(array_unique($ids))!==count($ids)) throw new InvalidArgumentException('Use 1..50 unique IDs');
        return $ids;
    }
    public static function request(): array {
        MT_Service::access();
        $nonce = $_POST['mt_tools_nonce'] ?? null;
        if (!is_string($nonce) || !wp_verify_nonce($nonce,'meister_translation_tools')) throw new InvalidArgumentException('Invalid bulk tools nonce');
        $operation = $_POST['mt_tool_action'] ?? '';
        $apply = ($_POST['mt_apply'] ?? '')==='1';
        if ($operation==='import') {
            $json = wp_unslash($_POST['mt_job'] ?? '');
            if (!is_string($json)) throw new InvalidArgumentException('Invalid JSON input');
            return MT_Service::import(MT_Core::decode($json), ['apply'=>$apply,'publish'=>($_POST['mt_publish'] ?? '')==='1','overwrite'=>($_POST['mt_overwrite'] ?? '')==='1']);
        }
        $ids = self::ids(wp_unslash($_POST['mt_ids'] ?? ''));
        $locale = MT_Core::locale($_POST['mt_locale'] ?? 'el');
        if ($operation==='export') return MT_Service::export($ids,$locale);
        if ($operation!=='generate') throw new InvalidArgumentException('Unknown operation');
        if ($apply && ($_POST['confirm_cost'] ?? '')!=='1') throw new InvalidArgumentException('Confirm provider usage/cost before generating');
        return MT_Generate::run($ids,$locale,$apply);
    }
    public static function tools(): void {
        try { MT_Service::access(); } catch (Throwable $e) { echo '<p>Access denied.</p>'; return; }
        echo '<div class="wrap"><h1>Product translations</h1><p>Export/import up to 50 products, Generate up to 3. All operations default to dry-run. Generation calls the configured server provider only with Apply and cost confirmation; drafts only, existing translations always skipped. No provider enrollment or secret fields here.</p>';
        if (isset($_POST['mt_tool_action'])) {
            try { $result = self::request(); echo '<h2>Result — copy/export JSON privately</h2><textarea readonly rows="18" style="width:100%">'.esc_textarea(wp_json_encode($result)).'</textarea>'; }
            catch (Throwable $e) { echo '<p role="alert">'.esc_html($e->getMessage()).'</p>'; }
        }
        echo '<form method="post">'; wp_nonce_field('meister_translation_tools','mt_tools_nonce');
        echo '<p><label>IDs <input name="mt_ids" placeholder="123,456,789"></label> <label>Language <select name="mt_locale"><option value="el">Greek</option><option value="en">English</option></select></label></p>';
        echo '<p><label>Import JSON (2 MiB maximum)<br><textarea name="mt_job" rows="12" style="width:100%"></textarea></label></p>';
        foreach (['mt_apply'=>'Apply (otherwise dry-run, no provider call)','mt_overwrite'=>'Overwrite existing language (import only)','mt_publish'=>'Publish reviewed translations (import only)','confirm_cost'=>'Confirm provider usage/cost (Generate only)'] as $key=>$label) echo '<p><label><input type="checkbox" name="'.$key.'" value="1">'.esc_html($label).'</label></p>';
        foreach (['export'=>'Export','import'=>'Import','generate'=>'Generate'] as $value=>$label) echo '<button class="button" name="mt_tool_action" value="'.$value.'">'.$label.'</button> ';
        echo '</form></div>';
    }
}
