<?php
/** Classic product editor box: groups, options, English/Greek names, prices. No JavaScript needed. */
final class MPA_Admin {
    const NONCE_ACTION = 'meister_product_addons';
    const NONCE_FIELD = 'mpa_nonce';
    const BLANK_OPTION_ROWS = 3;

    public static function box(): void {
        add_meta_box('meister-product-addons', 'Add-ons (paid extras)', [self::class, 'editor'], 'product', 'normal', 'default');
    }

    public static function editor($post = null): void {
        $id = (int)(is_object($post) && isset($post->ID) ? $post->ID : get_the_ID());
        $raw = get_post_meta($id, MPA_Core::META_KEY, true);
        $config = MPA_Core::parse($raw);
        wp_nonce_field(self::NONCE_ACTION, self::NONCE_FIELD);
        echo '<p>Optional extras the customer can add to this product, with any size or thickness. Prices are in euros <strong>including VAT</strong>, like product prices. ';
        echo '<em>Choose one</em> groups (e.g. camo pattern) let the customer pick at most one option; <em>any number</em> groups are checkboxes. ';
        echo 'Ids are created from the English name on first save and never change afterwards. Empty rows are ignored. Save to get more empty rows.</p>';
        if (is_string($raw) && $raw !== '' && $config === null) {
            echo '<div class="notice notice-error inline"><p><strong>The stored add-ons are invalid, so the shop shows none for this product.</strong> Saving this form replaces them.</p></div>';
        }
        $groups = $config['groups'] ?? [];
        $groups[] = ['id' => '', 'type' => 'multi', 'name' => ['en' => '', 'el' => ''], 'options' => []];
        foreach ($groups as $gi => $group) {
            $p = 'mpa[groups][' . $gi . ']';
            $isNew = $group['id'] === '';
            echo '<fieldset style="border:1px solid #c3c4c7;padding:8px 12px;margin:12px 0"><legend><strong>' . ($isNew ? 'New group' : 'Group: ' . esc_html($group['name']['en'])) . '</strong></legend>';
            echo '<input type="hidden" name="' . $p . '[id]" value="' . esc_attr($group['id']) . '">';
            if (!$isNew) echo '<p>Id: <code>' . esc_html($group['id']) . '</code> <label style="margin-left:16px"><input type="checkbox" name="' . $p . '[remove]" value="1"> Remove this group</label></p>';
            echo '<p><label>English name <input type="text" class="regular-text" name="' . $p . '[name_en]" value="' . esc_attr($group['name']['en']) . '"></label> ';
            echo '<label>Greek name <input type="text" class="regular-text" name="' . $p . '[name_el]" value="' . esc_attr($group['name']['el']) . '"></label> ';
            echo '<label>Type <select name="' . $p . '[type]">';
            foreach (['single' => 'Choose one (or none)', 'multi' => 'Any number'] as $value => $label) echo '<option value="' . $value . '"' . ($group['type'] === $value ? ' selected' : '') . '>' . esc_html($label) . '</option>';
            echo '</select></label></p>';
            echo '<table class="widefat striped" style="max-width:900px"><thead><tr><th>Id</th><th>English name</th><th>Greek name</th><th>Price € (incl. VAT)</th><th>Remove</th></tr></thead><tbody>';
            $options = $group['options'];
            for ($i = 0; $i < self::BLANK_OPTION_ROWS; $i++) $options[] = ['id' => '', 'name' => ['en' => '', 'el' => ''], 'price' => ''];
            foreach ($options as $oi => $option) {
                $o = $p . '[options][' . $oi . ']';
                echo '<tr><td>' . ($option['id'] !== '' ? '<code>' . esc_html($option['id']) . '</code>' : '<em>new</em>') . '<input type="hidden" name="' . $o . '[id]" value="' . esc_attr($option['id']) . '"></td>';
                echo '<td><input type="text" name="' . $o . '[name_en]" value="' . esc_attr($option['name']['en']) . '"></td>';
                echo '<td><input type="text" name="' . $o . '[name_el]" value="' . esc_attr($option['name']['el']) . '"></td>';
                echo '<td><input type="text" inputmode="decimal" size="9" name="' . $o . '[price]" value="' . esc_attr($option['price']) . '" placeholder="30.00"></td>';
                echo '<td>' . ($option['id'] !== '' ? '<input type="checkbox" name="' . $o . '[remove]" value="1" aria-label="Remove option">' : '') . '</td></tr>';
            }
            echo '</tbody></table></fieldset>';
        }
    }

    /**
     * Saves only with a valid nonce and edit rights on this product. Invalid
     * data is refused as a whole (the stored add-ons stay as they were) and
     * the reason is shown at the top of the next screen.
     */
    public static function save($post_id): void {
        $post_id = (int)$post_id;
        if (!isset($_POST[self::NONCE_FIELD]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST[self::NONCE_FIELD])), self::NONCE_ACTION)) return;
        if (!current_user_can('edit_product', $post_id)) return;
        $form = isset($_POST['mpa']) && is_array($_POST['mpa']) ? wp_unslash($_POST['mpa']) : [];
        $message = self::apply($post_id, $form);
        if ($message !== null) set_transient(self::notice_key(), $message, 120);
    }

    /** Returns null on success, or the error message. */
    public static function apply(int $post_id, array $form): ?string {
        try {
            $config = MPA_Core::from_form($form, static fn($name) => sanitize_title($name));
            if ($config === null) { delete_post_meta($post_id, MPA_Core::META_KEY); return null; }
            self::keep_ids($post_id, $config);
            update_post_meta($post_id, MPA_Core::META_KEY, wp_slash(MPA_Core::encode($config)));
            return null;
        } catch (InvalidArgumentException $e) {
            return 'Add-ons were NOT saved: ' . $e->getMessage();
        }
    }

    /** Existing ids come from hidden fields; refuse anything that would rename one. */
    private static function keep_ids(int $post_id, array $config): void {
        $before = MPA_Core::parse(get_post_meta($post_id, MPA_Core::META_KEY, true));
        if (!$before) return;
        $known = [];
        foreach ($before['groups'] as $g) { $known['g:' . $g['id']] = true; foreach ($g['options'] as $o) $known['o:' . $o['id']] = $g['id']; }
        foreach ($config['groups'] as $g) foreach ($g['options'] as $o) {
            if (isset($known['o:' . $o['id']]) && $known['o:' . $o['id']] !== $g['id']) throw new InvalidArgumentException("The option id \"{$o['id']}\" already belongs to another group.");
        }
    }

    public static function notices(): void {
        $message = get_transient(self::notice_key());
        if (!is_string($message) || $message === '') return;
        delete_transient(self::notice_key());
        echo '<div class="notice notice-error"><p><strong>' . esc_html($message) . '</strong></p></div>';
    }

    private static function notice_key(): string {
        return 'meister_addons_notice_' . (int)get_current_user_id();
    }
}
